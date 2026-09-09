import re
import unicodedata


def normalize_text(text: str) -> str:
    """Preserve punctuation and numbers while normalizing case and spacing."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text)).strip().lower()
