# routes/export_routes.py
# Dashboard Export Engine
# Supports: Excel (multi-sheet), CSV, JSON

import os
import io
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_file
import pandas as pd
import numpy as np

from engines.dashboard_engine import (
    load_dashboard_data,
    detect_business_columns,
    create_kpis,
    analyze_by_dimension,
    monthly_trend,
)
from utils.validators import validate_file_exists

export_bp = Blueprint("export", __name__)


# ==========================================================
# HELPER: Get filtered dataframe
# ==========================================================

def get_dataframe_for_export(filename, filters=None):
    """Load dataframe and apply filters if any."""
    filepath = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        filename
    )
    validate_file_exists(filepath)

    df = load_dashboard_data(filepath)

    # Apply filters if provided
    if filters:
        from engines.dashboard_engine import apply_dashboard_filters
        business = detect_business_columns(df)
        # Remove filename key if present
        filters_clean = {k: v for k, v in filters.items() if k != "filename"}
        df = apply_dashboard_filters(df, filters_clean, business)

    return df


# ==========================================================
# EXPORT: RAW DATA (filtered) as CSV
# ==========================================================

@export_bp.route("/export/csv", methods=["POST"])
def export_csv():
    """Export filtered raw data as CSV."""
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        filters = data.get("filters", {})

        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename required."
            }), 400

        df = get_dataframe_for_export(filename, filters)

        # Create CSV in memory
        output = io.StringIO()
        df.to_csv(output, index=False, encoding="utf-8-sig")
        output.seek(0)

        # Convert to bytes
        bytes_output = io.BytesIO(output.getvalue().encode("utf-8-sig"))

        # Filename with timestamp
        base_name = os.path.splitext(filename)[0]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        download_name = f"{base_name}_export_{timestamp}.csv"

        return send_file(
            bytes_output,
            mimetype="text/csv",
            as_attachment=True,
            download_name=download_name
        )

    except Exception as e:
        print("CSV Export Error:", str(e))
        return jsonify({
            "success": False,
            "message": f"CSV export failed: {str(e)}"
        }), 500


# ==========================================================
# EXPORT: FULL EXCEL WORKBOOK (multi-sheet)
# ==========================================================

@export_bp.route("/export/excel", methods=["POST"])
def export_excel():
    """Export full dashboard as multi-sheet Excel."""
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        filters = data.get("filters", {})

        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename required."
            }), 400

        df = get_dataframe_for_export(filename, filters)

        # Detect business columns
        business = detect_business_columns(df)

        # Create Excel writer in memory
        output = io.BytesIO()

        with pd.ExcelWriter(output, engine="openpyxl") as writer:

            # ------------------------------------------
            # Sheet 1: Raw Data (filtered)
            # ------------------------------------------
            df.to_excel(writer, sheet_name="Data", index=False)


            # ------------------------------------------
            # Sheet 2: KPIs Summary
            # ------------------------------------------
            kpis = create_kpis(df, business)

            kpi_df = pd.DataFrame([
                {"Metric": "Total Sales", "Value": kpis.get("total_sales")},
                {"Metric": "Total Cost", "Value": kpis.get("total_cost")},
                {"Metric": "Gross Profit", "Value": kpis.get("profit")},
                {"Metric": "Profit Margin (%)", "Value": kpis.get("profit_margin")},
                {"Metric": "Total Orders", "Value": kpis.get("total_orders")},
                {"Metric": "Total Units", "Value": kpis.get("total_units")},
                {"Metric": "Unique Customers", "Value": kpis.get("unique_customers")},
                {"Metric": "Average Order Value", "Value": kpis.get("average_order_value")},
                {"Metric": "Total Rows", "Value": kpis.get("rows")},
                {"Metric": "Total Columns", "Value": kpis.get("columns")},
            ])

            kpi_df.to_excel(writer, sheet_name="KPIs", index=False)


            # ------------------------------------------
            # Sheet 3: Product Analysis
            # ------------------------------------------
            product_col = business.get("product")
            if product_col:
                products = analyze_by_dimension(df, product_col, business, limit=100)
                if products:
                    pd.DataFrame(products).to_excel(
                        writer, sheet_name="Products", index=False
                    )


            # ------------------------------------------
            # Sheet 4: Category Analysis
            # ------------------------------------------
            category_col = business.get("category")
            if category_col:
                categories = analyze_by_dimension(df, category_col, business, limit=100)
                if categories:
                    pd.DataFrame(categories).to_excel(
                        writer, sheet_name="Categories", index=False
                    )


            # ------------------------------------------
            # Sheet 5: Monthly Trend
            # ------------------------------------------
            monthly = monthly_trend(df, business)
            if monthly:
                pd.DataFrame(monthly).to_excel(
                    writer, sheet_name="Monthly Trend", index=False
                )


            # ------------------------------------------
            # Sheet 6: Top Customers
            # ------------------------------------------
            customer_col = business.get("customer")
            if customer_col:
                customers = analyze_by_dimension(df, customer_col, business, limit=100)
                if customers:
                    pd.DataFrame(customers).to_excel(
                        writer, sheet_name="Customers", index=False
                    )


            # ------------------------------------------
            # Sheet 7: State Analysis
            # ------------------------------------------
            state_col = business.get("state")
            if state_col:
                states = analyze_by_dimension(df, state_col, business, limit=100)
                if states:
                    pd.DataFrame(states).to_excel(
                        writer, sheet_name="States", index=False
                    )


            # ------------------------------------------
            # Sheet 8: Detected Columns Info
            # ------------------------------------------
            columns_info = []
            for key, col in business.items():
                if col and col != "__CALCULATED__":
                    columns_info.append({
                        "Business Field": key.title(),
                        "Detected Column": col
                    })

            if columns_info:
                pd.DataFrame(columns_info).to_excel(
                    writer, sheet_name="Detection Info", index=False
                )


            # ------------------------------------------
            # Sheet 9: Report Metadata
            # ------------------------------------------
            metadata = pd.DataFrame([
                {"Property": "Report Generated", "Value": datetime.now().strftime("%Y-%m-%d %H:%M:%S")},
                {"Property": "Source File", "Value": filename},
                {"Property": "Total Rows (Filtered)", "Value": len(df)},
                {"Property": "Total Columns", "Value": len(df.columns)},
                {"Property": "Active Filters", "Value": str(filters) if filters else "None"},
                {"Property": "Generated By", "Value": "DATAVISION BI"},
            ])

            metadata.to_excel(writer, sheet_name="Report Info", index=False)


        output.seek(0)

        # Download filename
        base_name = os.path.splitext(filename)[0]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        download_name = f"{base_name}_report_{timestamp}.xlsx"

        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=download_name
        )

    except Exception as e:
        print("Excel Export Error:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Excel export failed: {str(e)}"
        }), 500


# ==========================================================
# EXPORT: JSON (for API integrations)
# ==========================================================

@export_bp.route("/export/json", methods=["POST"])
def export_json():
    """Export dashboard as structured JSON."""
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        filters = data.get("filters", {})

        if not filename:
            return jsonify({
                "success": False,
                "message": "Filename required."
            }), 400

        df = get_dataframe_for_export(filename, filters)
        business = detect_business_columns(df)

        # Build complete export
        export_data = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "source_file": filename,
                "rows": len(df),
                "columns": len(df.columns),
                "active_filters": filters
            },
            "business_columns": business,
            "kpis": create_kpis(df, business),
            "products": analyze_by_dimension(df, business.get("product"), business, 100) if business.get("product") else [],
            "categories": analyze_by_dimension(df, business.get("category"), business, 100) if business.get("category") else [],
            "states": analyze_by_dimension(df, business.get("state"), business, 100) if business.get("state") else [],
            "customers": analyze_by_dimension(df, business.get("customer"), business, 100) if business.get("customer") else [],
            "monthly_trend": monthly_trend(df, business),
        }

        return jsonify({
            "success": True,
            "data": export_data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500