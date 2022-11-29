FROM public.ecr.aws/lambda/python:3.9

COPY app.py .

CMD ["app.handler"]
