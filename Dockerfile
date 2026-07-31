# Generic Dockerfile for ListaDellaSpesa
# - Copies the repository into the image
# - Installs Python requirements if requirements.txt is present
# - Defaults to serving static files with python -m http.server on port 8080
# Edit the CMD if your project needs to run a specific server (Flask, Node, etc.).

FROM python:3.11-slim

WORKDIR /app

# Avoid buffering output
ENV PYTHONUNBUFFERED=1

# Copy project files
COPY . /app

# Install Python deps if present
RUN if [ -f requirements.txt ]; then \
      pip install --no-cache-dir -r requirements.txt; \
    fi

EXPOSE 8080

# Start command fallback logic:
# - If app.py or main.py exists, run it with python
# - Otherwise serve the repository as static files on port 8080
CMD ["bash", "-lc", "if [ -f app.py ]; then python app.py; elif [ -f main.py ]; then python main.py; else python -m http.server 8080; fi"]
