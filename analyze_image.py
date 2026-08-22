#!/usr/bin/env python3
"""
SentinEx-AI — Digital Forensics Image Analyzer (Root CLI Launcher)
Usage:
    python analyze_image.py [image_path]

Examples:
    python analyze_image.py User_Input_Img/samp1.png
    python analyze_image.py User_Input_Img/samp2.png
    python analyze_image.py test.jpg
"""

import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

# Add Backend folder to path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from analyze_image import main

if __name__ == "__main__":
    main()

