# backend/tests/conftest.py
import sys
import os

# Add the project root (backend) to PYTHONPATH so that imports like
# `from app.main import app` work when pytest is invoked from the repository root.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
