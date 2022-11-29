#!/usr/bin/env python3

import argparse

import app


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--youtube", required=True)
    args = parser.parse_args()
    print(app.handler({"queryStringParameters": vars(args)}))


if __name__ == "__main__":
    main()
