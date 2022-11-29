#!/usr/bin/env bash
set -ex
isort . --check --diff
black .
flake8
mypy .
pytest
