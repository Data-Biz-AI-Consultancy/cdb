FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages using uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY pyproject.toml .
RUN uv pip install --system --no-cache .

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Default command runs FastAPI with Uvicorn
CMD ["uvicorn", "cdb.main:app", "--host", "0.0.0.0", "--port", "8000"]
