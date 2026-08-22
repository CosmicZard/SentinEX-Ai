import sys
import os

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3
from fastapi.testclient import TestClient
from main import app
from database import init_db

def test_full_pipeline():
    init_db()
    conn = sqlite3.connect("sentinex.db")
    conn.execute("DELETE FROM cases WHERE case_number = 'SE-2026-TEST'")
    conn.commit()
    conn.close()
    client = TestClient(app)

    # 1. Health check
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["privacy_mode"] == "Zero-Trust Client-Side Processing"
    print("[PASS] Health Check Passed")

    # 2. Stats
    res = client.get("/cases/stats/summary")
    assert res.status_code == 200
    print("[PASS] Stats Summary Passed:", res.json())

    # 3. Create Case
    res = client.post("/cases/", json={
        "case_number": "SE-2026-TEST",
        "title": "Automated Test Case",
        "description": "Testing full privacy pipeline.",
        "risk_level": "Critical"
    })
    assert res.status_code == 200
    case_id = res.json()["id"]
    print(f"[PASS] Case Created (ID: {case_id})")

    # 4. Zero-Trust Reverse Search with pHash
    res = client.post("/search/fingerprint", json={
        "phash": "d9b23f8e4c1a7650",
        "threshold": 25,
        "case_id": case_id
    })
    assert res.status_code == 200
    search_data = res.json()
    assert search_data["matches_found"] > 0
    print(f"[PASS] Zero-Trust Search Passed: {search_data['matches_found']} matches found")

    # 5. Add Evidence (Zero Raw Upload)
    match_url = search_data["results"][0]["url"]
    match_domain = search_data["results"][0]["domain"]
    res = client.post(f"/cases/{case_id}/evidence", json={
        "case_id": case_id,
        "anonymized_phash": "d9b23f8e4c1a7650",
        "source_url": match_url,
        "domain": match_domain,
        "evidence_type": "image",
        "confidence": 0.98,
        "sha256_checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "notes": "Verified match preserved during test."
    })
    assert res.status_code == 200
    evidence_id = res.json()["id"]
    print(f"[PASS] Evidence Preserved in Vault (ID: {evidence_id})")

    # 6. Create Takedown Notice
    res = client.post("/takedowns/", json={
        "case_id": case_id,
        "evidence_id": evidence_id,
        "target_url": match_url,
        "hosting_provider": "Cloudflare / OVH",
        "provider_email": "abuse@cloudflare.com"
    })
    assert res.status_code == 200
    takedown_id = res.json()["id"]
    print(f"[PASS] Takedown Notice Created (ID: {takedown_id})")

    # 7. Update Takedown Status
    res = client.patch(f"/takedowns/{takedown_id}/status", json={"status": "Sent"})
    assert res.status_code == 200
    print(f"[PASS] Takedown Status Updated: Sent")

    # 8. Update Case Lifecycle Stage
    res = client.patch(f"/cases/{case_id}/status", json={"status": "Report Generated"})
    assert res.status_code == 200
    print(f"[PASS] Case Stage Advanced: Report Generated")

    # 9. Generate Legal IT Act PDF (ReportLab)
    res = client.post(f"/cases/{case_id}/generate-pdf?victim_alias=PROTECTED_TEST_VICTIM")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000
    print(f"[PASS] Official IT Act Complaint PDF Generated ({len(res.content)} bytes)")

    # 10. Clean up test case
    res = client.delete(f"/cases/{case_id}")
    assert res.status_code == 200
    print("[PASS] Test Case Cleaned Up")

    # 11. Alert Matrix Specification Endpoint
    res = client.get("/analysis/alert-matrix")
    assert res.status_code == 200
    assert len(res.json()["matrix"]) == 6
    print("[PASS] Alert Matrix Specification Endpoint Verified")

    # 12. Alert Matrix Multi-Model Rule Validation (All 6 Matrix Conditions)
    matrix_cases = [
        {"input": {"content_safety": "SFW", "is_manipulated": False, "ai_generated_prob": 10, "deepfake_risk": "Low"}, "expected": "Safe / Authentic"},
        {"input": {"content_safety": "SFW", "is_manipulated": True, "ai_generated_prob": 20, "deepfake_risk": "Low"}, "expected": "Edited / Manipulated"},
        {"input": {"content_safety": "SFW", "is_manipulated": False, "ai_generated_prob": 80, "deepfake_risk": "Low"}, "expected": "AI-Generated Content Detected"},
        {"input": {"content_safety": "SFW", "is_manipulated": False, "ai_generated_prob": 20, "deepfake_risk": "High"}, "expected": "Potential Deepfake Detected"},
        {"input": {"content_safety": "NSFW", "is_manipulated": False, "ai_generated_prob": 10, "deepfake_risk": "Low"}, "expected": "NSFW Warning"},
        {"input": {"content_safety": "NSFW", "is_manipulated": True, "ai_generated_prob": 85, "deepfake_risk": "Critical"}, "expected": "Critical / High Alert"},
    ]

    for idx, tc in enumerate(matrix_cases, 1):
        res = client.post("/analysis/evaluate", json=tc["input"])
        assert res.status_code == 200
        data = res.json()
        assert data["overall_verdict"] == tc["expected"], f"Case {idx} failed: got {data['overall_verdict']}, expected {tc['expected']}"
    print(f"[PASS] All 6 Alert Matrix Decision Pathways Verified Perfectly")

    # 13. Direct Image Analysis & Scan Endpoint Test
    test_img_path = "../test.jpg" if os.path.exists("../test.jpg") else "test.jpg"
    if os.path.exists(test_img_path):
        with open(test_img_path, "rb") as f:
            res = client.post("/analysis/scan", files={"file": ("test.jpg", f, "image/jpeg")})
        assert res.status_code == 200
        scan_data = res.json()
        assert "content_detection" in scan_data
        assert "phash" in scan_data
        print("[PASS] Standalone Image Scan Endpoint /analysis/scan Verified")

    # 14. Takedown Dynamic Statutory Notice Generator Test
    res = client.post("/takedowns/generate-notice?target_url=https://example-leak.net/image1.jpg")
    assert res.status_code == 200
    assert "IT Rules 2021" in res.json()["notice_text"] or "66E" in res.json()["notice_text"]
    print("[PASS] Statutory Takedown Notice Generator Verified")

    print("\n>>> ALL 14 PIPELINE, FORENSIC & SPECIFICATION TESTS PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    test_full_pipeline()


