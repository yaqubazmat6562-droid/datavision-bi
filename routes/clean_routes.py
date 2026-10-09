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
# ==========================================================
# PREVIEW CLEANING (DRY RUN)
# ==========================================================
@clean_bp.route("/api/clean-preview", methods=["POST"])
def api_clean_preview():
    """
    Preview what will happen after cleaning - without saving.
    Returns before/after stats and preview of cleaned data.
    """
    try:
        import pandas as pd
        import numpy as np
        from utils.helpers import load_file_dataframe
        from utils.validators import validate_file_exists

        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        options = data.get("options", {})

        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400

        filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        validate_file_exists(filepath)

        df = load_file_dataframe(filepath)

        # Before stats
        before_stats = {
            "rows": len(df),
            "columns": len(df.columns),
            "missing": int(df.isnull().sum().sum()),
            "duplicates": int(df.duplicated().sum()),
            "total_cells": len(df) * len(df.columns),
        }

        # Apply cleaning
        cleaned_df, cleaning_log = apply_advanced_cleaning(df, options)

        # After stats
        after_stats = {
            "rows": len(cleaned_df),
            "columns": len(cleaned_df.columns),
            "missing": int(cleaned_df.isnull().sum().sum()),
            "duplicates": int(cleaned_df.duplicated().sum()),
            "total_cells": len(cleaned_df) * len(cleaned_df.columns),
        }

        # Preview (first 20 rows)
        preview_df = cleaned_df.head(20).copy()
        # Convert NaN to empty string
        preview_df = preview_df.fillna("")

        # Convert all values to strings to avoid JSON issues
        preview_records = []
        for _, row in preview_df.iterrows():
            record = {}
            for col in preview_df.columns:
                val = row[col]
                if pd.isna(val):
                    record[str(col)] = ""
                elif isinstance(val, (pd.Timestamp,)):
                    record[str(col)] = val.strftime("%Y-%m-%d")
                else:
                    record[str(col)] = str(val)
            preview_records.append(record)

        # Column names
        columns = [str(c) for c in cleaned_df.columns]

        return jsonify({
            "success": True,
            "before": before_stats,
            "after": after_stats,
            "log": cleaning_log,
            "preview": preview_records,
            "columns": columns,
            "total_rows_cleaned": len(cleaned_df),
        })

    except Exception as e:
        import traceback
        print("Clean Preview Error:", str(e))
        print(traceback.format_exc())
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# ADVANCED CLEANING LOGIC
# ==========================================================
def apply_advanced_cleaning(df, options):
    """
    Apply advanced cleaning based on user-selected options.
    Returns (cleaned_df, log)
    """
    import pandas as pd
    import numpy as np

    cleaned = df.copy()
    log = []

    # Standardize column names (strip)
    cleaned.columns = [str(c).strip() for c in cleaned.columns]

    # ======================================================
    # 1. STANDARDIZE NULLS
    # ======================================================
    if options.get("standardize_nulls"):
        before_missing = int(cleaned.isnull().sum().sum())
        null_values = ["", " ", "NA", "N/A", "na", "n/a", "NULL", "null", "None",
                       "none", "-", "--", "nan", "NaN", "NAN"]
        cleaned = cleaned.replace(null_values, np.nan)
        after_missing = int(cleaned.isnull().sum().sum())
        log.append({
            "step": "Standardize Nulls",
            "icon": "🔄",
            "detail": f"Converted common null patterns to true empty values",
            "before": before_missing,
            "after": after_missing,
            "changed": abs(after_missing - before_missing)
        })

    # ======================================================
    # 2. TRIM WHITESPACE
    # ======================================================
    if options.get("trim_whitespace"):
        text_cols = cleaned.select_dtypes(include=["object", "string"]).columns
        trimmed_cells = 0
        for col in text_cols:
            before = cleaned[col].copy()
            cleaned[col] = cleaned[col].astype("string").str.strip()
            changed = (before.astype("string").fillna("__NAN__") != cleaned[col].fillna("__NAN__")).sum()
            trimmed_cells += int(changed)
        log.append({
            "step": "Trim Whitespace",
            "icon": "✂️",
            "detail": f"Removed leading/trailing spaces from text columns",
            "changed": trimmed_cells
        })

    # ======================================================
    # 3. LOWERCASE TEXT
    # ======================================================
    if options.get("lowercase_text"):
        text_cols = cleaned.select_dtypes(include=["object", "string"]).columns
        changed = 0
        for col in text_cols:
            before = cleaned[col].copy()
            cleaned[col] = cleaned[col].astype("string").str.lower()
            changed += int((before.astype("string").fillna("__NAN__") != cleaned[col].fillna("__NAN__")).sum())
        log.append({
            "step": "Lowercase Text",
            "icon": "🔡",
            "detail": f"Converted text to lowercase",
            "changed": changed
        })

    # ======================================================
    # 4. UPPERCASE TEXT
    # ======================================================
    if options.get("uppercase_text"):
        text_cols = cleaned.select_dtypes(include=["object", "string"]).columns
        changed = 0
        for col in text_cols:
            before = cleaned[col].copy()
            cleaned[col] = cleaned[col].astype("string").str.upper()
            changed += int((before.astype("string").fillna("__NAN__") != cleaned[col].fillna("__NAN__")).sum())
        log.append({
            "step": "Uppercase Text",
            "icon": "🔠",
            "detail": f"Converted text to uppercase",
            "changed": changed
        })

    # ======================================================
    # 5. PARSE NUMERIC
    # ======================================================
    if options.get("parse_numeric"):
        text_cols = cleaned.select_dtypes(include=["object", "string"]).columns
        converted_cols = []
        for col in text_cols:
            converted = pd.to_numeric(cleaned[col], errors="coerce")
            valid_ratio = converted.notna().sum() / max(len(cleaned), 1)
            if valid_ratio >= 0.8:
                cleaned[col] = converted
                converted_cols.append(col)
        log.append({
            "step": "Parse Numeric",
            "icon": "🔢",
            "detail": f"Converted {len(converted_cols)} text columns to numbers",
            "changed": len(converted_cols)
        })

    # ======================================================
    # 6. PARSE DATES
    # ======================================================
    if options.get("parse_dates"):
        text_cols = cleaned.select_dtypes(include=["object", "string"]).columns
        converted_cols = []
        for col in text_cols:
            col_lower = str(col).lower()
            # Only try columns with date-like names
            if any(kw in col_lower for kw in ["date", "time", "created", "month", "year"]):
                try:
                    converted = pd.to_datetime(cleaned[col], errors="coerce")
                    valid_ratio = converted.notna().sum() / max(len(cleaned), 1)
                    if valid_ratio >= 0.7:
                        cleaned[col] = converted
                        converted_cols.append(col)
                except Exception:
                    pass
        log.append({
            "step": "Parse Dates",
            "icon": "📅",
            "detail": f"Converted {len(converted_cols)} columns to dates",
            "changed": len(converted_cols)
        })

    # ======================================================
    # 7. REMOVE EMPTY ROWS
    # ======================================================
    if options.get("remove_empty_rows"):
        before_rows = len(cleaned)
        cleaned = cleaned.dropna(how="all").reset_index(drop=True)
        removed = before_rows - len(cleaned)
        log.append({
            "step": "Remove Empty Rows",
            "icon": "🗑️",
            "detail": f"Removed completely empty rows",
            "removed": removed
        })

    # ======================================================
    # 8. REMOVE EMPTY COLUMNS
    # ======================================================
    if options.get("remove_empty_columns"):
        before_cols = len(cleaned.columns)
        empty_cols = [col for col in cleaned.columns if cleaned[col].isnull().all()]
        cleaned = cleaned.drop(columns=empty_cols)
        removed = before_cols - len(cleaned.columns)
        log.append({
            "step": "Remove Empty Columns",
            "icon": "📭",
            "detail": f"Removed completely empty columns",
            "removed": removed
        })

    # ======================================================
    # 9. REMOVE DUPLICATES
    # ======================================================
    if options.get("remove_duplicates"):
        before_rows = len(cleaned)
        cleaned = cleaned.drop_duplicates().reset_index(drop=True)
        removed = before_rows - len(cleaned)
        log.append({
            "step": "Remove Duplicates",
            "icon": "♻️",
            "detail": f"Removed exact duplicate rows",
            "removed": removed
        })

    # ======================================================
    # 10. REMOVE NEGATIVES
    # ======================================================
    if options.get("remove_negatives"):
        numeric_cols = cleaned.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            before_rows = len(cleaned)
            # Remove rows where ANY numeric column is negative
            mask = (cleaned[numeric_cols] < 0).any(axis=1)
            cleaned = cleaned[~mask].reset_index(drop=True)
            removed = before_rows - len(cleaned)
            log.append({
                "step": "Remove Negatives",
                "icon": "➖",
                "detail": f"Removed rows with negative values",
                "removed": removed
            })

    # ======================================================
    # 11. REMOVE OUTLIERS
    # ======================================================
    if options.get("remove_outliers"):
        numeric_cols = cleaned.select_dtypes(include=[np.number]).columns
        before_rows = len(cleaned)
        mask = pd.Series([True] * len(cleaned), index=cleaned.index)

        for col in numeric_cols:
            series = cleaned[col].dropna()
            if len(series) < 5:
                continue
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            if iqr == 0:
                continue
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            col_mask = (cleaned[col] >= lower) & (cleaned[col] <= upper)
            col_mask = col_mask | cleaned[col].isnull()
            mask = mask & col_mask

        cleaned = cleaned[mask].reset_index(drop=True)
        removed = before_rows - len(cleaned)
        log.append({
            "step": "Remove Outliers",
            "icon": "📊",
            "detail": f"Removed extreme values (IQR method)",
            "removed": removed
        })

    # ======================================================
    # 12. FILL MISSING
    # ======================================================
    if options.get("fill_missing"):
        filled_count = 0
        for col in cleaned.columns:
            missing = cleaned[col].isnull().sum()
            if missing == 0:
                continue
            if pd.api.types.is_numeric_dtype(cleaned[col]):
                fill_value = cleaned[col].median()
                if pd.notna(fill_value):
                    cleaned[col] = cleaned[col].fillna(fill_value)
                    filled_count += int(missing)
            elif pd.api.types.is_datetime64_any_dtype(cleaned[col]):
                # Skip dates
                pass
            else:
                mode_val = cleaned[col].mode()
                if len(mode_val) > 0:
                    cleaned[col] = cleaned[col].fillna(mode_val[0])
                    filled_count += int(missing)
        log.append({
            "step": "Fill Missing Values",
            "icon": "🩹",
            "detail": f"Filled missing values with median/mode",
            "changed": filled_count
        })

    return cleaned, log
# ==========================================================
# APPLY CLEANING (SAVE)
# ==========================================================
@clean_bp.route("/api/clean-apply", methods=["POST"])
def api_clean_apply():
    """
    Apply cleaning and save the cleaned file.
    Returns the new cleaned filename.
    """
    try:
        import pandas as pd
        import numpy as np
        from datetime import datetime
        from utils.helpers import load_file_dataframe
        from utils.validators import validate_file_exists

        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        options = data.get("options", {})

        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400

        filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        validate_file_exists(filepath)

        df = load_file_dataframe(filepath)
        cleaned_df, cleaning_log = apply_advanced_cleaning(df, options)

        # Generate cleaned filename
        base_name = os.path.splitext(filename)[0]
        ext = os.path.splitext(filename)[1].lower()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Clean the base name (remove weird characters)
        safe_base = "".join(c if c.isalnum() or c in "._-" else "_" for c in base_name)

        # Save in "cleaned" folder
        cleaned_folder = current_app.config.get("CLEANED_FOLDER", "cleaned")
        os.makedirs(cleaned_folder, exist_ok=True)

        if ext == ".csv":
            cleaned_filename = f"{safe_base}_cleaned_{timestamp}.csv"
            cleaned_filepath = os.path.join(cleaned_folder, cleaned_filename)
            cleaned_df.to_csv(cleaned_filepath, index=False)
        else:
            # Excel (default)
            cleaned_filename = f"{safe_base}_cleaned_{timestamp}.xlsx"
            cleaned_filepath = os.path.join(cleaned_folder, cleaned_filename)
            cleaned_df.to_excel(cleaned_filepath, index=False)

        # Also save a copy in uploads folder (so it can be used in dashboard)
        upload_copy = os.path.join(current_app.config["UPLOAD_FOLDER"], cleaned_filename)
        try:
            if ext == ".csv":
                cleaned_df.to_csv(upload_copy, index=False)
            else:
                cleaned_df.to_excel(upload_copy, index=False)
        except Exception as copy_err:
            print("Upload copy failed:", copy_err)

        return jsonify({
            "success": True,
            "message": "Data cleaned successfully!",
            "cleaned_filename": cleaned_filename,
            "cleaned_filepath": cleaned_filepath,
            "original_rows": len(df),
            "cleaned_rows": len(cleaned_df),
            "original_columns": len(df.columns),
            "cleaned_columns": len(cleaned_df.columns),
            "log": cleaning_log,
        })

    except Exception as e:
        import traceback
        print("Clean Apply Error:", str(e))
        print(traceback.format_exc())
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# DOWNLOAD CLEANED FILE
# ==========================================================
@clean_bp.route("/api/clean-download/<path:filename>", methods=["GET"])
def api_clean_download(filename):
    """
    Download a cleaned file.
    """
    try:
        from flask import send_file
        cleaned_folder = current_app.config.get("CLEANED_FOLDER", "cleaned")
        filepath = os.path.join(cleaned_folder, filename)

        if not os.path.isfile(filepath):
            return jsonify({"success": False, "message": "File not found."}), 404

        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500