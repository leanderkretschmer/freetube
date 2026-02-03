FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./app.py
COPY index.html ./index.html
COPY styles.css ./styles.css
COPY app.js ./app.js

EXPOSE 8000

CMD ["python", "app.py"]
