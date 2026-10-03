# utils/validators.py
import os


class ValidationError(Exception):
    pass


def validate_filename(filename):
    if not filename or filename.strip() == "":
        raise ValidationError("Filename is empty.")
    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValidationError("Invalid filename.")
    return True


def validate_file_exists(filepath):
    if not os.path.isfile(filepath):
        raise ValidationError(f"File not found: {os.path.basename(filepath)}")
    return True


def validate_file_size(filepath, max_size_mb=16):
    size = os.path.getsize(filepath)
    if size > max_size_mb * 1024 * 1024:
        raise ValidationError(f"File exceeds {max_size_mb}MB limit.")
    return True
