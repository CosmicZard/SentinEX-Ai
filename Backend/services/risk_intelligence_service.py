def get_statutory_violations(is_sensitive: bool, is_deepfake: bool) -> list[str]:
    """
    Returns legal clauses under the IT Act 2000 based on detection findings.
    """
    violations = []
    if is_sensitive:
        violations.append("IT Act Sec 66E - Violation of Privacy")
        violations.append("IT Act Sec 67A - Publishing sexually explicit material")
    if is_deepfake:
        violations.append("IT Act Sec 66D - Cheating by personation using computer resource")
    return violations