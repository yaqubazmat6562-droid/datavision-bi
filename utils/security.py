# utils/security.py
# Security utilities for DATAVISION BI

import os
import re
import magic
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
    Returns (is_valid, detected_mime).
    Falls back to extension check if python-magic unavailable.
    """
    if not MAGIC_AVAILABLE:
        # Fallback: check extension only
        ext = os.path.splitext(filepath)[1].lower()
        allowed_exts = {".xlsx", ".xls", ".csv"}
        is_valid = ext in allowed_exts
        return is_valid, f"extension:{ext}"

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
    Safely save an uploaded file with multiple validations.
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

    # 4. Ensure upload folder exists
    os.makedirs(upload_folder, exist_ok=True)

    # 5. Save file
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    # 6. Verify content type
    is_valid, mime = verify_file_content(filepath)

    if not is_valid:
        # Delete invalid file
        try:
            os.remove(filepath)
        except Exception:
            pass
        return False, f"Invalid file content ({mime})", None

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