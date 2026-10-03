from flask import Flask, render_template, request, jsonify
import pandas as pd
import os

# ==========================================================
# DATAVISION BI
# MAIN FLASK APPLICATION
# PHASE 1 - UPLOAD
# PHASE 2 - CLEANING
# PHASE 3 - DATA EXPLORER
# PHASE 4 - AUTOMATIC DASHBOARD
# PHASE 5 - QUERY ENGINE + BUSINESS SUMMARY
# ==========================================================


# ==========================================================
# IMPORT ENGINES
# ==========================================================

from summary_engine import generate_summary

from engine.cleaner import clean_dataset

from engine.explorer import (
    get_dataset_overview,
    get_column_profile,
    get_unique_values,
    filter_data
)

from engine.dashboard_engine import (
    load_dashboard_data,
    detect_business_columns,
    build_dashboard,
    get_filter_options,
    build_filtered_dashboard
)

# Query Engine
from engine.query_engine import QueryEngine


# ==========================================================
# FLASK APP
# ==========================================================

app = Flask(__name__)


# ==========================================================
# UPLOAD FOLDER
# ==========================================================

UPLOAD_FOLDER = "uploads"

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ==========================================================
# QUERY ENGINE STORAGE
# ==========================================================

query_sessions = {}


# ==========================================================
# HELPER - LOAD DATASET
# ==========================================================

def load_file_dataframe(filepath):

    extension = os.path.splitext(
        filepath
    )[1].lower()

    if extension in [".xlsx", ".xls"]:

        excel = pd.ExcelFile(filepath)

        sheet_name = excel.sheet_names[0]

        df = pd.read_excel(
            filepath,
            sheet_name=sheet_name
        )

    elif extension == ".csv":

        df = pd.read_csv(filepath)

    else:

        raise ValueError(
            "Unsupported file format."
        )

    return df


# ==========================================================
# HOME PAGE
# ==========================================================

@app.route("/")
def index():

    return render_template(
        "index.html"
    )


# ==========================================================
# PHASE 1
# FILE UPLOAD
# ==========================================================

@app.route(
    "/upload",
    methods=["POST"]
)
def upload_file():

    try:

        if "file" not in request.files:

            return jsonify({
                "success": False,
                "message": "No file selected."
            })


        file = request.files["file"]


        if file.filename == "":

            return jsonify({
                "success": False,
                "message": "Please select a file."
            })


        # --------------------------------------------------
        # SUPPORTED FILES
        # --------------------------------------------------

        allowed_extensions = [
            ".xlsx",
            ".xls",
            ".csv"
        ]

        extension = os.path.splitext(
            file.filename
        )[1].lower()


        if extension not in allowed_extensions:

            return jsonify({
                "success": False,
                "message":
                    "Only Excel and CSV files are supported."
            })


        # --------------------------------------------------
        # SAVE FILE
        # --------------------------------------------------

        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            file.filename
        )

        file.save(filepath)


        # --------------------------------------------------
        # LOAD DATA
        # --------------------------------------------------

        df = load_file_dataframe(
            filepath
        )


        # --------------------------------------------------
        # BASIC INFORMATION
        # --------------------------------------------------

        rows = len(df)

        columns = len(df.columns)

        column_names = list(
            df.columns
        )


        # --------------------------------------------------
        # DATA PREVIEW
        # --------------------------------------------------

        preview_df = df.head(10)

        preview = (
            preview_df
            .fillna("")
            .to_dict(
                orient="records"
            )
        )


        # --------------------------------------------------
        # MISSING VALUES
        # --------------------------------------------------

        missing_values = int(
            df.isnull()
            .sum()
            .sum()
        )


        # --------------------------------------------------
        # DUPLICATE ROWS
        # --------------------------------------------------

        duplicate_rows = int(
            df.duplicated()
            .sum()
        )


        # --------------------------------------------------
        # NUMERIC COLUMNS
        # --------------------------------------------------

        numeric_columns = list(
            df.select_dtypes(
                include=["number"]
            ).columns
        )


        # --------------------------------------------------
        # DATE COLUMNS
        # --------------------------------------------------

        date_columns = []

        for column in df.columns:

            converted = pd.to_datetime(
                df[column],
                errors="coerce"
            )

            if (
                converted.notna().sum()
                >= len(df) * 0.70
                and len(df) > 0
            ):

                date_columns.append(
                    column
                )


        # --------------------------------------------------
        # TEXT COLUMNS
        # --------------------------------------------------

        text_columns = list(
            df.select_dtypes(
                include=["object", "string"]
            ).columns
        )


        # --------------------------------------------------
        # RESPONSE
        # --------------------------------------------------

        return jsonify({

            "success": True,

            "message":
                "File uploaded successfully.",

            "filename":
                file.filename,

            "file_type":
                extension,

            "sheets":
                (
                    pd.ExcelFile(filepath).sheet_names
                    if extension in [".xlsx", ".xls"]
                    else ["CSV"]
                ),

            "rows":
                rows,

            "columns":
                columns,

            "column_names":
                column_names,

            "missing_values":
                missing_values,

            "duplicate_rows":
                duplicate_rows,

            "numeric_columns":
                numeric_columns,

            "date_columns":
                date_columns,

            "text_columns":
                text_columns,

            "preview":
                preview

        })


    except Exception as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        })


# ==========================================================
# PHASE 2
# CLEAN DATA API
# ==========================================================

@app.route(
    "/clean",
    methods=["POST"]
)
def clean_uploaded_file():

    try:

        filename = request.form.get(
            "filename"
        )


        if not filename:

            return jsonify({

                "success": False,

                "message":
                    "No filename provided."

            })


        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )


        if not os.path.exists(filepath):

            return jsonify({

                "success": False,

                "message":
                    "Uploaded file not found."

            })


        # --------------------------------------------------
        # CLEAN DATA
        # --------------------------------------------------

        cleaned_df, report = clean_dataset(
            filepath
        )


        # --------------------------------------------------
        # PREVIEW
        # --------------------------------------------------

        report["preview"] = (
            cleaned_df
            .head(10)
            .fillna("")
            .to_dict(
                orient="records"
            )
        )


        return jsonify({

            "success": True,

            "message":
                "Data cleaned successfully.",

            "report":
                report

        })


    except Exception as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        })


# ==========================================================
# PHASE 3
# DATA EXPLORER - OVERVIEW
# ==========================================================

@app.route(
    "/explorer/overview",
    methods=["POST"]
)
def explorer_overview():

    try:

        filename = request.form.get(
            "filename"
        )


        if not filename:

            return jsonify({

                "success": False,

                "message":
                    "Filename is required."

            })


        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )


        if not os.path.exists(filepath):

            return jsonify({

                "success": False,

                "message":
                    "File not found."

            })


        result = get_dataset_overview(
            filepath
        )


        return jsonify({

            "success": True,

            "data":
                result

        })


    except Exception as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        })


# ==========================================================
# PHASE 3
# COLUMN PROFILE
# ==========================================================

@app.route(
    "/explorer/profile",
    methods=["POST"]
)
def explorer_profile():

    try:

        filename = request.form.get(
            "filename"
        )


        if not filename:

            return jsonify({

                "success": False,

                "message":
                    "Filename is required."

            })


        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )


        if not os.path.exists(filepath):

            return jsonify({

                "success": False,

                "message":
                    "File not found."

            })


        result = get_column_profile(
            filepath
        )


        return jsonify({

            "success": True,

            "profile":
                result

        })


    except Exception as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        })


# ==========================================================
# PHASE 3
# UNIQUE VALUES
# ==========================================================

@app.route(
    "/explorer/unique",
    methods=["POST"]
)
def explorer_unique():

    try:

        filename = request.form.get(
            "filename"
        )

        column = request.form.get(
            "column"
        )


        if not filename or not column:

            return jsonify({

                "success": False,

                "message":
                    "Filename and column are required."

            })


        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )


        if not os.path.exists(filepath):

            return jsonify({

                "success": False,

                "message":
                    "File not found."

            })


        result = get_unique_values(
            filepath,
            column
        )


        return jsonify({

            "success": True,

            "values":
                result

        })


    except Exception as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        })


# ==========================================================
# PHASE 3
# SEARCH / FILTER
# ==========================================================

@app.route(
    "/explorer/filter",
    methods=["POST"]
)
def explorer_filter():

    try:

        filename = request.form.get(
            "filename"
        )

        column = request.form.get(
            "column"
        )

        search = request.form.get(
            "search"
        )


        if not filename or not column:

            return jsonify({

                "success": False,

                "message":
                    "Filename and column are required."

            })


        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )


        if not os.path.exists(filepath):

            return jsonify({

                "success": False,

                "message":
                    "File not found."

            })


        result = filter_data(
            filepath,
            column,
            search
        )


        return jsonify({

            "success": True,

            "rows":
                result["rows"],

            "data":
                result["data"]

        })


    except Exception as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        })


# ==========================================================
# PHASE 4
# AUTOMATIC DASHBOARD
# ==========================================================

@app.route(
    "/dashboard/build",
    methods=["POST"]
)
def build_dashboard_api():

    try:

        filename = request.form.get(
            "filename"
        )


        if not filename:

            return jsonify({

                "success": False,

                "message":
                    "Filename is required."

            })


        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )


        if not os.path.exists(filepath):

            return jsonify({

                "success": False,

                "message":
                    "File not found."

            })


        dashboard = build_dashboard(
            filepath
        )


        return jsonify({

            "success": True,

            "dashboard":
                dashboard

        })


    except Exception as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        })


# ==========================================================
# DASHBOARD FILTER OPTIONS
# ==========================================================

@app.route(
    "/dashboard/filter-options",
    methods=["POST"]
)
def dashboard_filter_options():

    try:

        filename = request.form.get(
            "filename"
        )


        if not filename:

            return jsonify({

                "success": False,

                "message":
                    "Filename is required."

            })


        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )


        if not os.path.exists(filepath):

            return jsonify({

                "success": False,

                "message":
                    "File not found."

            })


        # IMPORTANT:
        # Excel + CSV دونوں support

        df = load_file_dataframe(
            filepath
        )


        business = detect_business_columns(
            df
        )


        options = get_filter_options(
            df,
            business
        )


        return jsonify({

            "success": True,

            "options":
                options

        })


    except Exception as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        })


# ==========================================================
# APPLY DASHBOARD FILTERS
# ==========================================================

@app.route(
    "/dashboard/filter",
    methods=["POST"]
)
def dashboard_filter():

    try:

        data = request.get_json(
            silent=True
        )


        if not data:

            return jsonify({

                "success": False,

                "message":
                    "No filter data received."

            })


        filename = data.get(
            "filename"
        )


        if not filename:

            return jsonify({

                "success": False,

                "message":
                    "Filename is missing."

            })


        filepath = os.path.join(

            app.config[
                "UPLOAD_FOLDER"
            ],

            filename

        )


        if not os.path.isfile(
            filepath
        ):

            return jsonify({

                "success": False,

                "message":
                    "Uploaded file not found: "
                    + filename

            })


        filters = data.copy()

        filters.pop(
            "filename",
            None
        )


        result = build_filtered_dashboard(

            filepath,

            filters

        )


        return jsonify({

            "success": True,

            "dashboard":
                result

        })


    except Exception as error:

        print(
            "Dashboard Filter Error:",
            error
        )


        return jsonify({

            "success": False,

            "message":
                str(error)

        })


# ==========================================================
# PHASE 5
# QUERY ENGINE - START
# ==========================================================

@app.route(
    "/query/start",
    methods=["POST"]
)
def query_start():

    try:

        data = request.get_json(
            silent=True
        )


        if not data:

            return jsonify({

                "success": False,

                "message":
                    "No request data received."

            })


        filename = data.get(
            "filename"
        )


        if not filename:

            return jsonify({

                "success": False,

                "message":
                    "Filename is required."

            })


        filepath = os.path.join(
            UPLOAD_FOLDER,
            filename
        )


        if not os.path.exists(
            filepath
        ):

            return jsonify({

                "success": False,

                "message":
                    "File not found."

            })


        df = load_dashboard_data(
            filepath
        )


        engine = QueryEngine(
            df
        )


        query_sessions[
            filename
        ] = engine


        return jsonify({

            "success": True,

            "message":
                "Query session started.",

            "columns":
                engine.get_columns(),

            "preview":
                engine.preview(),

            "steps":
                engine.get_steps()

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        })


# ==========================================================
# QUERY - PREVIEW
# ==========================================================

@app.route(
    "/query/preview",
    methods=["POST"]
)
def query_preview():

    try:

        data = request.get_json(
            silent=True
        )


        if not data:

            return jsonify({

                "success": False,

                "message":
                    "No request data received."

            })


        filename = data.get(
            "filename"
        )


        if filename not in query_sessions:

            return jsonify({

                "success": False,

                "message":
                    "Query session not found."

            })


        engine = query_sessions[
            filename
        ]


        return jsonify({

            "success": True,

            "preview":
                engine.preview(),

            "columns":
                engine.get_columns(),

            "steps":
                engine.get_steps()

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        })


# ==========================================================
# QUERY - REMOVE EMPTY ROWS
# ==========================================================

@app.route(
    "/query/remove-empty",
    methods=["POST"]
)
def query_remove_empty():

    try:

        data = request.get_json(
            silent=True
        )

        filename = data.get(
            "filename"
        )


        engine = query_sessions.get(
            filename
        )


        if not engine:

            return jsonify({

                "success": False,

                "message":
                    "Query session not found."

            })


        engine.remove_empty_rows()


        return jsonify({

            "success": True,

            "preview":
                engine.preview(),

            "steps":
                engine.get_steps()

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        })


# ==========================================================
# QUERY - REMOVE COLUMNS
# ==========================================================

@app.route(
    "/query/remove-columns",
    methods=["POST"]
)
def query_remove_columns():

    try:

        data = request.get_json(
            silent=True
        )

        filename = data.get(
            "filename"
        )

        columns = data.get(
            "columns",
            []
        )


        engine = query_sessions.get(
            filename
        )


        if not engine:

            return jsonify({

                "success": False,

                "message":
                    "Query session not found."

            })


        engine.remove_columns(
            columns
        )


        return jsonify({

            "success": True,

            "preview":
                engine.preview(),

            "columns":
                engine.get_columns(),

            "steps":
                engine.get_steps()

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        })


# ==========================================================
# QUERY - RENAME COLUMN
# ==========================================================

@app.route(
    "/query/rename",
    methods=["POST"]
)
def query_rename_column():

    try:

        data = request.get_json(
            silent=True
        )

        filename = data.get(
            "filename"
        )

        old_name = data.get(
            "old_name"
        )

        new_name = data.get(
            "new_name"
        )


        engine = query_sessions.get(
            filename
        )


        if not engine:

            return jsonify({

                "success": False,

                "message":
                    "Query session not found."

            })


        engine.rename_column(
            old_name,
            new_name
        )


        return jsonify({

            "success": True,

            "preview":
                engine.preview(),

            "columns":
                engine.get_columns(),

            "steps":
                engine.get_steps()

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        })


# ==========================================================
# QUERY - RESET
# ==========================================================

@app.route(
    "/query/reset",
    methods=["POST"]
)
def query_reset():

    try:

        data = request.get_json(
            silent=True
        )

        filename = data.get(
            "filename"
        )


        engine = query_sessions.get(
            filename
        )


        if not engine:

            return jsonify({

                "success": False,

                "message":
                    "Query session not found."

            })


        engine.reset()


        return jsonify({

            "success": True,

            "message":
                "Query reset successfully.",

            "preview":
                engine.preview(),

            "columns":
                engine.get_columns(),

            "steps":
                engine.get_steps()

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        })


# ==========================================================
# PHASE 5
# AUTOMATIC BUSINESS SUMMARY
# ==========================================================

@app.route(
    "/dashboard/summary",
    methods=["POST"]
)
def dashboard_summary():

    try:

        data = request.get_json(
            silent=True
        )


        if not data:

            return jsonify({

                "success": False,

                "message":
                    "No request data received."

            })


        filename = data.get(
            "filename"
        )


        if not filename:

            return jsonify({

                "success": False,

                "message":
                    "Filename is required."

            })


        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )


        if not os.path.exists(
            filepath
        ):

            return jsonify({

                "success": False,

                "message":
                    "Uploaded file not found."

            })


        # --------------------------------------------------
        # LOAD DATA
        # --------------------------------------------------

        df = load_dashboard_data(
            filepath
        )


        # --------------------------------------------------
        # DETECT BUSINESS COLUMNS
        # --------------------------------------------------

        business = detect_business_columns(
            df
        )


        # --------------------------------------------------
        # GENERATE SUMMARY
        # --------------------------------------------------

        summary = generate_summary(
            df,
            business
        )


        return jsonify(
            summary
        )


    except Exception as e:

        print(
            "Summary Error:",
            str(e)
        )


        return jsonify({

            "success": False,

            "message":
                "Summary generation failed: "
                + str(e)

        }), 500


# app.py
from flask import Flask, render_template
from config import Config
from utils.helpers import ensure_folder
from routes import register_blueprints


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Ensure folders exist
    ensure_folder(app.config["UPLOAD_FOLDER"])
    ensure_folder(app.config["CLEANED_FOLDER"])

    # Register blueprints
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