# routes/pdf_export_routes.py
# Server-side PDF Report Generator with Charts

import os
import io
from datetime import datetime

from flask import Blueprint, request, jsonify, current_app, send_file
import pandas as pd
import numpy as np

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, Image, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from engines.dashboard_engine import (
    load_dashboard_data,
    detect_business_columns,
    create_kpis,
    analyze_by_dimension,
    monthly_trend,
    apply_dashboard_filters,
)
from utils.validators import validate_file_exists
from utils.limiter import limiter
pdf_bp = Blueprint("pdf_export", __name__)


# ==========================================================
# COLOR PALETTE
# ==========================================================
COLOR_PRIMARY = HexColor("#0b1f3a")    # Dark navy
COLOR_ACCENT = HexColor("#00b4d8")     # Cyan
COLOR_SUCCESS = HexColor("#16a34a")    # Green
COLOR_WARNING = HexColor("#f59e0b")    # Amber
COLOR_DANGER = HexColor("#dc2626")     # Red
COLOR_LIGHT = HexColor("#f1f5f9")      # Light grey
COLOR_BORDER = HexColor("#cbd5e1")     # Border grey
COLOR_TEXT_MUTED = HexColor("#64748b") # Muted text


# ==========================================================
# HELPER: Create matplotlib chart
# ==========================================================

def create_bar_chart(labels, values, title, color="#00b4d8"):
    """Create a bar chart as image bytes."""
    fig, ax = plt.subplots(figsize=(6, 3.5), dpi=100)
    ax.bar(range(len(labels)), values, color=color)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=8)
    ax.set_title(title, fontsize=11, fontweight="bold", color="#0b1f3a")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.3, linestyle="--")
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def create_line_chart(labels, datasets, title):
    """Create a line chart with multiple series."""
    fig, ax = plt.subplots(figsize=(6, 3.5), dpi=100)

    colors = ["#00b4d8", "#16a34a", "#f59e0b", "#dc2626"]

    for i, ds in enumerate(datasets):
        ax.plot(
            range(len(labels)),
            ds["values"],
            marker="o",
            linewidth=2,
            markersize=4,
            label=ds["label"],
            color=colors[i % len(colors)]
        )

    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=8)
    ax.set_title(title, fontsize=11, fontweight="bold", color="#0b1f3a")
    ax.legend(fontsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.3, linestyle="--")
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def create_pie_chart(labels, values, title):
    """Create a pie/doughnut chart."""
    fig, ax = plt.subplots(figsize=(6, 3.5), dpi=100)

    colors = ["#00b4d8", "#0b1f3a", "#16a34a", "#f59e0b",
              "#dc2626", "#8b5cf6", "#06b6d4", "#84cc16"]

    wedges, texts, autotexts = ax.pie(
        values,
        labels=None,
        autopct="%1.1f%%",
        startangle=90,
        colors=colors[:len(values)],
        textprops={"fontsize": 8, "color": "white", "fontweight": "bold"},
        wedgeprops={"edgecolor": "white", "linewidth": 1.5}
    )

    ax.set_title(title, fontsize=11, fontweight="bold", color="#0b1f3a")
    ax.legend(wedges, labels, loc="center left", bbox_to_anchor=(1, 0, 0.5, 1), fontsize=8)
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def create_horizontal_bar_chart(labels, values, title, color="#0b1f3a"):
    """Create a horizontal bar chart."""
    fig, ax = plt.subplots(figsize=(6, 3.5), dpi=100)
    y_pos = range(len(labels))
    ax.barh(y_pos, values, color=color)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels, fontsize=8)
    ax.invert_yaxis()
    ax.set_title(title, fontsize=11, fontweight="bold", color="#0b1f3a")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="x", alpha=0.3, linestyle="--")
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


# ==========================================================
# HELPER: Format currency and numbers
# ==========================================================

def fmt_currency(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "N/A"
    try:
        return "Rs " + f"{float(value):,.0f}"
    except Exception:
        return str(value)


def fmt_number(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "N/A"
    try:
        return f"{float(value):,.0f}"
    except Exception:
        return str(value)


def fmt_percent(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "N/A"
    try:
        return f"{float(value):.1f}%"
    except Exception:
        return str(value)


# ==========================================================
# HELPER: Build PDF header
# ==========================================================

def build_header(filename, timestamp):
    """Build report header as a Table."""
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading1"],
        fontSize=22,
        textColor=COLOR_PRIMARY,
        spaceAfter=2,
        fontName="Helvetica-Bold"
    )

    subtitle_style = ParagraphStyle(
        "SubtitleStyle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=COLOR_TEXT_MUTED,
        spaceAfter=0
    )

    right_style = ParagraphStyle(
        "RightStyle",
        parent=styles["Normal"],
        fontSize=9,
        textColor=COLOR_TEXT_MUTED,
        alignment=TA_RIGHT
    )

    left_content = [
        Paragraph("DATAVISION BI", title_style),
        Paragraph("Business Intelligence Report", subtitle_style),
    ]

    right_content = [
        Paragraph(f"<b>Generated:</b> {timestamp}", right_style),
        Paragraph(f"<b>Source:</b> {filename}", right_style),
    ]

    header_table = Table(
        [[left_content, right_content]],
        colWidths=[12 * cm, 6 * cm]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LINEBELOW", (0, 0), (-1, -1), 2.5, COLOR_ACCENT),
    ]))

    return header_table


# ==========================================================
# HELPER: Build KPI section
# ==========================================================

def build_kpi_section(kpis):
    """Build KPI cards section."""
    styles = getSampleStyleSheet()

    section_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=COLOR_PRIMARY,
        spaceBefore=8,
        spaceAfter=10,
        fontName="Helvetica-Bold"
    )

    label_style = ParagraphStyle(
        "KpiLabel",
        fontSize=8,
        textColor=COLOR_TEXT_MUTED,
        alignment=TA_CENTER
    )

    value_style = ParagraphStyle(
        "KpiValue",
        fontSize=14,
        textColor=COLOR_PRIMARY,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold"
    )

    # Build KPI cards as a 4x2 grid
    kpi_items = [
        ("Total Sales", fmt_currency(kpis.get("total_sales"))),
        ("Total Cost", fmt_currency(kpis.get("total_cost"))),
        ("Gross Profit", fmt_currency(kpis.get("profit"))),
        ("Profit Margin", fmt_percent(kpis.get("profit_margin"))),
        ("Total Orders", fmt_number(kpis.get("total_orders"))),
        ("Units Sold", fmt_number(kpis.get("total_units"))),
        ("Avg Order Value", fmt_currency(kpis.get("average_order_value"))),
        ("Unique Customers", fmt_number(kpis.get("unique_customers"))),
    ]

    # Build cards row by row (4 per row)
    rows = []
    for i in range(0, len(kpi_items), 4):
        row_cards = []
        for label, value in kpi_items[i:i+4]:
            card = Table(
                [
                    [Paragraph(label, label_style)],
                    [Paragraph(value, value_style)],
                ],
                colWidths=[4.3 * cm],
                rowHeights=[0.6 * cm, 0.9 * cm]
            )
            card.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                ("LINEBEFORE", (0, 0), (0, -1), 3, COLOR_ACCENT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            row_cards.append(card)

        # Pad empty cells
        while len(row_cards) < 4:
            row_cards.append(Spacer(1, 1))

        rows.append(row_cards)

    grid = Table(
        rows,
        colWidths=[4.5 * cm] * 4,
        hAlign="LEFT"
    )
    grid.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))

    return [
        Paragraph("Key Performance Indicators", section_title),
        grid,
        Spacer(1, 10)
    ]


# ==========================================================
# HELPER: Build section title
# ==========================================================

def section_title(text):
    styles = getSampleStyleSheet()
    style = ParagraphStyle(
        "SecTitle",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=COLOR_PRIMARY,
        spaceBefore=15,
        spaceAfter=10,
        fontName="Helvetica-Bold"
    )
    return Paragraph(text, style)


# ==========================================================
# HELPER: Build data table
# ==========================================================

def build_data_table(headers, rows, col_widths=None):
    """Build a styled data table."""
    data = [headers] + rows

    if col_widths is None:
        col_widths = [6 * cm, 4 * cm]

    table = Table(data, colWidths=col_widths, repeatRows=1)

    style = [
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
    ]

    # Alternate row colors
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), COLOR_LIGHT))

    # Right-align numeric columns
    for col_idx in range(1, len(headers)):
        style.append(("ALIGN", (col_idx, 1), (col_idx, -1), "RIGHT"))

    table.setStyle(TableStyle(style))
    return table


# ==========================================================
# MAIN: Generate PDF
# ==========================================================

@pdf_bp.route("/export/pdf", methods=["POST"])
@limiter.limit("5 per minute")
def export_pdf():
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        filters = data.get("filters", {})

        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400

        # Load data
        filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        validate_file_exists(filepath)

        df = load_dashboard_data(filepath)
        business = detect_business_columns(df)

        # Apply filters if any
        if filters:
            filters_clean = {k: v for k, v in filters.items() if k != "filename"}
            df = apply_dashboard_filters(df, filters_clean, business)

        if len(df) == 0:
            return jsonify({"success": False, "message": "No data after filters."}), 400

        # Create PDF in memory
        output = io.BytesIO()
        doc = SimpleDocTemplate(
            output,
            pagesize=A4,
            leftMargin=15 * mm,
            rightMargin=15 * mm,
            topMargin=15 * mm,
            bottomMargin=15 * mm,
            title="DATAVISION BI Report"
        )

        story = []
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # --------------------------------------
        # HEADER
        # --------------------------------------
        story.append(build_header(filename, timestamp))
        story.append(Spacer(1, 15))

        # --------------------------------------
        # KPIs
        # --------------------------------------
        kpis = create_kpis(df, business)
        story.extend(build_kpi_section(kpis))

        # --------------------------------------
        # CHARTS SECTION
        # --------------------------------------
        story.append(section_title("Analytics & Visualizations"))

        # ---------- SALES TREND ----------
        monthly = monthly_trend(df, business)
        sales_col = business.get("sales")
        cost_col = business.get("cost")

        if monthly and sales_col:
            labels = [m.get("Year_Month", "") for m in monthly]
            sales_vals = [float(m.get(sales_col) or 0) for m in monthly]
            profit_vals = []
            for m in monthly:
                s = float(m.get(sales_col) or 0)
                c = float(m.get(cost_col) or 0) if cost_col else 0
                profit_vals.append(s - c)

            datasets = [{"label": "Sales", "values": sales_vals}]
            if cost_col:
                datasets.append({"label": "Profit", "values": profit_vals})

            chart_buf = create_line_chart(labels, datasets, "Sales & Profit Trend")
            img = Image(chart_buf, width=17 * cm, height=9 * cm)
            story.append(img)
            story.append(Spacer(1, 10))

        # ---------- PRODUCT ----------
        product_col = business.get("product")
        if product_col:
            products = analyze_by_dimension(df, product_col, business, limit=10)
            if products:
                labels = [str(p.get(product_col, ""))[:20] for p in products]
                values = [float(p.get(sales_col) or 0) for p in products]

                chart_buf = create_bar_chart(labels, values, "Top 10 Products by Sales")
                img = Image(chart_buf, width=17 * cm, height=9 * cm)
                story.append(img)
                story.append(Spacer(1, 10))

                # Product table
                story.append(section_title("Top Products"))
                headers = ["Product", "Sales"]
                rows = []
                for p in products[:10]:
                    rows.append([
                        str(p.get(product_col, ""))[:40],
                        fmt_currency(p.get(sales_col))
                    ])
                story.append(build_data_table(headers, rows, [12 * cm, 5 * cm]))
                story.append(Spacer(1, 10))

        # ---------- CATEGORY ----------
        category_col = business.get("category")
        if category_col:
            categories = analyze_by_dimension(df, category_col, business, limit=10)
            if categories:
                labels = [str(c.get(category_col, ""))[:15] for c in categories]
                values = [float(c.get(sales_col) or 0) for c in categories]

                chart_buf = create_pie_chart(labels, values, "Category Distribution")
                img = Image(chart_buf, width=17 * cm, height=9 * cm)
                story.append(img)
                story.append(Spacer(1, 10))

        # ---------- STATE ----------
        state_col = business.get("state")
        if state_col:
            states = analyze_by_dimension(df, state_col, business, limit=10)
            if states:
                labels = [str(s.get(state_col, ""))[:15] for s in states]
                values = [float(s.get(sales_col) or 0) for s in states]

                chart_buf = create_horizontal_bar_chart(labels, values, "State Performance")
                img = Image(chart_buf, width=17 * cm, height=9 * cm)
                story.append(img)
                story.append(Spacer(1, 10))

        # ---------- CUSTOMER ----------
        customer_col = business.get("customer")
        if customer_col:
            customers = analyze_by_dimension(df, customer_col, business, limit=10)
            if customers:
                labels = [str(c.get(customer_col, ""))[:20] for c in customers]
                values = [float(c.get(sales_col) or 0) for c in customers]

                chart_buf = create_horizontal_bar_chart(labels, values, "Top Customers", color="#00b4d8")
                img = Image(chart_buf, width=17 * cm, height=9 * cm)
                story.append(img)

        # --------------------------------------
        # FOOTER
        # --------------------------------------
        story.append(Spacer(1, 20))

        styles = getSampleStyleSheet()
        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=8,
            textColor=COLOR_TEXT_MUTED,
            alignment=TA_CENTER
        )
        story.append(Paragraph(
            f"Generated by DATAVISION BI &copy; {datetime.now().year} &bull; {timestamp}",
            footer_style
        ))

        # Build PDF
        doc.build(story)
        output.seek(0)

        # Download filename
        base = os.path.splitext(filename)[0]
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        download_name = f"{base}_report_{ts}.pdf"

        return send_file(
            output,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=download_name
        )

    except Exception as e:
        print("PDF Export Error:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"PDF export failed: {str(e)}"
        }), 500