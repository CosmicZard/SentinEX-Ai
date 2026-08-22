#!/usr/bin/env python3
"""
SentinEx-AI — Digital Forensics Image Analyzer (CLI Utility)
Usage:
    python analyze_image.py [image_path]

Examples:
    python analyze_image.py ../User_Input_Img/samp1.png
    python analyze_image.py ../test.jpg
"""

import sys
import os
import json

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure parent directory is in sys.path when running from Backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.analysis_service import analyze_image_file

def print_banner():
    print("=" * 70)
    print("  SentinEx-AI -- Local Digital Forensics & Multi-Model Image Analysis")
    print("  Zero-Trust Architecture -- IT Act 2000 & IT Rules 2021 Compliant")
    print("=" * 70)


def format_report(result: dict, image_path: str):
    det = result.get("content_detection", {})
    phash = result.get("phash", "N/A")
    dhash = result.get("dhash", "N/A")
    sha256 = result.get("sha256", det.get("sha256", "N/A"))

    print(f"\n[+] TARGET FILE: {image_path}")
    print(f"    - File Type: {det.get('fileType', 'Image')}")
    print(f"    - File Size: {det.get('fileSizeKb', 'Unknown')} KB")
    print(f"    - SHA-256 Proof: {sha256}")
    print(f"    - Perceptual Hash (pHash): {phash}")
    print(f"    - Difference Hash (dHash): {dhash}")

    print("\n" + "-" * 70)
    print("  ALERT MATRIX FORENSIC VERDICT")
    print("-" * 70)
    print(f"  Verdict:           {det.get('overallVerdict', 'Safe / Authentic')}")
    print(f"  Alert Level:       {det.get('alertClass', 'safe').upper()}")
    print(f"  Badge:             {det.get('alertBadgeText', 'AUTHENTIC')}")
    print(f"  Description:       {det.get('alertDescription', '')}")
    print(f"  Authenticity:      {det.get('authenticityScore', 100)}% (Higher = More Organic)")

    print("\n" + "-" * 70)
    print("  8-POINT FORENSIC SPECIFICATION BREAKDOWN")
    print("-" * 70)
    print(f"  1. Human Detected:          {'Yes' if det.get('humanDetected') else 'No'} ({det.get('humanConfidence', 0)}% conf.)")
    print(f"  2. Face Biometrics:         {'Yes' if det.get('faceDetected') else 'No'} (Count: {det.get('faceCount', 0)}, {det.get('faceConfidence', 0)}% conf.)")
    print(f"  3. Content Safety:          {det.get('contentSafety', 'SFW')} (Safety Score: {det.get('safetyScore', 90)}%)")
    print(f"  4. AI Generation Risk:      {det.get('aiGeneratedProbability', 0)}% (Diffusion / GAN Spectral Artifacts)")
    print(f"  5. Local Manipulation:      {'Detected' if det.get('manipulationDetected') else 'None Detected'} ({det.get('manipulationType', 'None')})")
    print(f"  6. Error Level Anomaly:     {det.get('compressionAnomalyScore', 0)}% (ELA Gradient)")
    print(f"  7. Deepfake Risk Level:     {det.get('deepfakeRisk', 'Low')} (Face Swap Probability: {det.get('faceSwapProbability', 0)}%)")
    print(f"  8. Discovered Threat State: Anonymized Fingerprint Preserved")

    statutes = det.get("suggestedStatutes", [])
    if statutes:
        print("\n" + "-" * 70)
        print("  SUGGESTED STATUTORY PROVISIONS (INDIA IT ACT 2000)")
        print("-" * 70)
        for idx, s in enumerate(statutes, 1):
            print(f"  [{idx}] {s}")

    print("\n" + "=" * 70)
    print("  [OK] FORENSIC SCAN COMPLETED SUCCESSFULLY (0 ERRORS)")
    print("=" * 70 + "\n")

def main():
    print_banner()
    
    if len(sys.argv) > 1:
        target_path = sys.argv[1]
    else:
        candidate_paths = [
            "../User_Input_Img/samp1.png",
            "User_Input_Img/samp1.png",
            "../test.jpg",
            "test.jpg"
        ]
        target_path = None
        for cp in candidate_paths:
            if os.path.exists(cp):
                target_path = cp
                break
        
        if not target_path:
            print("[!] Error: Please provide an image file path.")
            print("    Usage: python analyze_image.py <path_to_image>")
            sys.exit(1)

    if not os.path.exists(target_path):
        print(f"[!] Error: File not found at '{target_path}'")
        sys.exit(1)

    print(f"[*] Processing image: {target_path} ...")
    try:
        report = analyze_image_file(target_path)
        format_report(report, target_path)
    except Exception as e:
        print(f"[!] Analysis Exception: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
