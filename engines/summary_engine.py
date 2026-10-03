import pandas as pd
import numpy as np


# ==========================================================
# DATAVISION BI
# PHASE 5 - BUSINESS SUMMARY ENGINE
# ==========================================================


def safe_number(value):
    """
    Convert pandas/numpy values into JSON-safe numbers.
    """

    if value is None:
        return None

    try:

        if pd.isna(value):
            return None

    except Exception:
        pass

    try:
        return float(value)

    except Exception:
        return None


# ==========================================================
# GENERATE BUSINESS SUMMARY
# ==========================================================

def generate_summary(df, business):
    """
    Generate automatic business insights
    from uploaded dataset.
    """

    summary = {

        "success": True,

        "kpis": {},

        "insights": [],

        "warnings": [],

        "recommendations": []

    }


    # ======================================================
    # BUSINESS COLUMNS
    # ======================================================

    sales_col = business.get("sales")

    cost_col = business.get("cost")

    quantity_col = business.get("quantity")

    product_col = business.get("product")

    category_col = business.get("category")

    customer_col = business.get("customer")

    order_col = business.get("order_id")


    # ======================================================
    # EMPTY DATASET CHECK
    # ======================================================

    if df is None or df.empty:

        summary["success"] = False

        summary["warnings"].append(
            "The dataset is empty."
        )

        return summary


    # ======================================================
    # TOTAL SALES
    # ======================================================

    total_sales = 0

    if sales_col and sales_col in df.columns:

        sales = pd.to_numeric(
            df[sales_col],
            errors="coerce"
        )

        total_sales = sales.sum()

        summary["kpis"]["total_sales"] = safe_number(
            total_sales
        )

    else:

        summary["kpis"]["total_sales"] = None

        summary["warnings"].append(
            "Sales column could not be detected."
        )


    # ======================================================
    # TOTAL COST
    # ======================================================

    total_cost = None

    if cost_col and cost_col in df.columns:

        cost = pd.to_numeric(
            df[cost_col],
            errors="coerce"
        )

        total_cost = cost.sum()

        summary["kpis"]["total_cost"] = safe_number(
            total_cost
        )

    else:

        summary["kpis"]["total_cost"] = None


    # ======================================================
    # PROFIT
    # ======================================================

    if (
        sales_col
        and cost_col
        and sales_col in df.columns
        and cost_col in df.columns
    ):

        sales = pd.to_numeric(
            df[sales_col],
            errors="coerce"
        ).fillna(0)

        cost = pd.to_numeric(
            df[cost_col],
            errors="coerce"
        ).fillna(0)

        profit = (
            sales - cost
        ).sum()

        summary["kpis"]["profit"] = safe_number(
            profit
        )


        # --------------------------------------------------
        # PROFIT MARGIN
        # --------------------------------------------------

        if total_sales != 0:

            margin = (
                profit
                /
                total_sales
            ) * 100

            summary["kpis"]["profit_margin"] = safe_number(
                margin
            )

        else:

            summary["kpis"]["profit_margin"] = None


    else:

        summary["kpis"]["profit"] = None

        summary["kpis"]["profit_margin"] = None


    # ======================================================
    # TOTAL QUANTITY
    # ======================================================

    if quantity_col and quantity_col in df.columns:

        quantity = pd.to_numeric(
            df[quantity_col],
            errors="coerce"
        )

        total_quantity = quantity.sum()

        summary["kpis"]["total_units"] = safe_number(
            total_quantity
        )

    else:

        summary["kpis"]["total_units"] = None


    # ======================================================
    # TOTAL ORDERS
    # ======================================================

    if order_col and order_col in df.columns:

        total_orders = (
            df[order_col]
            .nunique(
                dropna=True
            )
        )

    else:

        total_orders = len(df)


    summary["kpis"]["total_orders"] = int(
        total_orders
    )


    # ======================================================
    # UNIQUE CUSTOMERS
    # ======================================================

    if customer_col and customer_col in df.columns:

        customers = (
            df[customer_col]
            .nunique(
                dropna=True
            )
        )

        summary["kpis"]["unique_customers"] = int(
            customers
        )

    else:

        summary["kpis"]["unique_customers"] = None


    # ======================================================
    # AVERAGE ORDER VALUE
    # ======================================================

    if (
        total_orders > 0
        and
        sales_col
        and
        total_sales is not None
    ):

        average_order_value = (
            total_sales
            /
            total_orders
        )

        summary["kpis"]["average_order_value"] = safe_number(
            average_order_value
        )

    else:

        summary["kpis"]["average_order_value"] = None


    # ======================================================
    # INSIGHT - PROFIT
    # ======================================================

    profit = summary["kpis"].get(
        "profit"
    )

    margin = summary["kpis"].get(
        "profit_margin"
    )


    if profit is not None:

        if profit > 0:

            summary["insights"].append(
                f"The business generated a positive profit of {profit:,.2f}."
            )

        elif profit < 0:

            summary["warnings"].append(
                f"The dataset shows a loss of {abs(profit):,.2f}."
            )

        else:

            summary["warnings"].append(
                "Profit is currently zero."
            )


    # ======================================================
    # INSIGHT - PROFIT MARGIN
    # ======================================================

    if margin is not None:

        if margin >= 30:

            summary["insights"].append(
                f"Profit margin is strong at {margin:.2f}%."
            )

        elif margin >= 15:

            summary["insights"].append(
                f"Profit margin is moderate at {margin:.2f}%."
            )

        elif margin >= 0:

            summary["warnings"].append(
                f"Profit margin is relatively low at {margin:.2f}%."
            )

        else:

            summary["warnings"].append(
                f"Profit margin is negative at {margin:.2f}%."
            )


    # ======================================================
    # PRODUCT ANALYSIS
    # ======================================================

    if (
        product_col
        and
        sales_col
        and
        product_col in df.columns
        and
        sales_col in df.columns
    ):

        temp = df.copy()

        temp[sales_col] = pd.to_numeric(
            temp[sales_col],
            errors="coerce"
        ).fillna(0)


        product_sales = (
            temp
            .groupby(
                product_col,
                dropna=False
            )[sales_col]
            .sum()
            .sort_values(
                ascending=False
            )
        )


        if len(product_sales) > 0:

            best_product = (
                product_sales.index[0]
            )

            best_product_sales = (
                product_sales.iloc[0]
            )


            summary["insights"].append(
                f"Top product by sales: {best_product} "
                f"with sales of {best_product_sales:,.2f}."
            )


            if len(product_sales) > 1:

                worst_product = (
                    product_sales.index[-1]
                )

                worst_product_sales = (
                    product_sales.iloc[-1]
                )


                summary["insights"].append(
                    f"Lowest-selling product: {worst_product} "
                    f"with sales of {worst_product_sales:,.2f}."
                )


    # ======================================================
    # CATEGORY ANALYSIS
    # ======================================================

    if (
        category_col
        and
        sales_col
        and
        category_col in df.columns
        and
        sales_col in df.columns
    ):

        temp = df.copy()

        temp[sales_col] = pd.to_numeric(
            temp[sales_col],
            errors="coerce"
        ).fillna(0)


        category_sales = (
            temp
            .groupby(
                category_col,
                dropna=False
            )[sales_col]
            .sum()
            .sort_values(
                ascending=False
            )
        )


        if len(category_sales) > 0:

            top_category = (
                category_sales.index[0]
            )

            top_category_sales = (
                category_sales.iloc[0]
            )


            summary["insights"].append(
                f"Top category by sales: {top_category} "
                f"with sales of {top_category_sales:,.2f}."
            )


    # ======================================================
    # CUSTOMER ANALYSIS
    # ======================================================

    if (
        customer_col
        and
        customer_col in df.columns
    ):

        customer_count = (
            df[customer_col]
            .nunique(
                dropna=True
            )
        )

        if customer_count == 1:

            summary["warnings"].append(
                "Only one unique customer was detected."
            )

        elif customer_count > 0:

            summary["insights"].append(
                f"The dataset contains {customer_count:,} unique customers."
            )


    # ======================================================
    # DATA QUALITY
    # ======================================================

    missing_values = int(
        df.isnull()
        .sum()
        .sum()
    )

    duplicate_rows = int(
        df.duplicated()
        .sum()
    )


    summary["kpis"]["rows"] = int(
        len(df)
    )

    summary["kpis"]["columns"] = int(
        len(df.columns)
    )

    summary["kpis"]["missing_values"] = (
        missing_values
    )

    summary["kpis"]["duplicate_rows"] = (
        duplicate_rows
    )


    if missing_values > 0:

        summary["warnings"].append(
            f"Dataset contains {missing_values:,} missing values."
        )

        summary["recommendations"].append(
            "Review missing values before using the dataset for final reporting."
        )


    if duplicate_rows > 0:

        summary["warnings"].append(
            f"Dataset contains {duplicate_rows:,} duplicate rows."
        )

        summary["recommendations"].append(
            "Remove or investigate duplicate rows."
        )


    # ======================================================
    # RECOMMENDATIONS
    # ======================================================

    if profit is not None:

        if profit < 0:

            summary["recommendations"].append(
                "Review costs, pricing and low-performing products."
            )

        elif margin is not None and margin < 15:

            summary["recommendations"].append(
                "Consider improving pricing, product mix or cost efficiency."
            )


    if product_col is None:

        summary["recommendations"].append(
            "Add a product field to enable product-level analysis."
        )


    if category_col is None:

        summary["recommendations"].append(
            "Add a category field to enable category-level analysis."
        )


    if sales_col is None:

        summary["recommendations"].append(
            "Provide a sales/revenue column for financial analysis."
        )


    # ======================================================
    # FINAL RESULT
    # ======================================================

    return summary