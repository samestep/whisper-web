import app


def test_handler() -> None:
    assert app.handler({}) == {
        "error": {"message": "missing 'youtube' query string parameter"}
    }
    assert app.handler({"queryStringParameters": {"foo": "bar"}}) == {
        "error": {"message": "missing 'youtube' query string parameter"}
    }
    assert app.handler({"queryStringParameters": {"youtube": "dQw4w9WgXcQ"}}) == {
        "result": "dQw4w9WgXcQ"
    }
