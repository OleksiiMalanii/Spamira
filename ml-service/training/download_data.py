"""Download the public UCI SMS Spam Collection without extracting arbitrary paths."""
import hashlib
import io
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

URL = "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip"
EXPECTED_SHA256 = "7d039a24a6083ed9ef0f806ebad56bbb976e3aeb8de05669173bfdc4996c239d"
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


if __name__ == "__main__":
    main()
