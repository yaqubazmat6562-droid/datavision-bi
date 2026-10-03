
import pandas as pd
import numpy as np


# ==========================================================
# DATAVISION BI
# PHASE 4 - AUTOMATIC DASHBOARD ENGINE
# ==========================================================


def load_dashboard_data(filepath):

    extension = filepath.lower().split(".")[-1]

    if extension in ["xlsx", "xls"]:

        excel = pd.ExcelFile(filepath)

        sheet_name = excel.sheet_names[0]

        df = pd.read_excel(
            filepath,
            sheet_name=sheet_name
        )

    elif extension == "csv":

        df = pd.read_csv(filepath)

    else:

        raise ValueError(
            "Unsupported file format."
        )

    return df


# ==========================================================
# DETECT DATE COLUMN
# ==========================================================

def detect_date_column(df):

    possible_dates = []

    for column in df.columns:

        name = str(column).lower()

        if any(
            word in name
            for word in [
                "date",
                "order_date",
                "invoice_date",
                "transaction_date",
                "created",
                "time"
            ]
        ):

            converted = pd.to_datetime(
                df[column],
                errors="coerce"
            )

            valid = converted.notna().sum()

            if valid > 0:

                possible_dates.append(
                    (
                        column,
                        valid
                    )
                )


    if possible_dates:

        possible_dates.sort(
            key=lambda x: x[1],
            reverse=True
        )

        return possible_dates[0][0]


    # Automatic fallback
    for column in df.columns:

        converted = pd.to_datetime(
            df[column],
            errors="coerce"
        )

        if (
            converted.notna().sum()
            >= len(df) * 0.70
        ):

            return column


    return None


# ==========================================================
# DETECT NUMERIC COLUMNS
# ==========================================================

def detect_numeric_columns(df):

    return list(
        df.select_dtypes(
            include=np.number
        ).columns
    )


# ==========================================================
# DETECT CATEGORY COLUMNS
# ==========================================================

def detect_category_columns(df):

    columns = []

    for column in df.columns:

        if (
            df[column].dtype == "object"
            or
            str(
                df[column].dtype
            ).startswith("string")
        ):

            unique_count = (
                df[column]
                .nunique(
                    dropna=True
                )
            )

            # Avoid very high-cardinality text
            if (
                unique_count > 1
                and
                unique_count <= 100
            ):

                columns.append(
                    column
                )

    return columns


# ==========================================================
# DETECT SPECIAL BUSINESS COLUMNS
# ==========================================================

def detect_business_columns(df):

    result = {

        "sales": None,

        "cost": None,

        "profit": None,

        "quantity": None,

        "customer": None,

        "product": None,

        "category": None,

        "state": None,

        "city": None,

        "order_type": None,

        "order_id": None

    }


    for column in df.columns:

        name = (
            str(column)
            .lower()
            .replace("_", " ")
        )


        # Sales
        if (
            result["sales"] is None
            and any(
                word in name
                for word in [
                    "sales amount",
                    "sales",
                    "revenue",
                    "revenue amount",
                    "net sales"
                ]
            )
        ):

            result["sales"] = column


        # Cost
        if (
            result["cost"] is None
            and any(
                word in name
                for word in [
                    "cost",
                    "total cost"
                ]
            )
            and "unit" not in name
        ):

            result["cost"] = column


        # Quantity
        if (
            result["quantity"] is None
            and any(
                word in name
                for word in [
                    "quantity",
                    "qty",
                    "units",
                    "unit sold"
                ]
            )
        ):

            result["quantity"] = column


        # Customer
        if (
            result["customer"] is None
            and "customer" in name
        ):

            result["customer"] = column


        # Product
        if (
            result["product"] is None
            and "product" in name
        ):

            result["product"] = column


        # Category
        if (
            result["category"] is None
            and "category" in name
        ):

            result["category"] = column


        # State
        if (
            result["state"] is None
            and (
                "state" in name
                or
                "province" in name
            )
        ):

            result["state"] = column


        # City
        if (
            result["city"] is None
            and "city" in name
        ):

            result["city"] = column


        # Order type
        if (
            result["order_type"] is None
            and (
                "order type" in name
                or
                "channel" in name
            )
        ):

            result["order_type"] = column


        # Order ID
        if (
            result["order_id"] is None
            and (
                "order number" in name
                or
                "order id" in name
                or
                "order no" in name
            )
        ):

            result["order_id"] = column


    # Profit can be calculated
    if (
        result["sales"] is not None
        and
        result["cost"] is not None
    ):

        result["profit"] = "__CALCULATED_PROFIT__"


    return result


# ==========================================================
# CREATE KPI DATA
# ==========================================================

def create_kpis(df, business):

    kpis = {}


    sales_col = business["sales"]

    cost_col = business["cost"]

    quantity_col = business["quantity"]

    customer_col = business["customer"]

    order_col = business["order_id"]


    # ------------------------------------------------------
    # TOTAL SALES
    # ------------------------------------------------------

    if sales_col:

        total_sales = pd.to_numeric(
            df[sales_col],
            errors="coerce"
        ).sum()

        kpis["total_sales"] = float(
            total_sales
        )

    else:

        kpis["total_sales"] = None


    # ------------------------------------------------------
    # TOTAL COST
    # ------------------------------------------------------

    if cost_col:

        total_cost = pd.to_numeric(
            df[cost_col],
            errors="coerce"
        ).sum()

        kpis["total_cost"] = float(
            total_cost
        )

    else:

        kpis["total_cost"] = None


    # ------------------------------------------------------
    # PROFIT
    # ------------------------------------------------------

    if (
        sales_col
        and
        cost_col
    ):

        profit = (
            pd.to_numeric(
                df[sales_col],
                errors="coerce"
            )
            -
            pd.to_numeric(
                df[cost_col],
                errors="coerce"
            )
        ).sum()

        kpis["profit"] = float(
            profit
        )

    else:

        kpis["profit"] = None


    # ------------------------------------------------------
    # PROFIT MARGIN
    # ------------------------------------------------------

    if (
        kpis["total_sales"]
        and
        kpis["profit"] is not None
    ):

        kpis["profit_margin"] = float(
            (
                kpis["profit"]
                /
                kpis["total_sales"]
            )
            * 100
        )

    else:

        kpis["profit_margin"] = None


    # ------------------------------------------------------
    # TOTAL UNITS
    # ------------------------------------------------------

    if quantity_col:

        kpis["total_units"] = float(
            pd.to_numeric(
                df[quantity_col],
                errors="coerce"
            ).sum()
        )

    else:

        kpis["total_units"] = None


    # ------------------------------------------------------
    # TOTAL ORDERS
    # ------------------------------------------------------

    if order_col:

        kpis["total_orders"] = int(
            df[order_col]
            .nunique(
                dropna=True
            )
        )

    else:

        kpis["total_orders"] = int(
            len(df)
        )


    # ------------------------------------------------------
    # UNIQUE CUSTOMERS
    # ------------------------------------------------------

    if customer_col:

        kpis["unique_customers"] = int(
            df[customer_col]
            .nunique(
                dropna=True
            )
        )

    else:

        kpis["unique_customers"] = None


    # ------------------------------------------------------
    # AVERAGE ORDER VALUE
    # ------------------------------------------------------

    if (
        kpis["total_orders"]
        and
        kpis["total_sales"] is not None
    ):

        kpis["average_order_value"] = float(
            kpis["total_sales"]
            /
            kpis["total_orders"]
        )

    else:

        kpis["average_order_value"] = None


    return kpis


# ==========================================================
# PRODUCT ANALYSIS
# ==========================================================

def product_analysis(
    df,
    business,
    limit=10
):

    product_col = business["product"]

    sales_col = business["sales"]

    cost_col = business["cost"]

    quantity_col = business["quantity"]


    if not product_col:

        return []


    group_columns = [
        product_col
    ]


    aggregation = {}


    if sales_col:

        aggregation[
            sales_col
        ] = "sum"


    if cost_col:

        aggregation[
            cost_col
        ] = "sum"


    if quantity_col:

        aggregation[
            quantity_col
        ] = "sum"


    result = (
        df.groupby(
            group_columns,
            dropna=False
        )
        .agg(
            aggregation
        )
        .reset_index()
    )


    if sales_col:

        result["Profit"] = (
            result[sales_col]
            -
            result.get(
                cost_col,
                0
            )
        )


        result["Margin"] = np.where(

            result[sales_col] != 0,

            (
                result["Profit"]
                /
                result[sales_col]
            )
            * 100,

            0
        )


        result = result.sort_values(
            sales_col,
            ascending=False
        )


    result = result.head(
        limit
    )


    return (
        result
        .replace(
            {
                np.nan: None
            }
        )
        .to_dict(
            orient="records"
        )
    )


# ==========================================================
# CATEGORY ANALYSIS
# ==========================================================

def category_analysis(
    df,
    business
):

    category_col = business["category"]

    sales_col = business["sales"]


    if (
        not category_col
        or
        not sales_col
    ):

        return []


    result = (
        df.groupby(
            category_col,
            dropna=False
        )[sales_col]
        .sum()
        .reset_index()
        .sort_values(
            sales_col,
            ascending=False
        )
    )


    return (
        result
        .replace(
            {
                np.nan: None
            }
        )
        .to_dict(
            orient="records"
        )
    )


# ==========================================================
# MONTHLY TREND
# ==========================================================

def monthly_trend(
    df,
    business
):

    date_col = detect_date_column(
        df
    )

    sales_col = business["sales"]


    if (
        not date_col
        or
        not sales_col
    ):

        return []


    temp = df.copy()


    temp[date_col] = pd.to_datetime(
        temp[date_col],
        errors="coerce"
    )


    temp = temp.dropna(
        subset=[
            date_col
        ]
    )


    temp["Year_Month"] = (
        temp[date_col]
        .dt
        .to_period("M")
        .astype(str)
    )


    result = (
        temp.groupby(
            "Year_Month"
        )[sales_col]
        .sum()
        .reset_index()
    )


    result = result.sort_values(
        "Year_Month"
    )


    return (
        result
        .replace(
            {
                np.nan: None
            }
        )
        .to_dict(
            orient="records"
        )
    )


# ==========================================================
# MAIN DASHBOARD BUILDER
# ==========================================================

def build_dashboard(filepath):

    df = load_dashboard_data(
        filepath
    )


    # Detect fields
    date_column = detect_date_column(
        df
    )

    numeric_columns = (
        detect_numeric_columns(df)
    )

    category_columns = (
        detect_category_columns(df)
    )

    business = (
        detect_business_columns(df)
    )


    # KPI calculations
    kpis = create_kpis(
        df,
        business
    )


    # Analyses
    products = product_analysis(
        df,
        business
    )


    categories = category_analysis(
        df,
        business
    )


    monthly = monthly_trend(
        df,
        business
    )


    return {

        "rows":
            len(df),

        "columns":
            len(df.columns),

        "date_column":
            date_column,

        "numeric_columns":
            numeric_columns,

        "category_columns":
            category_columns,

        "business_columns":
            business,

        "kpis":
            kpis,

        "products":
            products,

        "categories":
            categories,

        "monthly_trend":
            monthly

    }


# ==========================================================
# INTERACTIVE DASHBOARD FILTER ENGINE
# ==========================================================

def apply_dashboard_filters(
    df,
    filters,
    business
):

    filtered = df.copy()

    # ------------------------------------------------------
    # PRODUCT
    # ------------------------------------------------------

    product_col = business.get("product")

    if product_col and filters.get("product"):

        filtered = filtered[
            filtered[product_col]
            .astype(str)
            .isin(filters["product"])
        ]


    # ------------------------------------------------------
    # CATEGORY
    # ------------------------------------------------------

    category_col = business.get("category")

    if category_col and filters.get("category"):

        filtered = filtered[
            filtered[category_col]
            .astype(str)
            .isin(filters["category"])
        ]


    # ------------------------------------------------------
    # STATE
    # ------------------------------------------------------

    state_col = business.get("state")

    if state_col and filters.get("state"):

        filtered = filtered[
            filtered[state_col]
            .astype(str)
            .isin(filters["state"])
        ]


    # ------------------------------------------------------
    # CITY
    # ------------------------------------------------------

    city_col = business.get("city")

    if city_col and filters.get("city"):

        filtered = filtered[
            filtered[city_col]
            .astype(str)
            .isin(filters["city"])
        ]


    # ------------------------------------------------------
    # ORDER TYPE
    # ------------------------------------------------------

    order_type_col = business.get("order_type")

    if order_type_col and filters.get("order_type"):

        filtered = filtered[
            filtered[order_type_col]
            .astype(str)
            .isin(filters["order_type"])
        ]


    # ------------------------------------------------------
    # CUSTOMER
    # ------------------------------------------------------

    customer_col = business.get("customer")

    if customer_col and filters.get("customer"):

        filtered = filtered[
            filtered[customer_col]
            .astype(str)
            .isin(filters["customer"])
        ]


    # ------------------------------------------------------
    # DATE RANGE
    # ------------------------------------------------------

    date_col = detect_date_column(filtered)

    if date_col:

        filtered[date_col] = pd.to_datetime(
            filtered[date_col],
            errors="coerce"
        )


        # FROM DATE
        if filters.get("date_from"):

            start_date = pd.to_datetime(
                filters["date_from"],
                errors="coerce"
            )

            if pd.notna(start_date):

                filtered = filtered[
                    filtered[date_col] >= start_date
                ]


        # TO DATE
        if filters.get("date_to"):

            end_date = pd.to_datetime(
                filters["date_to"],
                errors="coerce"
            )

            if pd.notna(end_date):

                end_date = (
                    end_date
                    + pd.Timedelta(days=1)
                    - pd.Timedelta(seconds=1)
                )

                filtered = filtered[
                    filtered[date_col] <= end_date
                ]


    return filtered

# ==========================================================
# FILTER OPTIONS
# ==========================================================

def get_filter_options(df, business):

    options = {}


    fields = {

        "product":
            business.get("product"),

        "category":
            business.get("category"),

        "state":
            business.get("state"),

        "city":
            business.get("city"),

        "order_type":
            business.get("order_type"),

        "customer":
            business.get("customer")

    }


    for key, column in fields.items():

        if column and column in df.columns:

            values = (
                df[column]
                .dropna()
                .astype(str)
                .unique()
                .tolist()
            )

            values.sort()

            options[key] = values

        else:

            options[key] = []


    date_column = detect_date_column(
        df
    )


    if date_column:

        dates = pd.to_datetime(
            df[date_column],
            errors="coerce"
        ).dropna()


        if len(dates):

            options["date_min"] = (
                dates.min()
                .strftime("%Y-%m-%d")
            )

            options["date_max"] = (
                dates.max()
                .strftime("%Y-%m-%d")
            )

        else:

            options["date_min"] = None
            options["date_max"] = None

    else:

        options["date_min"] = None
        options["date_max"] = None


    return options


# ==========================================================
# BUILD FILTERED DASHBOARD
# ==========================================================

def build_filtered_dashboard(
    filepath,
    filters
):

    df = load_dashboard_data(
        filepath
    )


    business = detect_business_columns(
        df
    )


    filtered_df = apply_dashboard_filters(
        df,
        filters,
        business
    )


    kpis = create_kpis(
        filtered_df,
        business
    )


    products = product_analysis(
        filtered_df,
        business
    )


    categories = category_analysis(
        filtered_df,
        business
    )


    monthly = monthly_trend(
        filtered_df,
        business
    )


    return {

        "rows":
            len(filtered_df),

        "kpis":
            kpis,

        "products":
            products,

        "categories":
            categories,

        "monthly_trend":
            monthly,

        "active_filters":
            filters

    }

