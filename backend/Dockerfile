FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies if needed (e.g. build tools for some python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install requirements
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . /app/

EXPOSE 8000

CMD ["python", "run.py"]
