#!/usr/bin/env bash
set -ex
poetry export --without-hashes --output=requirements.txt
wget -nc https://www.johnvansickle.com/ffmpeg/releases/ffmpeg-5.1.1-amd64-static.tar.xz
docker build --platform=linux/amd64 --pull --cache-from=whisper:latest --tag=whisper:latest .
