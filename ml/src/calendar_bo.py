from datetime import date, timedelta

import pandas as pd


def easter_sunday(year: int) -> date:
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month, day = divmod(h + l - 7 * m + 114, 31)
    return date(year, month, day + 1)


def closed_days(year: int) -> set[date]:
    easter = easter_sunday(year)
    return {
        date(year, 1, 1),
        easter - timedelta(days=48),
        easter - timedelta(days=47),
        easter - timedelta(days=2),
        date(year, 5, 1),
        date(year, 12, 25),
    }


def closed_mask(dates: pd.DatetimeIndex) -> pd.Series:
    years = range(dates.year.min() - 1, dates.year.max() + 2)
    closed = {pd.Timestamp(d) for y in years for d in closed_days(y)}
    return pd.Series(dates.isin(list(closed)), index=dates)


def is_closed(day: date) -> bool:
    return day in closed_days(day.year)
