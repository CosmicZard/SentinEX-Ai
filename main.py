import sys
import os
import importlib.util

# Add Backend folder to sys.path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Load the FastAPI app from Backend/main.py
backend_main_file = os.path.join(backend_path, "main.py")
spec = importlib.util.spec_from_file_location("backend_main", backend_main_file)
backend_main = importlib.util.module_from_spec(spec)
sys.modules["backend_main"] = backend_main
spec.loader.exec_module(backend_main)

app = backend_main.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
