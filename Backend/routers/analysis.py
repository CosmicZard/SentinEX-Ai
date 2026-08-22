from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List

router = APIRouter()

class AlertMatrixEvaluateRequest(BaseModel):
    content_safety: str = Field(default="SFW", description="SFW | Sensitive | NSFW")
    is_manipulated: bool = Field(default=False)
    ai_generated_prob: int = Field(default=15, ge=0, le=100)
    deepfake_risk: str = Field(default="Low", description="Low | Moderate | High | Critical")
    face_detected: Optional[bool] = True
    human_detected: Optional[bool] = True

class AlertMatrixResponse(BaseModel):
    overall_verdict: str
    alert_level: str
    badge_text: str
    description: str
    authenticity_score: int
    content_safety: str
    deepfake_risk: str
    ai_generated_probability: int
    manipulation_detected: bool

def evaluate_alert_matrix_logic(content_safety: str, is_manipulated: bool, ai_generated_prob: int, deepfake_risk: str) -> dict:
    is_nsfw = content_safety.upper() in ["NSFW", "SENSITIVE"]
    is_high_deepfake = deepfake_risk.capitalize() in ["High", "Critical"]
    is_ai_gen = ai_generated_prob >= 65

    deepfake_val = 85 if is_high_deepfake else 20
    manip_val = 75 if is_manipulated else 15
    risk_factor = (deepfake_val * 0.45) + (ai_generated_prob * 0.35) + (manip_val * 0.20)
    authenticity_score = max(5, min(98, round(100 - risk_factor)))

    if is_nsfw and is_high_deepfake:
        return {
            "overall_verdict": "Critical / High Alert",
            "alert_level": "critical",
            "badge_text": "CRITICAL: High Deepfake + NSFW Detected",
            "description": "Severe privacy violation: Synthetic face-swap / deepfake manipulation identified on non-consensual explicit media.",
            "authenticity_score": authenticity_score
        }

    if is_nsfw and not is_high_deepfake:
        return {
            "overall_verdict": "NSFW Warning",
            "alert_level": "warning",
            "badge_text": "WARNING: Sensitive / Explicit Media",
            "description": "Sensitive / adult visual features identified. No high-probability face swap / synthetic impersonation detected.",
            "authenticity_score": authenticity_score
        }

    if not is_nsfw and is_high_deepfake:
        return {
            "overall_verdict": "Potential Deepfake Detected",
            "alert_level": "high",
            "badge_text": "HIGH ALERT: Potential Deepfake / Face Swap",
            "description": "High-probability face swap or biometric synthesis detected on standard base imagery.",
            "authenticity_score": authenticity_score
        }

    if not is_nsfw and is_ai_gen:
        return {
            "overall_verdict": "AI-Generated Content Detected",
            "alert_level": "moderate",
            "badge_text": "MODERATE: AI-Generated Synthesis",
            "description": "High statistical probability of full generative AI synthesis (Diffusion / GAN model artifacts).",
            "authenticity_score": authenticity_score
        }

    if not is_nsfw and is_manipulated:
        return {
            "overall_verdict": "Edited / Manipulated",
            "alert_level": "moderate",
            "badge_text": "NOTICE: Localized Digital Manipulation",
            "description": "Localized pixel inconsistencies, splicing, or error level anomalies detected on SFW image.",
            "authenticity_score": authenticity_score
        }

    return {
        "overall_verdict": "Safe / Authentic",
        "alert_level": "safe",
        "badge_text": "AUTHENTIC: Clean Organic Media",
        "description": "Standard organic media. No synthetic manipulation, deepfake artifacts, or privacy policy violations detected.",
        "authenticity_score": authenticity_score
    }

@router.post("/evaluate", response_model=AlertMatrixResponse)
def evaluate_forensic_report(payload: AlertMatrixEvaluateRequest):
    res = evaluate_alert_matrix_logic(
        content_safety=payload.content_safety,
        is_manipulated=payload.is_manipulated,
        ai_generated_prob=payload.ai_generated_prob,
        deepfake_risk=payload.deepfake_risk
    )
    return {
        "overall_verdict": res["overall_verdict"],
        "alert_level": res["alert_level"],
        "badge_text": res["badge_text"],
        "description": res["description"],
        "authenticity_score": res["authenticity_score"],
        "content_safety": payload.content_safety,
        "deepfake_risk": payload.deepfake_risk,
        "ai_generated_probability": payload.ai_generated_prob,
        "manipulation_detected": payload.is_manipulated
    }

@router.get("/alert-matrix")
def get_alert_matrix_spec():
    return {
        "core_rule": "Content Safety and Authenticity/Manipulation Detection are independent pipelines. Manipulated or AI-generated content must not be classified as NSFW unless the content-safety model independently identifies NSFW content.",
        "matrix": [
            {"condition": "Normal + SFW", "verdict": "Safe / Authentic", "alert_level": "safe"},
            {"condition": "Manipulated + SFW", "verdict": "Edited / Manipulated", "alert_level": "moderate"},
            {"condition": "AI-generated + SFW", "verdict": "AI-Generated Content Detected", "alert_level": "moderate"},
            {"condition": "High deepfake + SFW", "verdict": "Potential Deepfake Detected", "alert_level": "high"},
            {"condition": "NSFW + no high deepfake", "verdict": "NSFW Warning", "alert_level": "warning"},
            {"condition": "NSFW + High Deepfake", "verdict": "Critical / High Alert", "alert_level": "critical"}
        ]
    }
