FROM public.ecr.aws/lambda/python:3.9

RUN yum install git --assumeyes

COPY requirements.txt .
RUN pip install -r requirements.txt --target .

ADD ffmpeg-5.1.1-amd64-static.tar.xz .
RUN mkdir /opt/bin && cp ffmpeg-5.1.1-amd64-static/ffmpeg /opt/bin/ffmpeg

# https://github.com/openai/whisper/blob/eff383b27b783e280c089475852ba83f20f64998/whisper/__init__.py#L23
ADD https://openaipublic.azureedge.net/main/whisper/models/9ecf779972d90ba49c06d968637d720dd632c55bbf19d441fb42bf17a411e794/small.pt /tmp/.cache/whisper/small.pt

COPY app.py .

# prevent transformers from writing to read-only parts of the Lambda filesystem
ENV XDG_CACHE_HOME=/tmp/.cache

CMD ["app.handler"]
