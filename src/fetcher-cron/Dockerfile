FROM python:3.12.13-slim-trixie

WORKDIR /app

RUN pip install requests

COPY fetcher.py .

CMD ["python", "-u", "fetcher.py"] 