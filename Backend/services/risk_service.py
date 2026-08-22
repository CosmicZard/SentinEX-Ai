def calculate_risk_level(confidence: float, match_count: int) -> str:
    """
    Evaluates threat severity: Low, Medium, High, or Critical.
    """
    if match_count >= 3 or confidence >= 0.90:
        return "Critical"
    elif match_count > 0 or confidence >= 0.70:
        return "High"
    elif confidence >= 0.40:
        return "Medium"
    return "Low"