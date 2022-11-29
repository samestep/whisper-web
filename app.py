from typing import Any, TypedDict


class Event(TypedDict, total=False):
    queryStringParameters: dict[str, str]


class Error(TypedDict):
    message: str


class ErrorResponse(TypedDict):
    error: Error


class ResultResponse(TypedDict):
    result: Any


Response = ResultResponse | ErrorResponse


def params_error() -> ErrorResponse:
    return {"error": {"message": "missing 'youtube' query string parameter"}}


def handler(event: Event, context: Any = None) -> Response:
    params = event.get("queryStringParameters")
    if params is None:
        return params_error()
    id = params.get("youtube")
    if id is None:
        return params_error()
    return {"result": id}
