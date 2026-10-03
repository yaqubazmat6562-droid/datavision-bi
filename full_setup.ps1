# ==========================================================
# DATAVISION BI - COMPLETE AUTO SETUP
# ==========================================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DATAVISION BI - Full Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan


# ==========================================================
# STEP 1: FOLDERS
# ==========================================================

Write-Host "[1/8] Creating folders..." -ForegroundColor Yellow

$folders = @("engines", "utils", "routes", "uploads", "cleaned",
             "static\js\modules", "static\js\utils", "static\css", "templates")

foreach ($folder in $folders) {
    New-Item -Path $folder -ItemType Directory -Force | Out-Null
}

Write-Host "  ✓ Folders ready" -ForegroundColor Green


# ==========================================================
# STEP 2: __init__.py FILES
# ==========================================================

Write-Host "[2/8] Creating __init__.py files..." -ForegroundColor Yellow

$initFiles = @(
    "engines\__init__.py",
    "utils\__init__.py",
    "routes\__init__.py"
)

foreach ($file in $initFiles) {
    New-Item -Path $file -ItemType File -Force | Out-Null
}

Write-Host "  ✓ __init__.py files created" -ForegroundColor Green


# ==========================================================
# STEP 3: .env FILE
# ==========================================================

Write-Host "[3/8] Creating .env..." -ForegroundColor Yellow

$envContent = @"
SECRET_KEY=datavision-super-secret-key-change-in-production-2026
DEBUG=True
UPLOAD_FOLDER=uploads
CLEANED_FOLDER=cleaned
MAX_CONTENT_LENGTH=16777216
ALLOWED_EXTENSIONS=xlsx,xls,csv
"@

Set-Content -Path ".env" -Value $envContent -Encoding UTF8

Write-Host "  ✓ .env created" -ForegroundColor Green


# ==========================================================
# STEP 4: config.py
# ==========================================================

Write-Host "[4/8] Creating config.py..." -ForegroundColor Yellow

$configContent = @'
# config.py
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    CLEANED_FOLDER = os.getenv("CLEANED_FOLDER", "cleaned")
    MAX_CONTENT_LENGTH = int(
        os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024)
    )

    ALLOWED_EXTENSIONS = set(
        os.getenv("ALLOWED_EXTENSIONS", "xlsx,xls,csv").split(",")
    )

    QUERY_SESSION_TIMEOUT = 3600
'@

Set-Content -Path "config.py" -Value $configContent -Encoding UTF8

Write-Host "  ✓ config.py created" -ForegroundColor Green


# ==========================================================
# STEP 5: utils/ FILES
# ==========================================================

Write-Host "[5/8] Creating utils files..." -ForegroundColor Yellow

# ---- utils/helpers.py ----
$helpersContent = @'
# utils/helpers.py
import os
import pandas as pd
from werkzeug.utils import secure_filename


def allowed_file(filename, allowed_extensions):
    """Check if file extension is allowed."""
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in allowed_extensions


def get_secure_filename(filename):
    """Return a secure filename."""
    return secure_filename(filename)


def load_file_dataframe(filepath):
    """Load Excel/CSV file into a pandas DataFrame."""
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
    """Return extension without dot."""
    return os.path.splitext(filename)[1].lower().lstrip(".")


def ensure_folder(folder_path):
    """Create folder if it doesn't exist."""
    os.makedirs(folder_path, exist_ok=True)
    return folder_path
'@

Set-Content -Path "utils\helpers.py" -Value $helpersContent -Encoding UTF8


# ---- utils/validators.py ----
$validatorsContent = @'
# utils/validators.py
import os


class ValidationError(Exception):
    """Custom validation error."""
    pass


def validate_filename(filename):
    """Validate uploaded filename."""
    if not filename or filename.strip() == "":
        raise ValidationError("Filename is empty.")

    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValidationError("Invalid filename.")

    return True


def validate_file_exists(filepath):
    """Check if file exists."""
    if not os.path.isfile(filepath):
        raise ValidationError(
            f"File not found: {os.path.basename(filepath)}"
        )
    return True


def validate_file_size(filepath, max_size_mb=16):
    """Validate file size."""
    size = os.path.getsize(filepath)
    if size > max_size_mb * 1024 * 1024:
        raise ValidationError(
            f"File exceeds {max_size_mb}MB limit."
        )
    return True
'@

Set-Content -Path "utils\validators.py" -Value $validatorsContent -Encoding UTF8


# ---- utils/formatters.py ----
$formattersContent = @'
# utils/formatters.py
import pandas as pd
import numpy as np


def safe_number(value):
    """Convert numpy/pandas values to JSON-safe numbers."""
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def safe_int(value):
    """Convert to JSON-safe integer."""
    num = safe_number(value)
    return int(num) if num is not None else None


def df_to_records(df):
    """Convert DataFrame to JSON-safe records."""
    if df is None or df.empty:
        return []

    df = df.copy()
    df = df.replace({np.nan: None})

    return df.to_dict(orient="records")
'@

Set-Content -Path "utils\formatters.py" -Value $formattersContent -Encoding UTF8

Write-Host "  ✓ utils files created" -ForegroundColor Green


# ==========================================================
# STEP 6: routes/ FILES
# ==========================================================

Write-Host "[6/8] Creating routes files..." -ForegroundColor Yellow

# ---- routes/__init__.py ----
$routesInit = @'
# routes/__init__.py
from .upload_routes import upload_bp
from .clean_routes import clean_bp
from .explorer_routes import explorer_bp
from .dashboard_routes import dashboard_bp
from .query_routes import query_bp


def register_blueprints(app):
    """Register all blueprints with the Flask app."""
    app.register_blueprint(upload_bp)
    app.register_blueprint(clean_bp)
    app.register_blueprint(explorer_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(query_bp)
'@

Set-Content -Path "routes\__init__.py" -Value $routesInit -Encoding UTF8


# ---- routes/upload_routes.py ----
$uploadRoutes = @'
# routes/upload_routes.py
import os
from flask import Blueprint, request, jsonify, current_app
import pandas as pd

from utils.helpers import (
    allowed_file,
    get_secure_filename,
    load_file_dataframe
)
from utils.validators import (
    validate_filename,
    validate_file_size,
    ValidationError
)

upload_bp = Blueprint("upload", __name__)


@upload_bp.route("/upload", methods=["POST"])
def upload_file():
    try:
        if "file" not in request.files:
            return jsonify({
                "success": False,
                "message": "No file selected."
            }), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({
                "success": False,
                "message": "Please select a file."
            }), 400

        validate_filename(file.filename)

        if not allowed_file(
            file.filename,
            current_app.config["ALLOWED_EXTENSIONS"]
        ):
            return jsonify({
                "success": False,
                "message": "Only Excel and CSV files are supported."
            }), 400

        filename = get_secure_filename(file.filename)
        filepath = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            filename
        )

        file.save(filepath)
        validate_file_size(filepath)

        df = load_file_dataframe(filepath)

        response = build_upload_response(df, filename, filepath)

        return jsonify(response)

    except ValidationError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        print("Upload Error:", str(e))
        return jsonify({
            "success": False,
            "message": f"Upload failed: {str(e)}"
        }), 500


def build_upload_response(df, filename, filepath):
    """Build the upload response payload."""
    extension = os.path.splitext(filename)[1].lower()

    if extension in [".xlsx", ".xls"]:
        sheets = pd.ExcelFile(filepath).sheet_names
    else:
        sheets = ["CSV"]

    missing_values = int(df.isnull().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    numeric_columns = list(
        df.select_dtypes(include=["number"]).columns
    )
    text_columns = list(
        df.select_dtypes(include=["object", "string"]).columns
    )

    date_columns = []
    for col in df.columns:
        try:
            converted = pd.to_datetime(df[col], errors="coerce")
            if len(df) > 0 and converted.notna().sum() >= len(df) * 0.70:
                date_columns.append(col)
        except Exception:
            pass

    preview_df = df.head(10).fillna("")
    preview = preview_df.to_dict(orient="records")

    return {
        "success": True,
        "message": "File uploaded successfully.",
        "filename": filename,
        "file_type": extension,
        "sheets": sheets,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "numeric_columns": numeric_columns,
        "date_columns": date_columns,
        "text_columns": text_columns,
        "preview": preview,
    }
'@

Set-Content -Path "routes\upload_routes.py" -Value $uploadRoutes -Encoding UTF8


# ---- routes/clean_routes.py ----
$cleanRoutes = @'
# routes/clean_routes.py
import os
from flask import Blueprint, request, jsonify, current_app

from engines.cleaner import clean_dataset
from utils.validators import validate_file_exists, ValidationError

clean_bp = Blueprint("clean", __name__)


@clean_bp.route("/clean", methods=["POST"])
def clean_uploaded_file():
    try:
        filename = request.form.get("filename")

        if not filename:
            return jsonify({
                "success": False,
                "message": "No filename provided."
            }), 400

        filepath = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            filename
        )
        validate_file_exists(filepath)

        cleaned_df, report = clean_dataset(filepath)

        report["preview"] = (
            cleaned_df.head(10)
            .fillna("")
            .to_dict(orient="records")
        )

        return jsonify({
            "success": True,
            "message": "Data cleaned successfully.",
            "report": report
        })

    except ValidationError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
'@

Set-Content -Path "routes\clean_routes.py" -Value $cleanRoutes -Encoding UTF8


# ---- routes/explorer_routes.py ----
$explorerRoutes = @'
# routes/explorer_routes.py
import os
from flask import Blueprint, request, jsonify, current_app

from engines.explorer import (
    get_dataset_overview,
    get_column_profile,
    get_unique_values,
    filter_data,
)
from utils.validators import validate_file_exists

explorer_bp = Blueprint("explorer", __name__)


def get_filepath(filename):
    filepath = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        filename
    )
    validate_file_exists(filepath)
    return filepath


@explorer_bp.route("/explorer/overview", methods=["POST"])
def explorer_overview():
    try:
        filename = request.form.get("filename")
        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename required."
            }), 400

        result = get_dataset_overview(get_filepath(filename))
        return jsonify({"success": True, "data": result})

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@explorer_bp.route("/explorer/profile", methods=["POST"])
def explorer_profile():
    try:
        filename = request.form.get("filename")
        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename required."
            }), 400

        result = get_column_profile(get_filepath(filename))
        return jsonify({"success": True, "profile": result})

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@explorer_bp.route("/explorer/unique", methods=["POST"])
def explorer_unique():
    try:
        filename = request.form.get("filename")
        column = request.form.get("column")

        if not filename or not column:
            return jsonify({
                "success": False,
                "message": "Filename and column required."
            }), 400

        result = get_unique_values(get_filepath(filename), column)
        return jsonify({"success": True, "values": result})

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@explorer_bp.route("/explorer/filter", methods=["POST"])
def explorer_filter():
    try:
        filename = request.form.get("filename")
        column = request.form.get("column")
        search = request.form.get("search")

        if not filename or not column:
            return jsonify({
                "success": False,
                "message": "Filename and column required."
            }), 400

        result = filter_data(
            get_filepath(filename),
            column,
            search
        )

        return jsonify({
            "success": True,
            "rows": result["rows"],
            "data": result["data"]
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
'@

Set-Content -Path "routes\explorer_routes.py" -Value $explorerRoutes -Encoding UTF8


# ---- routes/dashboard_routes.py ----
$dashboardRoutes = @'
# routes/dashboard_routes.py
import os
from flask import Blueprint, request, jsonify, current_app

from engines.dashboard_engine import (
    load_dashboard_data,
    detect_business_columns,
    build_dashboard,
    get_filter_options,
    build_filtered_dashboard,
)
from engines.summary_engine import generate_summary
from utils.validators import validate_file_exists

dashboard_bp = Blueprint("dashboard", __name__)


def get_filepath(filename):
    filepath = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        filename
    )
    validate_file_exists(filepath)
    return filepath


@dashboard_bp.route("/dashboard/build", methods=["POST"])
def build_dashboard_api():
    try:
        filename = request.form.get("filename")
        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename required."
            }), 400

        dashboard = build_dashboard(get_filepath(filename))
        return jsonify({
            "success": True,
            "dashboard": dashboard
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@dashboard_bp.route("/dashboard/filter-options", methods=["POST"])
def dashboard_filter_options():
    try:
        filename = request.form.get("filename")
        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename required."
            }), 400

        df = load_dashboard_data(get_filepath(filename))
        business = detect_business_columns(df)
        options = get_filter_options(df, business)

        return jsonify({
            "success": True,
            "options": options
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@dashboard_bp.route("/dashboard/filter", methods=["POST"])
def dashboard_filter():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({
                "success": False,
                "message": "No filter data."
            }), 400

        filename = data.get("filename")
        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename missing."
            }), 400

        filters = data.copy()
        filters.pop("filename", None)

        result = build_filtered_dashboard(
            get_filepath(filename),
            filters
        )

        return jsonify({
            "success": True,
            "dashboard": result
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@dashboard_bp.route("/dashboard/summary", methods=["POST"])
def dashboard_summary():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({
                "success": False,
                "message": "No request data."
            }), 400

        filename = data.get("filename")
        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename required."
            }), 400

        df = load_dashboard_data(get_filepath(filename))
        business = detect_business_columns(df)
        summary = generate_summary(df, business)

        return jsonify(summary)

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Summary failed: {str(e)}"
        }), 500
'@

Set-Content -Path "routes\dashboard_routes.py" -Value $dashboardRoutes -Encoding UTF8


# ---- routes/query_routes.py ----
$queryRoutes = @'
# routes/query_routes.py
import os
from flask import Blueprint, request, jsonify, current_app

from engines.dashboard_engine import load_dashboard_data
from engines.query_engine import QueryEngine
from utils.validators import validate_file_exists

query_bp = Blueprint("query", __name__)

query_sessions = {}


def get_engine(filename):
    engine = query_sessions.get(filename)
    if not engine:
        raise ValueError("Query session not found.")
    return engine


def build_engine_response(engine, message=None):
    response = {
        "success": True,
        "preview": engine.preview(),
        "columns": engine.get_columns(),
        "steps": engine.get_steps(),
    }
    if message:
        response["message"] = message
    return response


@query_bp.route("/query/start", methods=["POST"])
def query_start():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({
                "success": False,
                "message": "No data."
            }), 400

        filename = data.get("filename")
        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename required."
            }), 400

        filepath = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            filename
        )
        validate_file_exists(filepath)

        df = load_dashboard_data(filepath)
        engine = QueryEngine(df)
        query_sessions[filename] = engine

        response = build_engine_response(engine)
        response["message"] = "Query session started."
        return jsonify(response)

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@query_bp.route("/query/preview", methods=["POST"])
def query_preview():
    try:
        data = request.get_json(silent=True)
        filename = data.get("filename")
        engine = get_engine(filename)
        return jsonify(build_engine_response(engine))

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@query_bp.route("/query/remove-empty", methods=["POST"])
def query_remove_empty():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.remove_empty_rows()
        return jsonify(build_engine_response(engine))

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@query_bp.route("/query/remove-duplicates", methods=["POST"])
def query_remove_duplicates():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.remove_duplicates()
        return jsonify(build_engine_response(engine))

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@query_bp.route("/query/remove-columns", methods=["POST"])
def query_remove_columns():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.remove_columns(data.get("columns", []))
        return jsonify(build_engine_response(engine))

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@query_bp.route("/query/rename", methods=["POST"])
def query_rename_column():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.rename_column(
            data.get("old_name"),
            data.get("new_name")
        )
        return jsonify(build_engine_response(engine))

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@query_bp.route("/query/reset", methods=["POST"])
def query_reset():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.reset()
        return jsonify(
            build_engine_response(
                engine,
                "Query reset successfully."
            )
        )

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
'@

Set-Content -Path "routes\query_routes.py" -Value $queryRoutes -Encoding UTF8

Write-Host "  ✓ routes files created" -ForegroundColor Green


# ==========================================================
# STEP 7: NEW app.py
# ==========================================================

Write-Host "[7/8] Creating new app.py..." -ForegroundColor Yellow

# Backup old app.py
if (Test-Path "app.py") {
    Copy-Item "app.py" "app_backup.py" -Force
    Write-Host "  ✓ Backup saved as app_backup.py" -ForegroundColor DarkYellow
}

$appContent = @'
# app.py
from flask import Flask, render_template
from config import Config
from utils.helpers import ensure_folder
from routes import register_blueprints


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    ensure_folder(app.config["UPLOAD_FOLDER"])
    ensure_folder(app.config["CLEANED_FOLDER"])

    register_blueprints(app)

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.errorhandler(413)
    def too_large(e):
        return {
            "success": False,
            "message": "File is too large (max 16MB)."
        }, 413

    @app.errorhandler(500)
    def server_error(e):
        return {
            "success": False,
            "message": "Internal server error."
        }, 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(
        debug=app.config["DEBUG"],
        host="127.0.0.1",
        port=5000
    )
'@

Set-Content -Path "app.py" -Value $appContent -Encoding UTF8

Write-Host "  ✓ app.py replaced" -ForegroundColor Green


# ==========================================================
# STEP 8: VERIFY
# ==========================================================

Write-Host "[8/8] Verifying setup..." -ForegroundColor Yellow

$requiredFiles = @(
    "config.py",
    ".env",
    "app.py",
    "utils\__init__.py",
    "utils\helpers.py",
    "utils\validators.py",
    "utils\formatters.py",
    "routes\__init__.py",
    "routes\upload_routes.py",
    "routes\clean_routes.py",
    "routes\explorer_routes.py",
    "routes\dashboard_routes.py",
    "routes\query_routes.py",
    "engines\__init__.py"
)

$allGood = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file MISSING" -ForegroundColor Red
        $allGood = $false
    }
}

# Check engine files
Write-Host "`n  Engine files:" -ForegroundColor Cyan
$engineFiles = @("cleaner.py", "explorer.py", "dashboard_engine.py", "query_engine.py", "summary_engine.py")
foreach ($file in $engineFiles) {
    $path = "engines\$file"
    if (Test-Path $path) {
        Write-Host "  ✓ engines\$file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ engines\$file MISSING" -ForegroundColor Red
        $allGood = $false
    }
}


# ==========================================================
# DONE
# ==========================================================

Write-Host "`n========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
} else {
    Write-Host "  ⚠ SETUP INCOMPLETE - see missing files above" -ForegroundColor Yellow
}
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Ensure engine files exist in engines/ folder" -ForegroundColor White
Write-Host "  2. Run: python app.py" -ForegroundColor White
Write-Host ""