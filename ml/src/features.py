import numpy as np
import pandas as pd

from calendar_bo import closed_mask
from config import SEASONAL_PERIOD

FEATURE_COLUMNS = [
    "product_code",
    "category_code",
    "lag_7",
    "lag_14",
    "lag_21",
    "lag_28",
    "lag_364",
    "roll_mean_7",
    "roll_mean_28",
    "roll_std_28",
    "same_dow_mean_4",
    "day_of_week",
    "day_of_month",
    "month",
    "week_of_year",
    "is_closed",
    "is_holiday_eve",
    "is_school_vacation",
    "discount_active",
    "discount_pct",
    "days_since_launch",
]

CATEGORICAL_COLUMNS = ["product_code", "category_code"]

SCHOOL_VACATION_MONTHS = {1, 2, 7}


def discount_percentage(dates: pd.DatetimeIndex, discounts: list[dict], price: float) -> pd.Series:
    pct = pd.Series(0.0, index=dates)
    for discount in discounts:
        start = pd.Timestamp(discount["start"])
        end = pd.Timestamp(discount["end"])
        value = float(discount["value"])
        if discount["kind"] != "Porcentaje":
            value = 100.0 * value / price if price > 0 else 0.0
        active = (dates >= start) & (dates <= end)
        pct[active] = np.maximum(pct[active], value)
    return pct


def build_features(series: pd.Series, end_date: pd.Timestamp, product: dict) -> pd.DataFrame:
    dates = pd.date_range(series.index.min(), end_date, freq="D")
    y = series.reindex(dates)
    shifted = y.shift(SEASONAL_PERIOD)

    frame = pd.DataFrame(index=dates)
    frame.index.name = "date"
    frame["y"] = y
    for lag in (7, 14, 21, 28, 364):
        frame[f"lag_{lag}"] = y.shift(lag)
    frame["roll_mean_7"] = shifted.rolling(7, min_periods=1).mean()
    frame["roll_mean_28"] = shifted.rolling(28, min_periods=1).mean()
    frame["roll_std_28"] = shifted.rolling(28, min_periods=2).std()
    frame["same_dow_mean_4"] = frame[["lag_7", "lag_14", "lag_21", "lag_28"]].mean(axis=1)

    frame["day_of_week"] = dates.dayofweek
    frame["day_of_month"] = dates.day
    frame["month"] = dates.month
    frame["week_of_year"] = dates.isocalendar().week.astype(int).to_numpy()
    frame["is_closed"] = closed_mask(dates).astype(int).to_numpy()
    frame["is_holiday_eve"] = closed_mask(dates + pd.Timedelta(days=1)).astype(int).to_numpy()
    frame["is_school_vacation"] = dates.month.isin(SCHOOL_VACATION_MONTHS).astype(int)

    pct = discount_percentage(dates, product.get("discounts", []), product["price"])
    frame["discount_active"] = (pct > 0).astype(int)
    frame["discount_pct"] = pct

    frame["days_since_launch"] = (dates - pd.Timestamp(product["launch_date"])).days
    frame["product_code"] = product["product_code"]
    frame["category_code"] = product["category_code"]
    return frame
