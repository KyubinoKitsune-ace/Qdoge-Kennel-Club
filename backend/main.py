"""
Entrypoint for FastAPI.

Production:
  Run with uvicorn/gunicorn (see commands below)

Local dev:
  uvicorn main:app --reload --host 127.0.0.1 --port 8000
On VPS behind nginx:
  uvicorn main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1
  
  cd be
  pm2 start --name qdoge-backend "uvicorn main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1"
  pm2 save
"""

from app.main import app