FROM public.ecr.aws/lambda/python:3.9

RUN yum install git --assumeyes

COPY requirements.txt .
RUN pip install -r requirements.txt --target .

ADD ffmpeg-5.1.1-amd64-static.tar.xz .
RUN mkdir /opt/bin && cp ffmpeg-5.1.1-amd64-static/ffmpeg /opt/bin/ffmpeg

ADD https://openaipublic.azureedge.net/main/whisper/models/d3dd57d32accea0b295c96e26691aa14d8822fac7d9d27d5dc00b4ca2826dd03/tiny.en.pt .cache/whisper/tiny.en.pt

COPY app.py .

CMD ["app.handler"]
