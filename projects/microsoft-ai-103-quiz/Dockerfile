FROM python:3.11-slim

WORKDIR /app

# Copy application & data files
COPY server.py .
COPY data/ ./data/
COPY static/ ./static/
COPY output/ ./output/
COPY egitim-ozet/ ./egitim-ozet/

# Expose port 6321
EXPOSE 6321

ENV PORT=6321

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:6321/api/health')" || exit 1

CMD ["python", "server.py"]
