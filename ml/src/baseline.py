import pandas as pd


def seasonal_naive(frame: pd.DataFrame) -> pd.Series:
    return frame["lag_7"].fillna(0.0)


def same_weekday_mean(frame: pd.DataFrame) -> pd.Series:
    return frame["same_dow_mean_4"].fillna(frame["lag_7"]).fillna(0.0)
