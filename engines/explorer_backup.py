
import pandas as pd
import numpy as np


# ==========================================================
# DATAVISION BI
# PHASE 3 - ADVANCED DATA EXPLORER
# ==========================================================


def load_dataset(filepath):

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
# DATASET OVERVIEW
# ==========================================================

def get_dataset_overview(filepath):

    df = load_dataset(filepath)

    rows = len(df)

    columns = len(df.columns)

    memory_usage = (
        df.memory_usage(
            deep=True
        ).sum()
        / 1024
        / 1024
    )


    return {

        "rows": rows,

        "columns": columns,

        "memory_mb":
            round(
                memory_usage,
                2
            ),

        "duplicate_rows":
            int(
                df.duplicated().sum()
            ),

        "missing_values":
            int(
                df.isna()
                .sum()
                .sum()
            ),

        "column_names":
            list(
                df.columns
            )

    }


# ==========================================================
# COLUMN PROFILE
# ==========================================================

def get_column_profile(filepath):

    df = load_dataset(filepath)

    profile = []


    for column in df.columns:

        series = df[column]

        missing = int(
            series.isna().sum()
        )

        total = len(series)

        missing_percent = (
            missing / total * 100
            if total > 0
            else 0
        )


        unique = int(
            series.nunique(
                dropna=True
            )
        )


        data_type = str(
            series.dtype
        )


        column_info = {

            "column":
                column,

            "data_type":
                data_type,

            "total":
                total,

            "missing":
                missing,

            "missing_percent":
                round(
                    missing_percent,
                    2
                ),

            "unique":
                unique

        }


        # --------------------------------------
        # NUMERIC INFORMATION
        # --------------------------------------

        if pd.api.types.is_numeric_dtype(
            series
        ):

            clean_series = series.dropna()


            if len(clean_series) > 0:

                column_info.update({

                    "min":
                        round(
                            float(
                                clean_series.min()
                            ),
                            2
                        ),

                    "max":
                        round(
                            float(
                                clean_series.max()
                            ),
                            2
                        ),

                    "mean":
                        round(
                            float(
                                clean_series.mean()
                            ),
                            2
                        ),

                    "median":
                        round(
                            float(
                                clean_series.median()
                            ),
                            2
                        ),

                    "std":
                        round(
                            float(
                                clean_series.std()
                            ),
                            2
                        )

                })


                # ------------------------------
                # OUTLIERS - IQR
                # ------------------------------

                q1 = clean_series.quantile(
                    0.25
                )

                q3 = clean_series.quantile(
                    0.75
                )

                iqr = q3 - q1


                if iqr > 0:

                    lower = (
                        q1 - 1.5 * iqr
                    )

                    upper = (
                        q3 + 1.5 * iqr
                    )


                    outlier_count = int(
                        (
                            (clean_series < lower)
                            |
                            (clean_series > upper)
                        ).sum()
                    )

                else:

                    outlier_count = 0


                column_info[
                    "outliers"
                ] = outlier_count


        # --------------------------------------
        # TEXT INFORMATION
        # --------------------------------------

        else:

            top_values = (
                series
                .value_counts(
                    dropna=True
                )
                .head(10)
            )


            column_info[
                "top_values"
            ] = [

                {
                    "value":
                        str(index),

                    "count":
                        int(count)

                }

                for index, count
                in top_values.items()

            ]


        profile.append(
            column_info
        )


    return profile


# ==========================================================
# UNIQUE VALUES
# ==========================================================

def get_unique_values(
    filepath,
    column,
    limit=100
):

    df = load_dataset(filepath)


    if column not in df.columns:

        raise ValueError(
            f"Column '{column}' not found."
        )


    values = (
        df[column]
        .dropna()
        .astype(str)
        .value_counts()
        .head(limit)
    )


    result = []


    for value, count in values.items():

        result.append({

            "value":
                value,

            "count":
                int(count)

        })


    return result


# ==========================================================
# FILTER DATA
# ==========================================================

def filter_data(
    filepath,
    column=None,
    search=None,
    limit=100
):

    df = load_dataset(filepath)


    if column and search:

        if column not in df.columns:

            raise ValueError(
                f"Column '{column}' not found."
            )


        mask = (
            df[column]
            .astype(str)
            .str.contains(
                search,
                case=False,
                na=False
            )
        )


        df = df[mask]


    df = df.head(limit)


    df = df.replace(
        {
            np.nan: ""
        }
    )


    return {

        "rows":
            len(df),

        "data":
            df.to_dict(
                orient="records"
            )

    }

