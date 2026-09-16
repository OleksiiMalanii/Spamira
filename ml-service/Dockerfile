FROM python:3.14-slim AS build
WORKDIR /build/ml-service
COPY ml-service/requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY ml-service/training/ training/
COPY data/curated/ /build/data/curated/
RUN python -m training.download_data && python -m training.train

FROM python:3.14-slim
WORKDIR /app
COPY ml-service/requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock && useradd --create-home --uid 10001 spamira
COPY ml-service/app/ app/
COPY ml-service/training/ training/
COPY --from=build /build/ml-service/models/ models/
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER spamira
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:8000/health', timeout=3)" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
