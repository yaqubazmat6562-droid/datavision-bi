# utils/formatters.py
import pandas as pd
import numpy as np


def safe_number(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def safe_int(value):
    num = safe_number(value)
    return int(num) if num is not None else None


def df_to_records(df):
    if df is None or df.empty:
        return []
    df = df.copy()
    df = df.replace({np.nan: None})
    return df.to_dict(orient="records")
