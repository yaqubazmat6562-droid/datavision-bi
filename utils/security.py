# utils/security.py
# Security utilities for DATAVISION BI

import os
import re

try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    print("[WARN] python-magic not available, using extension-based verification")

from werkzeug.utils import secure_filename
# ==========================================================
# ALLOWED MIME TYPES (for content verification)
# ==========================================================
ALLOWED_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",  # .xls
    "text/csv",
    "text/plain",  # some CSVs are detected as plain text
    "application/csv",
    "application/octet-stream",  # fallback
}


# ==========================================================
# FILE EXTENSION VALIDATION
# ==========================================================
def is_safe_filename(filename):
    """Check if filename is safe (no path traversal, etc.)."""
    if not filename or not isinstance(filename, str):
        return False

    # Remove any path components
    if "/" in filename or "\\" in filename or ".." in filename:
        return False

    # Only allow alphanumeric, spaces, dashes, underscores, dots
    if not re.match(r"^[\w\s\-\.]+$", filename):
        return False

    # Length check
    if len(filename) > 255:
        return False

    return True


# ==========================================================
# DEEP FILE CONTENT VERIFICATION
# ==========================================================
def verify_file_content(filepath):
    """
    Verify actual file content matches expected type.
    Falls back to extension check if python-magic unavailable.
    """
    # Fallback: extension check if magic unavailable
    if not MAGIC_AVAILABLE:
        ext = os.path.splitext(filepath)[1].lower()
        allowed_exts = {".xlsx", ".xls", ".csv"}
        return ext in allowed_exts, f"extension:{ext}"

    try:
        mime = magic.from_file(filepath, mime=True)
        is_valid = mime in ALLOWED_MIME_TYPES

        if not is_valid and mime.startswith("text/"):
            is_valid = True

        return is_valid, mime
    except Exception as e:
        print("File verification error:", e)
        # Fallback to extension check
        ext = os.path.splitext(filepath)[1].lower()
        allowed_exts = {".xlsx", ".xls", ".csv"}
        return ext in allowed_exts, f"fallback:{ext}"

# ==========================================================
# SECURE FILE SAVE
# ==========================================================
def safe_save_upload(file, upload_folder):
    """
    Safely save an uploaded file with extension check.
    Content verification is optional (fallback to extension).
    """
    if not file or not file.filename:
        return False, "No file provided", None

    if not is_safe_filename(file.filename):
        return False, "Invalid filename", None

    filename = secure_filename(file.filename)

    if not filename:
        return False, "Could not secure filename", None

    # Only allow known extensions
    ext = os.path.splitext(filename)[1].lower()
    if ext not in {".xlsx", ".xls", ".csv"}:
        return False, f"Invalid file extension: {ext}. Only .xlsx, .xls, .csv allowed.", None

    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    # Light content check (optional — never blocks)
    try:
        is_valid, mime = verify_file_content(filepath)
        if not is_valid:
            print(f"[WARN] File content check failed ({mime}) for {filename}, allowing anyway")
    except Exception as e:
        print(f"[WARN] Content check error: {e}")

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