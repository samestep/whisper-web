import json
from datetime import datetime, timedelta
from typing import Any, TypedDict, Union

import boto3
import youtube_dl
from botocore.exceptions import ClientError


class Event(TypedDict, total=False):
    queryStringParameters: dict[str, str]


class Error(TypedDict):
    message: str


class ErrorResponse(TypedDict):
    error: Error


class Result(TypedDict):
    status: str


class ResultResponse(TypedDict):
    result: Result


Response = Union[ResultResponse, ErrorResponse]


def params_error() -> ErrorResponse:
    return {"error": {"message": "missing 'youtube' query string parameter"}}


def handler(event: Event, context: Any = None) -> Response:
    params = event.get("queryStringParameters")
    if params is None:
        return params_error()
    id = params.get("youtube")
    if id is None:
        return params_error()

    s3 = boto3.resource("s3")
    object_key = f"youtube/{id}/status.json"
    obj = s3.Object("whisper-web", object_key)

    try:
        prior_body = obj.get()["Body"]
    except ClientError:
        prior_body = None

    if prior_body is not None:
        prior = json.loads(prior_body.read())
        diff = datetime.utcnow() - datetime.fromisoformat(prior["utc"])
        if prior["status"] == "finished" and diff < timedelta(
            hours=12  # the S3 bucket expires objects after 1 day
        ):
            return {"result": {"status": "finished"}}
        elif prior["status"] != "error" and diff < timedelta(
            minutes=20  # AWS Lambda has a 15 minute timeout
        ):
            return {"result": {"status": "pending"}}

    def put(status: dict[str, Any]) -> None:
        obj.put(Body=json.dumps(status | {"utc": datetime.utcnow().isoformat()}))

    def err(msg: str) -> ErrorResponse:
        put({"status": "error"})
        return {"error": {"message": msg}}

    try:
        elapsed = 0
        filename = None

        def put_downloading() -> None:
            put({"status": "downloading", "elapsed": elapsed})

        def progress_hook(progress: dict[str, Any]) -> None:
            nonlocal elapsed
            nonlocal filename
            filename = progress["filename"]
            new_elapsed = progress.get("elapsed")
            if new_elapsed is not None and new_elapsed - elapsed > 1:
                elapsed = new_elapsed
                put_downloading()

        with youtube_dl.YoutubeDL(
            {
                "format": "worstaudio",
                "outtmpl": "%(id)s.%(ext)s",
                "progress_hooks": [progress_hook],
            }
        ) as ydl:
            ydl.download([id])

        put({"status": "finished"})

        return {"result": {"status": "finished"}}
    except Exception as e:
        return err(str(e))
