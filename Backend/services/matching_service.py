import imagehash

def calculate_hamming_distance(hash1_str: str, hash2_str: str) -> int:
    """
    Calculates the Hamming distance between two perceptual hash strings.
    Lower distance values indicate higher visual similarity.
    """
    hash1 = imagehash.hex_to_hash(hash1_str)
    hash2 = imagehash.hex_to_hash(hash2_str)
    return hash1 - hash2

def evaluate_matches(target_hash_str: str, db_hashes: list[str], threshold: int = 25) -> int:
    """
    Compares a new pHash string against all existing database hashes.
    Returns the count of matches within the similarity threshold.
    """
    target_hash = imagehash.hex_to_hash(target_hash_str)
    match_count = 0

    for db_hash_str in db_hashes:
        if not db_hash_str:
            continue
        try:
            db_hash = imagehash.hex_to_hash(db_hash_str)
            distance = target_hash - db_hash
            
            if distance <= threshold:
                match_count += 1
        except Exception:
            continue

    return match_count