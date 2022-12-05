# Contributing

## Prerequisites

Be sure you have these tools installed:

- [Docker][]
- [Git][]
- [Python][] 3.9.x
  - [Poetry][] 1.2.x
- [Node.js][]
  - [Yarn][] 1.x

## Setup

Once you've installed all prerequisites, [clone][] this repo, then open a
terminal in your clone of it. Next install dependencies from [npm][] and
[PyPI][]:

```sh
yarn
poetry install
```

## Site

Run this command to start a local development server:

```sh
yarn dev
```

## Script

Run this command to test the Lambda script locally, replacing `$YOUTUBE` with a
valid eleven-character YouTube video ID:

```sh
poetry run ./main.py --session $(xxd -l8 -p /dev/urandom) --youtube $YOUTUBE
```

## Image

Run this command to build the Docker image for the Lambda:

```sh
./build.sh
```

This will tag the image as `whisper:latest`. To manually push to the Lambda, run
these commands:

```sh
TAG=301860332740.dkr.ecr.us-east-2.amazonaws.com/whisper:latest
docker tag whisper:latest $TAG
docker push $TAG
```

Note that you will still need to manually update the Lambda to use this newly
uploaded Docker image; it will not automatically pick it up even though the tag
is the same.

[clone]: https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository
[docker]: https://docs.docker.com/get-docker/
[git]: https://git-scm.com/downloads
[node.js]: https://nodejs.org/en/download/
[npm]: https://www.npmjs.com/
[poetry]: https://python-poetry.org/docs/#installation
[pypi]: https://pypi.org/
[python]: https://www.python.org/downloads/
[yarn]: https://classic.yarnpkg.com/en/docs/install/
