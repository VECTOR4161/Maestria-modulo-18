import pandas as pd

from config import (
    DAILY_SALES_PATH,
    DISCONTINUED_AFTER_DAYS,
    DISCOUNTS_PATH,
    MIN_HISTORY_DAYS,
    PRODUCTS_PATH,
)
from features import build_features


def load_raw() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    sales = pd.read_csv(DAILY_SALES_PATH, parse_dates=["date"])
    products = pd.read_csv(PRODUCTS_PATH)
    discounts = pd.read_csv(DISCOUNTS_PATH, parse_dates=["start", "end"])
    return sales, products, discounts


def build_catalog(sales: pd.DataFrame, products: pd.DataFrame, discounts: pd.DataFrame) -> dict:
    sold = products[products.product_id.isin(sales.product_id.unique())].sort_values("product_id")
    category_codes = {name: code for code, name in enumerate(sorted(sold.category.unique()))}
    last_date = sales.date.max()
    catalog = {}
    for code, row in enumerate(sold.itertuples(index=False)):
        product_sales = sales[sales.product_id == row.product_id]
        last_sale = product_sales.date.max()
        product_discounts = discounts[discounts.product_id == row.product_id]
        catalog[row.product_id] = {
            "name": row.name,
            "category": row.category,
            "type": row.type,
            "price": float(row.price),
            "stocked": bool(row.stocked),
            "batch_size": int(row.batch_size),
            "product_code": code,
            "category_code": category_codes[row.category],
            "launch_date": product_sales.date.min().date().isoformat(),
            "last_sale_date": last_sale.date().isoformat(),
            "discontinued": bool((last_date - last_sale).days > DISCONTINUED_AFTER_DAYS),
            "discounts": [
                {"start": d.start.date().isoformat(), "end": d.end.date().isoformat(), "kind": d.kind, "value": float(d.value)}
                for d in product_discounts.itertuples(index=False)
            ],
        }
    return catalog


def daily_series(product_sales: pd.DataFrame, end_date: pd.Timestamp) -> pd.Series:
    series = product_sales.set_index("date")["qty"].astype(float)
    dates = pd.date_range(series.index.min(), end_date, freq="D")
    return series.reindex(dates, fill_value=0.0)


def build_dataset() -> tuple[pd.DataFrame, dict]:
    sales, products, discounts = load_raw()
    catalog = build_catalog(sales, products, discounts)
    last_date = sales.date.max()
    frames = []
    for product_id, product in catalog.items():
        series = daily_series(sales[sales.product_id == product_id], last_date)
        frame = build_features(series, last_date, product)
        frame = frame.iloc[MIN_HISTORY_DAYS:]
        frame["product_id"] = product_id
        frames.append(frame.reset_index())
    dataset = pd.concat(frames, ignore_index=True)
    return dataset, catalog
