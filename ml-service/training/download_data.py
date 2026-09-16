"""Download the public UCI SMS Spam Collection without extracting arbitrary paths."""
import hashlib
import io
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

URL = "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip"
EXPECTED_SHA256 = "7d039a24a6083ed9ef0f806ebad56bbb976e3aeb8de05669173bfdc4996c239d"
MULTILINGUAL_URL = "https://huggingface.co/datasets/dbarbedillo/SMS_Spam_Multilingual_Collection_Dataset/resolve/4b5332a8771b3f6388f8ecc51c2b8ade4be31c73/data-augmented.csv"
MULTILINGUAL_SHA256 = "f90ca26ca52ca65acdb71c1d73bf1d1c3806bb12f9489ae3f0b6e4e64a76920f"
DESTINATION = Path(__file__).resolve().parents[2] / "data" / "raw"


def main():
    with urlopen(URL, timeout=60) as response:
        archive = response.read(2_000_000)
    with ZipFile(io.BytesIO(archive)) as bundle:
        dataset = bundle.read("SMSSpamCollection")
    if hashlib.sha256(dataset).hexdigest() != EXPECTED_SHA256:
        raise ValueError("Dataset checksum changed. Review the upstream dataset before training.")
    DESTINATION.mkdir(parents=True, exist_ok=True)
    (DESTINATION / "SMSSpamCollection").write_bytes(dataset)
    print(f"Dataset saved. SHA-256: {hashlib.sha256(dataset).hexdigest()}")
    multilingual = DESTINATION / "multilingual.csv"
    if not multilingual.exists() or hashlib.sha256(multilingual.read_bytes()).hexdigest() != MULTILINGUAL_SHA256:
        with urlopen(MULTILINGUAL_URL, timeout=120) as response:
            content = response.read(30_000_000)
        if hashlib.sha256(content).hexdigest() != MULTILINGUAL_SHA256:
            raise ValueError("Multilingual dataset checksum changed.")
        multilingual.write_bytes(content)
    print("English/Ukrainian parallel dataset verified.")


if __name__ == "__main__":
    main()
