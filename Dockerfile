FROM public.ecr.aws/lambda/python:3.9

RUN yum install git --assumeyes

COPY requirements.txt .
RUN pip install -r requirements.txt --target .

ADD ffmpeg-5.1.1-amd64-static.tar.xz .
RUN mkdir /opt/bin && cp ffmpeg-5.1.1-amd64-static/ffmpeg /opt/bin/ffmpeg

# https://github.com/openai/whisper/blob/eff383b27b783e280c089475852ba83f20f64998/whisper/__init__.py#L25
ADD https://openaipublic.azureedge.net/main/whisper/models/345ae4da62f9b3d59415adc60127b97c714f32e89e936602e85993674d08dcb1/medium.pt /tmp/.cache/whisper/medium.pt

COPY app.py .

# prevent transformers from writing to read-only parts of the Lambda filesystem
ENV XDG_CACHE_HOME=/tmp/.cache

CMD ["app.handler"]
