import contextlib
import json
import re
import sys
import tempfile
import time
from typing import Any, TypedDict, Union

import boto3
import whisper
import youtube_dl


class Event(TypedDict, total=False):
    queryStringParameters: dict[str, str]


class Context:
    aws_request_id: str


class Error(TypedDict):
    message: str


class ErrorResponse(TypedDict):
    error: Error


class Result(TypedDict):
    status: str


class ResultResponse(TypedDict):
    result: Result


Response = Union[ResultResponse, ErrorResponse]


def handler(event: Event, context: Context) -> Response:
    params = event.get("queryStringParameters")
    absent = {"session", "youtube"}

    def params_error() -> ErrorResponse:
        return {
            "error": {
                "message": f"missing query string parameter(s): {', '.join(absent)}"
            }
        }

    if params is None:
        return params_error()
    id = params.get("youtube")
    if id is not None:
        absent.remove("youtube")
    session = params.get("session")
    if session is not None:
        absent.remove("session")
    if absent:
        return params_error()
    assert id is not None and session is not None

    youtube_regex = r"^[\-0-9A-Z_a-z]{11}$"
    if not re.match(youtube_regex, id):
        return {
            "error": {"message": f"YouTube ID must match this regex: {youtube_regex}"}
        }

    session_regex = r"^[0-9a-f]{16}$"
    if not re.match(session_regex, session):
        return {
            "error": {"message": f"session ID must match this regex: {session_regex}"}
        }

    s3 = boto3.resource("s3")
    object_key = f"youtube/{id}/{session}/status.json"
    obj = s3.Object("whisper-web", object_key)

    def put(status: dict[str, Any]) -> None:
        obj.put(Body=json.dumps(status | {"awsRequestId": context.aws_request_id}))

    elapsed = 0
    filename = None

    def put_downloading(info: dict[str, Any]) -> None:
        put({"status": "downloading", "progress": info | {"elapsed": elapsed}})

    put_downloading({})

    def progress_hook(progress: dict[str, Any]) -> None:
        nonlocal elapsed
        nonlocal filename
        filename = progress["filename"]
        new_elapsed = progress.get("elapsed")
        if new_elapsed is not None and new_elapsed - elapsed > 0.5:  # seconds
            elapsed = new_elapsed
            put_downloading(
                {
                    "downloadedBytes": progress.get("downloaded_bytes"),
                    "totalBytes": progress.get("total_bytes"),
                    "totalBytesEstimate": progress.get("total_bytes_estimate"),
                    "secondsRemaining": progress.get("eta"),
                    "bytesPerSecond": progress.get("speed"),
                }
            )

    segments: list[str] = []
    last_put = time.monotonic()
    chunks = 0

    class Interceptor:
        def write(self, s: Any) -> Any:
            nonlocal segments
            nonlocal last_put
            nonlocal chunks
            sys.__stdout__.write(s)
            if s.startswith("["):
                segments.append(s)
                now = time.monotonic()
                if now - last_put > 0.5:  # seconds
                    s3.Object(
                        "whisper-web", f"youtube/{id}/{session}/{chunks}.json"
                    ).put(Body=json.dumps(segments))
                    segments = []
                    last_put = now
                    chunks += 1
                    put({"status": "transcribing", "chunks": chunks})

    with tempfile.TemporaryDirectory() as tmpdirname:
        with youtube_dl.YoutubeDL(
            {
                "cachedir": f"{tmpdirname}/.cache/youtube-dl",
                "format": "worstaudio",
                "outtmpl": f"{tmpdirname}/%(id)s.%(ext)s",
                "progress_hooks": [progress_hook],
            }
        ) as ydl:
            ydl.download([id])

        model = whisper.load_model("small", download_root="/tmp/.cache/whisper")

        interceptor: Any = Interceptor()
        with contextlib.redirect_stdout(interceptor):
            result = model.transcribe(filename, verbose=True)

    put({"status": "finished", "chunks": chunks})

    return {"result": result}
