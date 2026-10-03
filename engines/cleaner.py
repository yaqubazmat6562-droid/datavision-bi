
import pandas as pd
import numpy as np
import os


# ==========================================================
# DATAVISION BI
# PHASE 2 - AUTOMATIC DATA CLEANING ENGINE
# ==========================================================


def clean_dataset(filepath, output_folder="cleaned"):
    """
    Automatically clean and profile an Excel/CSV dataset.
    """

    # ------------------------------------------------------
    # CREATE OUTPUT FOLDER
    # ------------------------------------------------------

    os.makedirs(output_folder, exist_ok=True)

    extension = os.path.splitext(filepath)[1].lower()


    # ------------------------------------------------------
    # READ DATA
    # ------------------------------------------------------

    if extension in [".xlsx", ".xls"]:

        excel_file = pd.ExcelFile(filepath)

        sheet_name = excel_file.sheet_names[0]

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


    # ------------------------------------------------------
    # ORIGINAL INFORMATION
    # ------------------------------------------------------

    original_rows = len(df)

    original_columns = len(df.columns)


    # ------------------------------------------------------
    # CLEAN COLUMN NAMES
    # ------------------------------------------------------

    original_column_names = list(df.columns)

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
        .str.replace(" ", "_")
        .str.replace("/", "_")
        .str.replace("-", "_")
    )


    # ------------------------------------------------------
    # REMOVE COMPLETELY EMPTY ROWS
    # ------------------------------------------------------

    empty_rows_removed = int(
        df.isna()
        .all(axis=1)
        .sum()
    )

    df = df.dropna(
        how="all"
    ).copy()


    # ------------------------------------------------------
    # REMOVE COMPLETELY EMPTY COLUMNS
    # ------------------------------------------------------

    empty_columns = [
        column
        for column in df.columns
        if df[column].isna().all()
    ]

    empty_columns_removed = len(
        empty_columns
    )

    if empty_columns:

        df = df.drop(
            columns=empty_columns
        )


    # ------------------------------------------------------
    # TRIM TEXT VALUES
    # ------------------------------------------------------

    text_columns = list(
        df.select_dtypes(
            include=["object"]
        ).columns
    )

    spaces_cleaned = 0


    for column in text_columns:

        before = df[column].copy()

        df[column] = (
            df[column]
            .astype("string")
            .str.strip()
        )

        spaces_cleaned += int(
            (before.astype("string") != df[column])
            .sum()
        )


    # ------------------------------------------------------
    # STANDARDIZE COMMON NULL VALUES
    # ------------------------------------------------------

    null_values = [
        "",
        " ",
        "NA",
        "N/A",
        "na",
        "n/a",
        "NULL",
        "null",
        "None",
        "none",
        "-",
        "--"
    ]

    df = df.replace(
        null_values,
        np.nan
    )


    # ------------------------------------------------------
    # DETECT DATE COLUMNS
    # ------------------------------------------------------

    date_columns = []


    for column in df.columns:

        column_lower = column.lower()

        date_keyword = any(
            word in column_lower
            for word in [
                "date",
                "time",
                "dob",
                "created",
                "updated"
            ]
        )

        if date_keyword:

            converted = pd.to_datetime(
                df[column],
                errors="coerce"
            )

            valid_count = converted.notna().sum()

            if valid_count > 0:

                df[column] = converted

                date_columns.append(
                    column
                )


    # ------------------------------------------------------
    # DETECT NUMERIC COLUMNS
    # ------------------------------------------------------

    numeric_columns = []

    for column in df.columns:

        if pd.api.types.is_numeric_dtype(
            df[column]
        ):

            numeric_columns.append(
                column
            )


    # ------------------------------------------------------
    # TRY TO CONVERT NUMERIC TEXT
    # ------------------------------------------------------

    for column in df.columns:

        if column in date_columns:
            continue

        if df[column].dtype == "object":

            converted = pd.to_numeric(
                df[column],
                errors="coerce"
            )

            valid_ratio = (
                converted.notna().sum()
                /
                max(len(df), 1)
            )

            if valid_ratio >= 0.80:

                df[column] = converted

                if column not in numeric_columns:

                    numeric_columns.append(
                        column
                    )


    # ------------------------------------------------------
    # DUPLICATE ROWS
    # ------------------------------------------------------

    duplicate_rows = int(
        df.duplicated().sum()
    )


    # ------------------------------------------------------
    # DUPLICATE ORDER NUMBER
    # ------------------------------------------------------

    order_number_column = None

    possible_order_columns = [
        "Order_Number",
        "OrderNumber",
        "Order_Number_",
        "OrderID",
        "Order_Id",
        "Order_ID"
    ]


    for column in possible_order_columns:

        if column in df.columns:

            order_number_column = column

            break


    duplicate_order_numbers = 0


    if order_number_column:

        duplicate_order_numbers = int(
            df[
                order_number_column
            ]
            .duplicated()
            .sum()
        )


    # ------------------------------------------------------
    # NEGATIVE NUMERIC VALUES
    # ------------------------------------------------------

    negative_values = {}


    for column in numeric_columns:

        count = int(
            (
                df[column] < 0
            ).sum()
        )

        if count > 0:

            negative_values[column] = count


    # ------------------------------------------------------
    # OUTLIER DETECTION
    # IQR METHOD
    # ------------------------------------------------------

    outliers = {}


    for column in numeric_columns:

        series = df[column].dropna()

        if len(series) < 5:
            continue


        q1 = series.quantile(0.25)

        q3 = series.quantile(0.75)

        iqr = q3 - q1


        if iqr == 0:
            continue


        lower_limit = (
            q1 - 1.5 * iqr
        )

        upper_limit = (
            q3 + 1.5 * iqr
        )


        count = int(
            (
                (df[column] < lower_limit)
                |
                (df[column] > upper_limit)
            ).sum()
        )


        if count > 0:

            outliers[column] = {
                "count": count,
                "lower_limit": float(
                    lower_limit
                ),
                "upper_limit": float(
                    upper_limit
                )
            }


    # ------------------------------------------------------
    # MISSING VALUES
    # ------------------------------------------------------

    missing_values = (
        df.isna()
        .sum()
        .to_dict()
    )


    total_missing = int(
        df.isna()
        .sum()
        .sum()
    )


    # ------------------------------------------------------
    # DATA QUALITY SCORE
    # ------------------------------------------------------

    total_cells = (
        len(df)
        *
        len(df.columns)
    )


    if total_cells == 0:

        quality_score = 0

    else:

        missing_ratio = (
            total_missing
            /
            total_cells
        )

        duplicate_ratio = (
            duplicate_rows
            /
            max(len(df), 1)
        )

        quality_score = 100 - (
            missing_ratio * 50
            +
            duplicate_ratio * 50
        )


        quality_score = max(
            0,
            min(
                100,
                quality_score
            )
        )


    # ------------------------------------------------------
    # SAVE CLEANED DATA
    # ------------------------------------------------------

    filename = os.path.basename(
        filepath
    )

    base_name = os.path.splitext(
        filename
    )[0]


    output_file = os.path.join(
        output_folder,
        f"{base_name}_cleaned.xlsx"
    )


    df.to_excel(
        output_file,
        index=False
    )


    # ------------------------------------------------------
    # CLEANING REPORT
    # ------------------------------------------------------

    report = {

        "original_rows":
            original_rows,

        "final_rows":
            len(df),

        "original_columns":
            original_columns,

        "final_columns":
            len(df.columns),

        "empty_rows_removed":
            empty_rows_removed,

        "empty_columns_removed":
            empty_columns_removed,

        "spaces_cleaned":
            spaces_cleaned,

        "duplicate_rows":
            duplicate_rows,

        "duplicate_order_numbers":
            duplicate_order_numbers,

        "missing_values":
            missing_values,

        "total_missing":
            total_missing,

        "negative_values":
            negative_values,

        "outliers":
            outliers,

        "numeric_columns":
            numeric_columns,

        "date_columns":
            date_columns,

        "quality_score":
            round(
                quality_score,
                2
            ),

        "output_file":
            output_file,

        "columns":
            list(df.columns)

    }


    return df, report

