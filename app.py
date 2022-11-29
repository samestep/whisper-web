from typing import Any, TypedDict


class Event(TypedDict):
    queryStringParameters: dict[str, str]


def handler(event: Event, context: Any = None) -> Any:
    params = event["queryStringParameters"]
    id = params.get("youtube")
    if id is None:
        return {"error": {"message": "missing 'youtube' query string parameter"}}
    return {"result": id}
