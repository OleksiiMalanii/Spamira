import os
from pathlib import Path

MODEL_DIR = Path(os.getenv("MODEL_DIR", str(Path(__file__).resolve().parents[1] / "models")))
MAX_MESSAGE_LENGTH = 5000
