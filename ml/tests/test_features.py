from datetime import date

import numpy as np
import pandas as pd

from calendar_bo import closed_days, is_closed
from features import FEATURE_COLUMNS, build_features

PRODUCT = {
    "price": 10.0,
    "launch_date": "2025-01-01",
    "product_code": 0,
    "category_code": 0,
    "discounts": [{"start": "2025-03-10", "end": "2025-03-12", "kind": "Porcentaje", "value": 20}],
}


def make_series(days: int = 120, seed: int = 42) -> pd.Series:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2025-01-01", periods=days, freq="D")
    return pd.Series(rng.poisson(8, size=days).astype(float), index=dates)


def test_closed_days_match_observed_store_closures():
    assert closed_days(2026) == {
        date(2026, 1, 1),
        date(2026, 2, 16),
        date(2026, 2, 17),
        date(2026, 4, 3),
        date(2026, 5, 1),
        date(2026, 12, 25),
    }
    assert is_closed(date(2024, 3, 29))
    assert not is_closed(date(2024, 3, 30))


def test_features_do_not_use_values_after_cutoff():
    series = make_series()
    cutoff = series.index[-8]
    end = cutoff + pd.Timedelta(days=7)
    original = build_features(series[series.index <= cutoff], end, PRODUCT)
    altered_series = series.copy()
    altered_series[altered_series.index > cutoff] = 999.0
    altered = build_features(altered_series, end, PRODUCT)
    window = slice(cutoff + pd.Timedelta(days=1), end)
    pd.testing.assert_frame_equal(original.loc[window, FEATURE_COLUMNS], altered.loc[window, FEATURE_COLUMNS])


def test_lag_7_is_value_one_week_before():
    series = make_series()
    frame = build_features(series, series.index[-1], PRODUCT)
    day = series.index[50]
    assert frame.loc[day, "lag_7"] == series[day - pd.Timedelta(days=7)]
    assert frame.loc[day, "same_dow_mean_4"] == np.mean([series[day - pd.Timedelta(days=k)] for k in (7, 14, 21, 28)])


def test_discount_and_calendar_features():
    series = make_series()
    frame = build_features(series, series.index[-1], PRODUCT)
    assert frame.loc["2025-03-11", "discount_active"] == 1
    assert frame.loc["2025-03-11", "discount_pct"] == 20
    assert frame.loc["2025-03-13", "discount_active"] == 0
    assert frame.loc["2025-03-04", "is_closed"] == 1
    assert frame.loc["2025-03-02", "is_holiday_eve"] == 1
    assert frame.loc["2025-01-31", "days_since_launch"] == 30
