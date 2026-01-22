FROM python:3.10-slim

# Install Node.js 18
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Node.js signer and install dependencies
COPY usdcx-bridge/package*.json usdcx-bridge/
RUN cd usdcx-bridge && npm install

# Copy rest of application
COPY . .

# Expose port (Railway sets PORT env var)
EXPOSE 8000

# Start command - use shell form for variable expansion
CMD ["sh", "-c", "uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
