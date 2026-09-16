import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from app.classifier import Classifier
from app.config import MODEL_DIR
from app.schemas import PredictRequest, PredictResponse

logger = logging.getLogger("spamira.ml")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.classifier = None
    try:
        app.state.classifier = Classifier(MODEL_DIR)
    except Exception:
        logger.exception("Model could not be loaded. Run the training command before starting the service.")
    yield


app = FastAPI(title="Spamira ML Service", version="1.0.0", lifespan=lifespan)


def get_classifier(request: Request) -> Classifier:
    classifier = request.app.state.classifier
    if classifier is None:
        raise HTTPException(503, "The classification model is unavailable.")
    return classifier


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    logger.error("Prediction service error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "The service could not complete this request."})


@app.get("/health")
def health(request: Request):
    classifier = get_classifier(request)
    return {"status": "healthy", "modelVersion": classifier.metrics["modelVersion"]}


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest, request: Request):
    try:
        return get_classifier(request).predict(payload.text)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error


@app.get("/metrics")
def metrics(request: Request):
    return get_classifier(request).metrics
