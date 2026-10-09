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
            return jsonify({"success": False, "message": "No filename provided."}), 400

        filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        validate_file_exists(filepath)

        cleaned_df, report = clean_dataset(filepath)

        report["preview"] = (
            cleaned_df.head(10).fillna("").to_dict(orient="records")
        )

        return jsonify({
            "success": True,
            "message": "Data cleaned successfully.",
            "report": report
        })

    except ValidationError as e:
        return jsonify({"success": False, "message": str(e)}), 400

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
        # ==========================================================
# ADVANCED CLEAN PAGE
# ==========================================================
@clean_bp.route("/clean-advanced", methods=["GET"])
def clean_advanced_page():
    from flask import render_template
    filename = request.args.get("filename", "").strip()
    if not filename:
        return "No file specified. Please upload a file first.", 400
    return render_template("clean.html", filename=filename)


# ==========================================================
# CLEAN PAGE - BASIC INFO API
# ==========================================================
@clean_bp.route("/api/clean-info", methods=["POST"])
def api_clean_info():
    try:
        import pandas as pd
        import numpy as np
        from utils.helpers import load_file_dataframe
        from utils.validators import validate_file_exists

        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400

        filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        validate_file_exists(filepath)

        df = load_file_dataframe(filepath)

        # Basic stats
        rows = len(df)
        columns = len(df.columns)
        total_cells = rows * columns
        total_missing = int(df.isnull().sum().sum())
        duplicate_rows = int(df.duplicated().sum())

        # Quality score
        if total_cells > 0:
            missing_ratio = total_missing / total_cells
            duplicate_ratio = duplicate_rows / max(rows, 1)
            quality_score = max(0, min(100, 100 - (missing_ratio * 50 + duplicate_ratio * 50)))
        else:
            quality_score = 0

        # Column profiles
        column_profiles = []
        for col in df.columns:
            series = df[col]
            missing = int(series.isnull().sum())
            missing_pct = (missing / rows * 100) if rows > 0 else 0
            unique = int(series.nunique(dropna=True))

            # Type detection
            if pd.api.types.is_numeric_dtype(series):
                col_type = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(series):
                col_type = "date"
            else:
                # Try to detect date
                try:
                    converted = pd.to_datetime(series, errors="coerce")
                    if rows > 0 and converted.notna().sum() >= rows * 0.7:
                        col_type = "date"
                    else:
                        col_type = "text"
                except Exception:
                    col_type = "text"

            column_profiles.append({
                "name": str(col),
                "type": col_type,
                "missing": missing,
                "missing_pct": round(missing_pct, 2),
                "unique": unique,
                "total": rows,
            })

        return jsonify({
            "success": True,
            "filename": filename,
            "rows": rows,
            "columns": columns,
            "total_cells": total_cells,
            "total_missing": total_missing,
            "duplicate_rows": duplicate_rows,
            "quality_score": round(quality_score, 2),
            "column_profiles": column_profiles,
        })

    except Exception as e:
        import traceback
        print("Clean Info Error:", str(e))
        print(traceback.format_exc())
        return jsonify({"success": False, "message": str(e)}), 500
