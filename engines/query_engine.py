import pandas as pd


# ==========================================================
# DATAVISION BI
# QUERY ENGINE
# POWER QUERY STYLE TRANSFORMATION ENGINE
# ==========================================================


class QueryEngine:

    def __init__(self, dataframe):

        self.original_df = dataframe.copy()

        self.df = dataframe.copy()

        self.steps = [
            {
                "name": "Source",
                "operation": "Initial dataset"
            }
        ]


    # ======================================================
    # GET COLUMNS
    # ======================================================

    def get_columns(self):

        return list(
            self.df.columns
        )


    # ======================================================
    # PREVIEW
    # ======================================================

    def preview(self, rows=20):

        preview_df = (
            self.df
            .head(rows)
            .copy()
        )

        preview_df = preview_df.fillna("")

        return preview_df.to_dict(
            orient="records"
        )


    # ======================================================
    # GET STEPS
    # ======================================================

    def get_steps(self):

        return self.steps


    # ======================================================
    # REMOVE EMPTY ROWS
    # ======================================================

    def remove_empty_rows(self):

        before = len(
            self.df
        )

        self.df = (
            self.df
            .dropna(
                how="all"
            )
            .reset_index(
                drop=True
            )
        )

        after = len(
            self.df
        )

        removed = before - after

        self.steps.append({

            "name":
                "Remove Empty Rows",

            "operation":
                "Removed completely empty rows",

            "rows_removed":
                removed

        })

        return self.df


    # ======================================================
    # REMOVE COLUMNS
    # ======================================================

    def remove_columns(
        self,
        columns
    ):

        if not columns:

            return self.df


        existing_columns = [

            column

            for column in columns

            if column in self.df.columns

        ]


        if existing_columns:

            self.df = (
                self.df
                .drop(
                    columns=existing_columns
                )
            )


        self.steps.append({

            "name":
                "Remove Columns",

            "operation":
                "Removed selected columns",

            "columns":
                existing_columns

        })


        return self.df


    # ======================================================
    # RENAME COLUMN
    # ======================================================

    def rename_column(
        self,
        old_name,
        new_name
    ):

        if old_name not in self.df.columns:

            raise ValueError(
                f"Column '{old_name}' not found."
            )


        if not new_name:

            raise ValueError(
                "New column name is required."
            )


        if new_name in self.df.columns:

            raise ValueError(
                f"Column '{new_name}' already exists."
            )


        self.df = (
            self.df
            .rename(
                columns={
                    old_name:
                        new_name
                }
            )
        )


        self.steps.append({

            "name":
                "Rename Column",

            "operation":
                "Column renamed",

            "old_name":
                old_name,

            "new_name":
                new_name

        })


        return self.df


    # ======================================================
    # REMOVE DUPLICATES
    # ======================================================

    def remove_duplicates(self):

        before = len(
            self.df
        )

        self.df = (
            self.df
            .drop_duplicates()
            .reset_index(
                drop=True
            )
        )

        after = len(
            self.df
        )

        removed = before - after


        self.steps.append({

            "name":
                "Remove Duplicates",

            "operation":
                "Duplicate rows removed",

            "rows_removed":
                removed

        })


        return self.df


    # ======================================================
    # TRIM TEXT
    # ======================================================

    def trim_text_columns(self):

        text_columns = (
            self.df
            .select_dtypes(
                include=[
                    "object",
                    "string"
                ]
            )
            .columns
        )


        for column in text_columns:

            self.df[column] = (
                self.df[column]
                .astype("string")
                .str.strip()
            )


        self.steps.append({

            "name":
                "Trim Text",

            "operation":
                "Removed leading and trailing spaces",

            "columns":
                list(text_columns)

        })


        return self.df


    # ======================================================
    # CHANGE DATA TYPE
    # ======================================================

    def change_type(
        self,
        column,
        data_type
    ):

        if column not in self.df.columns:

            raise ValueError(
                f"Column '{column}' not found."
            )


        if data_type == "number":

            self.df[column] = pd.to_numeric(
                self.df[column],
                errors="coerce"
            )


        elif data_type == "text":

            self.df[column] = (
                self.df[column]
                .astype("string")
            )


        elif data_type == "date":

            self.df[column] = pd.to_datetime(
                self.df[column],
                errors="coerce"
            )


        else:

            raise ValueError(
                "Unsupported data type."
            )


        self.steps.append({

            "name":
                "Change Data Type",

            "operation":
                f"Changed {column} to {data_type}",

            "column":
                column,

            "data_type":
                data_type

        })


        return self.df


    # ======================================================
    # FILTER ROWS
    # ======================================================

    def filter_rows(
        self,
        column,
        operator,
        value
    ):

        if column not in self.df.columns:

            raise ValueError(
                f"Column '{column}' not found."
            )


        original_rows = len(
            self.df
        )


        series = self.df[column]


        if operator == "equals":

            mask = (
                series.astype(str)
                == str(value)
            )


        elif operator == "contains":

            mask = (
                series.astype(str)
                .str.contains(
                    str(value),
                    case=False,
                    na=False
                )
            )


        elif operator == "starts_with":

            mask = (
                series.astype(str)
                .str.startswith(
                    str(value),
                    na=False
                )
            )


        elif operator == "greater_than":

            numeric_series = pd.to_numeric(
                series,
                errors="coerce"
            )

            numeric_value = float(
                value
            )

            mask = (
                numeric_series
                >
                numeric_value
            )


        elif operator == "less_than":

            numeric_series = pd.to_numeric(
                series,
                errors="coerce"
            )

            numeric_value = float(
                value
            )

            mask = (
                numeric_series
                <
                numeric_value
            )


        else:

            raise ValueError(
                "Unsupported filter operator."
            )


        self.df = (
            self.df[
                mask
            ]
            .reset_index(
                drop=True
            )
        )


        removed = (
            original_rows
            -
            len(self.df)
        )


        self.steps.append({

            "name":
                "Filter Rows",

            "operation":
                "Filtered dataset",

            "column":
                column,

            "operator":
                operator,

            "value":
                value,

            "rows_removed":
                removed

        })


        return self.df


    # ======================================================
    # SORT DATA
    # ======================================================

    def sort_data(
        self,
        column,
        ascending=True
    ):

        if column not in self.df.columns:

            raise ValueError(
                f"Column '{column}' not found."
            )


        self.df = (
            self.df
            .sort_values(
                by=column,
                ascending=ascending
            )
            .reset_index(
                drop=True
            )
        )


        self.steps.append({

            "name":
                "Sort Data",

            "operation":
                "Sorted dataset",

            "column":
                column,

            "ascending":
                ascending

        })


        return self.df


    # ======================================================
    # FILL MISSING VALUES
    # ======================================================

    def fill_missing(
        self,
        column,
        value
    ):

        if column not in self.df.columns:

            raise ValueError(
                f"Column '{column}' not found."
            )


        missing_before = int(
            self.df[column]
            .isna()
            .sum()
        )


        self.df[column] = (
            self.df[column]
            .fillna(value)
        )


        self.steps.append({

            "name":
                "Fill Missing Values",

            "operation":
                "Filled missing values",

            "column":
                column,

            "value":
                value,

            "values_filled":
                missing_before

        })


        return self.df


    # ======================================================
    # RESET QUERY
    # ======================================================

    def reset(self):

        self.df = (
            self.original_df
            .copy()
        )

        self.steps = [

            {
                "name":
                    "Source",

                "operation":
                    "Initial dataset"

            }

        ]

        return self.df


    # ======================================================
    # FINAL DATA
    # ======================================================

    def get_dataframe(self):

        return self.df.copy()