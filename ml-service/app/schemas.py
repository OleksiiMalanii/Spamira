from pydantic import BaseModel, Field, field_validator
from typing import Literal
from app.config import MAX_MESSAGE_LENGTH


class PredictRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)

    @field_validator("text")
    @classmethod
    def reject_blank(cls, text):
        if not text.strip():
            raise ValueError("Please enter a message.")
        return text


class PredictResponse(BaseModel):
    label: Literal["spam", "legitimate"]
    confidence: float = Field(ge=0, le=1)
    spam_probability: float = Field(ge=0, le=1)
    legitimate_probability: float = Field(ge=0, le=1)
    model_version: str
