from PIL import Image
import imagehash

def compute_perceptual_hash(file_path: str) -> str:
    """
    Opens an image from disk and computes its perceptual hash (pHash).
    Returns the hash as a hexadecimal string.
    """
    img = Image.open(file_path)
    phash = imagehash.phash(img)
    return str(phash)