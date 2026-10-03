# engines/dashboard_engine.py
# UNIVERSAL SMART DASHBOARD ENGINE
# Handles ANY Excel/CSV file with ANY column names

import pandas as pd
import numpy as np
import os
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

# ==========================================================
# FILE LOADER
# ==========================================================

def load_dashboard_data(filepath):
    """Load any Excel/CSV file."""
    extension = filepath.lower().split(".")[-1]

    if extension in ["xlsx", "xls"]:
        try:
            excel = pd.ExcelFile(filepath)
            sheet_name = excel.sheet_names[0]
            df = pd.read_excel(filepath, sheet_name=sheet_name)
        except Exception:
            df = pd.read_excel(filepath)
    elif extension == "csv":
        try:
            df = pd.read_csv(filepath)
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(filepath, encoding="latin-1")
            except Exception:
                df = pd.read_csv(filepath, encoding="utf-8-sig")
    else:
        raise ValueError("Unsupported file format.")

    # Clean column names
    df.columns = [str(c).strip() for c in df.columns]

    return df


# ==========================================================
# SMART COLUMN MATCHING (Universal Keywords)
# ==========================================================

# Expanded keyword lists - covers 95% of business datasets
COLUMN_KEYWORDS = {

    "sales": [
        "sales", "revenue", "amount", "total", "value", "price",
        "income", "turnover", "gross", "net sales", "sale", "sales amount",
        "revenue amount", "total amount", "order value", "billing",
        "subtotal", "total price", "net amount", "line total"
    ],

    "cost": [
        "cost", "cogs", "expense", "expenditure", "spending",
        "total cost", "cost amount", "purchase cost", "buying price",
        "unit cost", "landed cost", "direct cost", "variable cost"
    ],

    "quantity": [
        "quantity", "qty", "units", "unit", "count", "pieces",
        "volume", "unit sold", "units sold", "quantity sold",
        "order quantity", "item count", "no of items"
    ],

    "product": [
        "product", "item", "product name", "item name", "description",
        "product description", "goods", "sku name", "product title",
        "item description", "product id", "item code", "product code"
    ],

    "category": [
        "category", "type", "segment", "class", "group",
        "product category", "item category", "sub category",
        "product type", "item type", "department"
    ],

    "customer": [
        "customer", "client", "buyer", "customer name", "client name",
        "buyer name", "customer id", "client id", "account",
        "customer code", "party", "party name"
    ],

    "order_id": [
        "order id", "order number", "order no", "orderid", "invoice",
        "invoice number", "invoice no", "invoice id", "transaction id",
        "receipt", "receipt number", "order code", "bill no", "bill number",
        "ticket", "reference", "reference number"
    ],

    "date": [
        "date", "order date", "invoice date", "transaction date",
        "created", "created at", "created date", "timestamp",
        "time", "datetime", "day", "month", "year"
    ],

    "state": [
        "state", "province", "region", "state name", "region name",
        "territory", "zone"
    ],

    "city": [
        "city", "town", "city name", "location", "place"
    ],

    "country": [
        "country", "nation", "country name"
    ],

    "order_type": [
        "order type", "channel", "sales channel", "payment method",
        "payment type", "mode", "source", "medium"
    ],

    "profit": [
        "profit", "margin", "net profit", "gross profit", "earnings",
        "net income", "profit amount"
    ],

    "discount": [
        "discount", "discount amount", "disc", "rebate", "offer"
    ],

    "shipping": [
        "shipping", "shipping cost", "freight", "delivery", "shipping amount"
    ]
}


def find_best_match(columns, keywords):
    """Find best matching column using fuzzy keyword search."""
    columns_lower = {col: str(col).lower().strip() for col in columns}

    best_match = None
    best_score = 0

    for col, col_lower in columns_lower.items():
        # Normalize column name
        col_normalized = col_lower.replace("_", " ").replace("-", " ")

        for keyword in keywords:
            keyword_normalized = keyword.lower()

            # Exact match (best)
            if col_normalized == keyword_normalized:
                return col

            # Contains keyword
            if keyword_normalized in col_normalized:
                score = len(keyword_normalized) / max(len(col_normalized), 1)
                if score > best_score:
                    best_score = score
                    best_match = col

    return best_match


def detect_business_columns(df):
    """Universal smart column detection."""
    result = {
        "sales": None, "cost": None, "profit": None,
        "quantity": None, "customer": None, "product": None,
        "category": None, "state": None, "city": None,
        "country": None, "order_type": None, "order_id": None,
        "date": None, "discount": None, "shipping": None
    }

    for key, keywords in COLUMN_KEYWORDS.items():
        match = find_best_match(df.columns, keywords)
        if match:
            result[key] = match

    # If no explicit profit but we have sales + cost
    if not result["profit"] and result["sales"] and result["cost"]:
        result["profit"] = "__CALCULATED__"

    return result


# ==========================================================
# AUTO-DETECT NUMERIC FALLBACKS
# ==========================================================

def get_numeric_columns(df):
    """Get all numeric columns."""
    return list(df.select_dtypes(include=[np.number]).columns)


def get_text_columns(df):
    """Get all text columns (low cardinality)."""
    result = []
    for col in df.columns:
        if df[col].dtype == "object" or str(df[col].dtype).startswith("string"):
            unique = df[col].nunique(dropna=True)
            if 1 < unique <= 100:
                result.append(col)
    return result


def get_measure_columns(df, business):
    """Return list of numeric columns to use as measures.
    Falls back to auto-detection if business columns not found."""
    measures = []

    # Priority: explicitly detected measures
    for key in ["sales", "cost", "profit", "quantity", "discount", "shipping"]:
        col = business.get(key)
        if col and col != "__CALCULATED__" and col in df.columns:
            measures.append(col)

    # Fallback: all numeric columns
    if not measures:
        measures = get_numeric_columns(df)

    return measures


def get_dimension_columns(df, business):
    """Return list of dimension columns (for grouping).
    Falls back to auto-detection."""
    dimensions = []

    for key in ["product", "category", "customer", "state", "city",
                "country", "order_type"]:
        col = business.get(key)
        if col and col in df.columns:
            dimensions.append(col)

    # Fallback: text columns
    if not dimensions:
        dimensions = get_text_columns(df)

    return dimensions


# ==========================================================
# KPI CALCULATIONS (Universal)
# ==========================================================

def safe_sum(series):
    """Safe sum that handles any type."""
    try:
        return float(pd.to_numeric(series, errors="coerce").sum())
    except Exception:
        return 0.0


def create_kpis(df, business):
    """Create universal KPIs."""
    kpis = {
        "total_sales": None, "total_cost": None, "profit": None,
        "profit_margin": None, "total_units": None,
        "total_orders": None, "unique_customers": None,
        "average_order_value": None, "rows": len(df), "columns": len(df.columns)
    }

    sales_col = business.get("sales")
    cost_col = business.get("cost")
    quantity_col = business.get("quantity")
    customer_col = business.get("customer")
    order_col = business.get("order_id")

    # SALES
    if sales_col and sales_col in df.columns:
        kpis["total_sales"] = safe_sum(df[sales_col])

    # COST
    if cost_col and cost_col in df.columns:
        kpis["total_cost"] = safe_sum(df[cost_col])

    # PROFIT
    if sales_col and cost_col and sales_col in df.columns and cost_col in df.columns:
        try:
            sales = pd.to_numeric(df[sales_col], errors="coerce").fillna(0)
            cost = pd.to_numeric(df[cost_col], errors="coerce").fillna(0)
            profit = float((sales - cost).sum())
            kpis["profit"] = profit
            if kpis["total_sales"] and kpis["total_sales"] != 0:
                kpis["profit_margin"] = float((profit / kpis["total_sales"]) * 100)
        except Exception:
            pass
    elif business.get("profit") and business["profit"] != "__CALCULATED__":
        if business["profit"] in df.columns:
            kpis["profit"] = safe_sum(df[business["profit"]])

    # QUANTITY
    if quantity_col and quantity_col in df.columns:
        kpis["total_units"] = safe_sum(df[quantity_col])

    # ORDERS
    if order_col and order_col in df.columns:
        kpis["total_orders"] = int(df[order_col].nunique(dropna=True))
    else:
        kpis["total_orders"] = int(len(df))

    # CUSTOMERS
    if customer_col and customer_col in df.columns:
        kpis["unique_customers"] = int(df[customer_col].nunique(dropna=True))

    # AOV
    if kpis["total_orders"] and kpis["total_sales"]:
        kpis["average_order_value"] = float(kpis["total_sales"] / kpis["total_orders"])

    return kpis


# ==========================================================
# GROUPED ANALYSIS (Universal)
# ==========================================================

def analyze_by_dimension(df, dimension, business, limit=10):
    """Generic dimension analysis - works with any column types."""
    if not dimension or dimension not in df.columns:
        return []

    sales_col = business.get("sales")
    cost_col = business.get("cost")
    quantity_col = business.get("quantity")

    # If no sales column, use any numeric column
    if not sales_col or sales_col not in df.columns:
        numeric_cols = get_numeric_columns(df)
        if numeric_cols:
            sales_col = numeric_cols[0]
        else:
            # Just count
            result = df.groupby(dimension, dropna=False).size().reset_index(name="count")
            result = result.sort_values("count", ascending=False).head(limit)
            return result.replace({np.nan: None}).to_dict(orient="records")

    # Create a numeric-safe working copy
    work = df.copy()

    # Force sales to numeric
    if sales_col in work.columns:
        work[sales_col] = pd.to_numeric(work[sales_col], errors="coerce").fillna(0)

    # Force cost to numeric
    if cost_col and cost_col in work.columns:
        work[cost_col] = pd.to_numeric(work[cost_col], errors="coerce").fillna(0)

    # Force quantity to numeric
    if quantity_col and quantity_col in work.columns:
        work[quantity_col] = pd.to_numeric(work[quantity_col], errors="coerce").fillna(0)

    # Aggregate
    agg_dict = {sales_col: "sum"}
    if cost_col and cost_col in work.columns:
        agg_dict[cost_col] = "sum"
    if quantity_col and quantity_col in work.columns:
        agg_dict[quantity_col] = "sum"

    try:
        result = work.groupby(dimension, dropna=False).agg(agg_dict).reset_index()
    except Exception as e:
        print("Groupby error:", e)
        return []

    # Add profit if possible (both are now numeric)
    if cost_col and cost_col in result.columns and sales_col in result.columns:
        try:
            result["__PROFIT__"] = (
                pd.to_numeric(result[sales_col], errors="coerce").fillna(0)
                - pd.to_numeric(result[cost_col], errors="coerce").fillna(0)
            )
        except Exception as e:
            print("Profit calc error:", e)

    result = result.sort_values(sales_col, ascending=False).head(limit)
    return result.replace({np.nan: None}).to_dict(orient="records")

# ==========================================================
# MONTHLY TREND (Universal)
# ==========================================================

def detect_date_column_smart(df):
    """Smart date detection with fallback."""
    # Try business keywords first
    for col in df.columns:
        col_lower = str(col).lower()
        if any(kw in col_lower for kw in ["date", "time", "created", "month", "year"]):
            try:
                converted = pd.to_datetime(df[col], errors="coerce")
                if converted.notna().sum() >= len(df) * 0.5:
                    return col
            except Exception:
                pass

    # Fallback: try to convert any column
    for col in df.columns:
        if df[col].dtype == "object":
            try:
                converted = pd.to_datetime(df[col], errors="coerce")
                if converted.notna().sum() >= len(df) * 0.7:
                    return col
            except Exception:
                pass

    return None


def monthly_trend(df, business):
    """Universal monthly trend - safe numeric."""
    date_col = detect_date_column_smart(df)
    sales_col = business.get("sales")
    cost_col = business.get("cost")

    if not date_col:
        return []

    # If no sales, use first numeric
    if not sales_col or sales_col not in df.columns:
        numeric_cols = get_numeric_columns(df)
        if numeric_cols:
            sales_col = numeric_cols[0]

    if not sales_col:
        return []

    temp = df.copy()
    temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
    temp = temp.dropna(subset=[date_col])

    if len(temp) == 0:
        return []

    # Force numeric
    temp[sales_col] = pd.to_numeric(temp[sales_col], errors="coerce").fillna(0)

    if cost_col and cost_col in temp.columns:
        temp[cost_col] = pd.to_numeric(temp[cost_col], errors="coerce").fillna(0)

    temp["__MONTH__"] = temp[date_col].dt.to_period("M").astype(str)

    agg = {sales_col: "sum"}
    if cost_col and cost_col in temp.columns:
        agg[cost_col] = "sum"

    try:
        result = temp.groupby("__MONTH__").agg(agg).reset_index()
        result = result.rename(columns={"__MONTH__": "Year_Month"})

        # Add profit (safe)
        if cost_col and cost_col in result.columns:
            result["__PROFIT__"] = (
                pd.to_numeric(result[sales_col], errors="coerce").fillna(0)
                - pd.to_numeric(result[cost_col], errors="coerce").fillna(0)
            )

        result = result.sort_values("Year_Month")
        return result.replace({np.nan: None}).to_dict(orient="records")
    except Exception as e:
        print("Monthly trend error:", e)
        return []
# ==========================================================
# MAIN DASHBOARD BUILDER (Universal)
# ==========================================================

def build_dashboard(filepath):
    """Build universal dashboard for ANY dataset."""
    df = load_dashboard_data(filepath)
    business = detect_business_columns(df)

    # KPIs
    kpis = create_kpis(df, business)

    # Get all analysis dimensions
    product_col = business.get("product")
    category_col = business.get("category")
    customer_col = business.get("customer")
    state_col = business.get("state")
    city_col = business.get("city")
    order_type_col = business.get("order_type")

    # If no product detected, use first text column
    if not product_col:
        text_cols = get_text_columns(df)
        if text_cols:
            product_col = text_cols[0]

    # If no category, use second text column
    if not category_col:
        text_cols = get_text_columns(df)
        for tc in text_cols:
            if tc != product_col:
                category_col = tc
                break

    # If no customer, use third text column
    if not customer_col:
        text_cols = get_text_columns(df)
        for tc in text_cols:
            if tc != product_col and tc != category_col:
                customer_col = tc
                break

    products = analyze_by_dimension(df, product_col, business) if product_col else []
    categories = analyze_by_dimension(df, category_col, business) if category_col else []
    states = analyze_by_dimension(df, state_col, business) if state_col else []
    customers = analyze_by_dimension(df, customer_col, business) if customer_col else []
    order_types = analyze_by_dimension(df, order_type_col, business) if order_type_col else []
    monthly = monthly_trend(df, business)

    # Update business dict with fallbacks used
    if product_col:
        business["product"] = product_col
    if category_col:
        business["category"] = category_col
    if customer_col:
        business["customer"] = customer_col

    return {
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "date_column": detect_date_column_smart(df),
        "numeric_columns": get_numeric_columns(df),
        "text_columns": get_text_columns(df),
        "business_columns": business,
        "kpis": kpis,
        "products": products,
        "categories": categories,
        "states": states,
        "customers": customers,
        "order_types": order_types,
        "monthly_trend": monthly
    }


# ==========================================================
# FILTER ENGINE (Universal)
# ==========================================================

def apply_dashboard_filters(df, filters, business):
    """Apply filters universally."""
    filtered = df.copy()

    # For each dimension filter
    for key in ["product", "category", "state", "city", "order_type", "customer"]:
        col = business.get(key)
        values = filters.get(key)

        if col and col in filtered.columns and values:
            if isinstance(values, list):
                filtered = filtered[filtered[col].astype(str).isin(values)]
            else:
                filtered = filtered[filtered[col].astype(str) == str(values)]

    # Date range
    date_col = detect_date_column_smart(filtered)
    if date_col:
        filtered[date_col] = pd.to_datetime(filtered[date_col], errors="coerce")

        if filters.get("date_from"):
            start = pd.to_datetime(filters["date_from"], errors="coerce")
            if pd.notna(start):
                filtered = filtered[filtered[date_col] >= start]

        if filters.get("date_to"):
            end = pd.to_datetime(filters["date_to"], errors="coerce")
            if pd.notna(end):
                end = end + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
                filtered = filtered[filtered[date_col] <= end]

    return filtered


def get_filter_options(df, business):
    """Get filter options - ONLY return keys where data exists."""
    options = {}

    for key in ["product", "category", "state", "city", "order_type", "customer"]:
        col = business.get(key)
        if col and col in df.columns:
            values = df[col].dropna().astype(str).unique().tolist()
            # Filter out empty strings
            values = [v for v in values if v and v.strip() and v.lower() not in ["nan", "none", "null"]]
            values.sort()
            # Only include if there are actual values
            if len(values) > 0:
                options[key] = values[:500]
        # DON'T add empty lists — frontend will hide those filters

    date_col = detect_date_column_smart(df)
    if date_col:
        try:
            dates = pd.to_datetime(df[date_col], errors="coerce").dropna()
            if len(dates):
                options["date_min"] = dates.min().strftime("%Y-%m-%d")
                options["date_max"] = dates.max().strftime("%Y-%m-%d")
        except Exception:
            pass

    return options


def build_filtered_dashboard(filepath, filters):
    """Build dashboard with filters applied."""
    df = load_dashboard_data(filepath)
    business = detect_business_columns(df)

    filtered_df = apply_dashboard_filters(df, filters, business)

    if len(filtered_df) == 0:
        return {
            "rows": 0,
            "kpis": {},
            "products": [],
            "categories": [],
            "states": [],
            "customers": [],
            "order_types": [],
            "monthly_trend": [],
            "active_filters": filters
        }

    kpis = create_kpis(filtered_df, business)

    product_col = business.get("product")
    category_col = business.get("category")
    customer_col = business.get("customer")
    state_col = business.get("state")
    order_type_col = business.get("order_type")

    return {
        "rows": len(filtered_df),
        "kpis": kpis,
        "products": analyze_by_dimension(filtered_df, product_col, business) if product_col else [],
        "categories": analyze_by_dimension(filtered_df, category_col, business) if category_col else [],
        "states": analyze_by_dimension(filtered_df, state_col, business) if state_col else [],
        "customers": analyze_by_dimension(filtered_df, customer_col, business) if customer_col else [],
        "order_types": analyze_by_dimension(filtered_df, order_type_col, business) if order_type_col else [],
        "monthly_trend": monthly_trend(filtered_df, business),
        "active_filters": filters
    }