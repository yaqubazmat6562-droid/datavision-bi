# utils/helpers.py
import os
import pandas as pd
from werkzeug.utils import secure_filename


def allowed_file(filename, allowed_extensions):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in allowed_extensions


def get_secure_filename(filename):
    return secure_filename(filename)


def load_file_dataframe(filepath):
    extension = os.path.splitext(filepath)[1].lower()
    if extension in [".xlsx", ".xls"]:
        excel = pd.ExcelFile(filepath)
        sheet_name = excel.sheet_names[0]
        df = pd.read_excel(filepath, sheet_name=sheet_name)
    elif extension == ".csv":
        try:
            df = pd.read_csv(filepath)
        except UnicodeDecodeError:
            df = pd.read_csv(filepath, encoding="latin-1")
    else:
        raise ValueError(f"Unsupported file format: {extension}")
    return df


def get_file_extension(filename):
    return os.path.splitext(filename)[1].lower().lstrip(".")


def ensure_folder(folder_path):
    os.makedirs(folder_path, exist_ok=True)
    return folder_path
