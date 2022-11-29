FROM public.ecr.aws/lambda/python:3.9

COPY requirements.txt .
RUN pip install -r requirements.txt --target .

COPY app.py .

CMD ["app.handler"]
