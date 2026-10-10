import numpy as np
import pandas as pd


def mase_scales(train: pd.DataFrame) -> pd.Series:
    valid = train.dropna(subset=["lag_7"])
    return (valid["y"] - valid["lag_7"]).abs().groupby(valid["product_id"]).mean()


def point_metrics(y: pd.Series, pred: pd.Series) -> dict:
    error = pred - y
    total = y.abs().sum()
    return {
        "mae": float(error.abs().mean()),
        "rmse": float(np.sqrt((error**2).mean())),
        "wape": float(error.abs().sum() / total) if total > 0 else None,
        "bias": float(error.mean()),
    }


def per_product_mase(frame: pd.DataFrame, pred_column: str, scales: pd.Series) -> pd.Series:
    mae = (frame[pred_column] - frame["y"]).abs().groupby(frame["product_id"]).mean()
    return mae / scales.reindex(mae.index)


def evaluate(frame: pd.DataFrame, pred_column: str, scales: pd.Series) -> dict:
    abs_error = (frame[pred_column] - frame["y"]).abs()
    counts = frame.groupby("product_id").size()
    pooled_scale = (scales.reindex(counts.index) * counts).sum()
    return {
        "mase_macro": float(per_product_mase(frame, pred_column, scales).mean()),
        "mase_pooled": float(abs_error.sum() / pooled_scale),
        **point_metrics(frame["y"], frame[pred_column]),
    }
