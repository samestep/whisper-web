#!/usr/bin/env python3

import argparse
import json
import uuid

import app


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session", required=True)
    parser.add_argument("--youtube", required=True)
    args = parser.parse_args()

    context = app.Context()
    context.aws_request_id = str(uuid.uuid4())
    print(json.dumps(app.handler({"queryStringParameters": vars(args)}, context)))


if __name__ == "__main__":
    main()
