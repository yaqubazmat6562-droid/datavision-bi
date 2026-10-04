# utils/security.py
# Security utilities for DATAVISION BI
# Simplified version — NO python-magic dependency
# Works reliably on Render, Heroku, PythonAnywhere, and local

import os
import re
from werkzeug.utils import secure_filename


# ==========================================================
# ALLOWED EXTENSIONS
# ==========================================================
ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}


# ==========================================================
# FILENAME VALIDATION
# ==========================================================
def is_safe_filename(filename):
    """Check if filename is safe (no path traversal, special chars)."""
    if not filename or not isinstance(filename, str):
        return False

    # No path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        return False

    # Only alphanumeric, spaces, dashes, underscores, dots
    if not re.match(r"^[\w\s\-\.]+$", filename):
        return False

    # Length check
    if len(filename) > 255:
        return False

    return True


# ==========================================================
# FILE CONTENT VERIFICATION (extension only)
# ==========================================================
def verify_file_content(filepath):
    """
    Simple file content check based on extension.
    Never uses python-magic (which fails on some platforms).
    Returns (is_valid, detected_info).
    """
    ext = os.path.splitext(filepath)[1].lower()
    return ext in ALLOWED_EXTENSIONS, f"extension:{ext}"


# ==========================================================
# SECURE FILE SAVE
# ==========================================================
def safe_save_upload(file, upload_folder):
    """
    Safely save an uploaded file with extension check only.
    Returns (success, filepath_or_error, filename).
    """
    # 1. Check filename exists
    if not file or not file.filename:
        return False, "No file provided", None

    # 2. Validate filename
    if not is_safe_filename(file.filename):
        return False, "Invalid filename", None

    # 3. Secure the filename
    filename = secure_filename(file.filename)
    if not filename:
        return False, "Could not secure filename", None

    # 4. Check extension
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file extension: {ext}. Only .xlsx, .xls, .csv allowed.", None

    # 5. Ensure upload folder exists
    os.makedirs(upload_folder, exist_ok=True)

    # 6. Save file
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    # 7. Verify file exists and is not empty
    if not os.path.exists(filepath):
        return False, "File save failed", None

    if os.path.getsize(filepath) == 0:
        try:
            os.remove(filepath)
        except Exception:
            pass
        return False, "File is empty", None

    return True, filepath, filename


# ==========================================================
# INPUT SANITIZATION
# ==========================================================
def sanitize_string(text, max_length=500):
    """Sanitize user input string."""
    if not isinstance(text, str):
        return ""

    # Limit length
    text = text[:max_length]

    # Remove null bytes and control characters
    text = "".join(c for c in text if c.isprintable() or c in "\n\r\t")

    return text.strip()


def sanitize_column_name(name):
    """Sanitize a column name for query operations."""
    if not isinstance(name, str):
        return ""

    # Only alphanumeric, spaces, underscores, dashes
    name = re.sub(r"[^\w\s\-\.]", "", name)

    return name[:100].strip()