import uuid
import os

def save_uploaded_file_bytes(content: bytes, original_filename: str, upload_dir: str = "uploads") -> tuple[str, str]:
    """
    Saves binary image content to disk under a safe UUID filename.
    Returns a tuple of (unique_filename, relative_file_path).
    """
    os.makedirs(upload_dir, exist_ok=True)
    file_extension = original_filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    return unique_filename, file_path