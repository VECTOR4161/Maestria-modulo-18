import json
from datetime import datetime, timezone

import lightgbm as lgb
import numpy as np
import pandas as pd

from baseline import same_weekday_mean, seasonal_naive
from config import (
    ARTIFACTS_DIR,
    CV_FOLDS,
    CV_RESULTS_PATH,
    HORIZON,
    INFERENCE_HISTORY_DAYS,
    METADATA_PATH,
    METRICS_PATH,
    MIN_HISTORY_DAYS,
    MODEL_PATH,
    REPORTS_DIR,
    SEED,
    TEST_PREDICTIONS_PATH,
    TEST_START,
    TRAIN_END,
    VALID_END,
    VALID_START,
)
from dataset import build_dataset
from features import CATEGORICAL_COLUMNS, FEATURE_COLUMNS
from metrics import evaluate, mase_scales, per_product_mase, point_metrics

BASE_PARAMS = {
    "learning_rate": 0.03,
    "min_data_in_leaf": 50,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 1,
    "metric": "l1",
    "seed": SEED,
    "deterministic": True,
    "force_row_wise": True,
    "num_threads": 4,
    "verbose": -1,
}

SEARCH_SPACE = [
    {"objective": objective, "num_leaves": leaves}
    for objective in ("regression_l1", "tweedie", "regression")
    for leaves in (15, 31)
]

MAX_ROUNDS = 3000
EARLY_STOPPING_ROUNDS = 100

METHODS = {
    "lightgbm": "pred",
    "seasonal_naive": "seasonal_naive",
    "same_weekday_mean": "same_weekday_mean",
}


def to_lgb_dataset(frame: pd.DataFrame) -> lgb.Dataset:
    return lgb.Dataset(
        frame[FEATURE_COLUMNS],
        label=frame["y"],
        categorical_feature=CATEGORICAL_COLUMNS,
        free_raw_data=False,
    )


def predict(model: lgb.Booster, frame: pd.DataFrame, num_iteration: int | None = None) -> np.ndarray:
    return np.clip(model.predict(frame[FEATURE_COLUMNS], num_iteration=num_iteration), 0.0, None)


def cv_folds(frame: pd.DataFrame):
    validation_dates = pd.date_range(VALID_START, VALID_END, freq="D")
    for chunk in np.array_split(validation_dates, CV_FOLDS):
        train = frame[frame.date < chunk[0]]
        valid = frame[(frame.date >= chunk[0]) & (frame.date <= chunk[-1])]
        yield train, valid


def cross_validate(frame: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for config in SEARCH_SPACE:
        params = {**BASE_PARAMS, **config}
        for fold, (train, valid) in enumerate(cv_folds(frame)):
            model = lgb.train(
                params,
                to_lgb_dataset(train),
                num_boost_round=MAX_ROUNDS,
                valid_sets=[to_lgb_dataset(valid)],
                callbacks=[lgb.early_stopping(EARLY_STOPPING_ROUNDS, verbose=False)],
            )
            scored = valid.assign(pred=predict(model, valid, model.best_iteration))
            scores = evaluate(scored, "pred", mase_scales(train))
            rows.append({**config, "fold": fold, "best_iteration": model.best_iteration, **scores})
            print(f"{config} fold={fold} iter={model.best_iteration} mase={scores['mase_macro']:.4f}")
    return pd.DataFrame(rows)


def select_config(cv_results: pd.DataFrame) -> tuple[dict, int]:
    summary = cv_results.groupby(["objective", "num_leaves"]).agg(
        mase=("mase_macro", "mean"), best_iteration=("best_iteration", "mean")
    )
    best = summary["mase"].idxmin()
    rounds = int(round(summary.loc[best, "best_iteration"]))
    return {"objective": best[0], "num_leaves": int(best[1])}, max(rounds, 50)


def waste_simulation(test: pd.DataFrame, catalog: dict) -> dict:
    stocked = test[test.product_id.map(lambda pid: catalog[pid]["stocked"])]
    result = {"products": sorted({catalog[pid]["name"] for pid in stocked.product_id}), "days": int(stocked.date.nunique())}
    for method, column in METHODS.items():
        planned = np.ceil(stocked[column] - 1e-9)
        surplus = (planned - stocked["y"]).clip(lower=0).sum()
        shortage = (stocked["y"] - planned).clip(lower=0).sum()
        result[method] = {"surplus_units": float(surplus), "shortage_units": float(shortage)}
    result["actual_units"] = float(stocked["y"].sum())
    return result


def main() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    dataset, catalog = build_dataset()
    open_days = dataset[dataset.is_closed == 0].copy()
    development = open_days[open_days.date <= VALID_END]
    print(f"dataset rows={len(dataset)} open={len(open_days)} development={len(development)}")

    cv_results = cross_validate(development)
    cv_results.to_csv(CV_RESULTS_PATH, index=False)
    best_config, num_rounds = select_config(cv_results)
    params = {**BASE_PARAMS, **best_config}
    print(f"selected {best_config} rounds={num_rounds}")

    model = lgb.train(params, to_lgb_dataset(development), num_boost_round=num_rounds)
    model.save_model(str(MODEL_PATH))

    test = dataset[dataset.date >= TEST_START].copy()
    test["pred"] = predict(model, test)
    test.loc[test.is_closed == 1, "pred"] = 0.0
    test["seasonal_naive"] = seasonal_naive(test)
    test["same_weekday_mean"] = same_weekday_mean(test)
    test["name"] = test.product_id.map(lambda pid: catalog[pid]["name"])
    test["discontinued"] = test.product_id.map(lambda pid: catalog[pid]["discontinued"])
    test["lag_7_closed"] = test.groupby("product_id")["is_closed"].shift(7).fillna(0).astype(int)
    test.to_csv(TEST_PREDICTIONS_PATH, index=False)

    scored = test[(test.is_closed == 0) & (~test.discontinued)]
    discontinued = test[(test.is_closed == 0) & (test.discontinued)]
    scales = mase_scales(development)

    overall = {method: evaluate(scored, column, scales) for method, column in METHODS.items()}
    per_product = []
    mase_by_method = {method: per_product_mase(scored, column, scales) for method, column in METHODS.items()}
    for product_id, group in scored.groupby("product_id"):
        row = {"product_id": product_id, "name": catalog[product_id]["name"], "rows": int(len(group))}
        for method, column in METHODS.items():
            row[f"mase_{method}"] = float(mase_by_method[method][product_id])
            row[f"mae_{method}"] = float((group[column] - group["y"]).abs().mean())
        row["bias_lightgbm"] = float((group["pred"] - group["y"]).mean())
        per_product.append(row)

    discontinued_report = [
        {
            "product_id": product_id,
            "name": catalog[product_id]["name"],
            "last_sale_date": catalog[product_id]["last_sale_date"],
            "rows": int(len(group)),
            "mean_actual": float(group["y"].mean()),
            "lightgbm": point_metrics(group["y"], group["pred"]),
            "seasonal_naive": point_metrics(group["y"], group["seasonal_naive"]),
        }
        for product_id, group in discontinued.groupby("product_id")
    ]

    importance = sorted(
        zip(FEATURE_COLUMNS, model.feature_importance(importance_type="gain")),
        key=lambda item: item[1],
        reverse=True,
    )

    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    last_date = dataset.date.max().date().isoformat()
    model_version = f"lgbm-{datetime.now(timezone.utc):%Y%m%d%H%M}"
    ranges = {
        "train": [dataset.date.min().date().isoformat(), TRAIN_END],
        "validation": [VALID_START, VALID_END],
        "test": [TEST_START, last_date],
    }

    metrics = {
        "model_version": model_version,
        "created_at": created_at,
        "ranges": ranges,
        "selected_params": best_config,
        "num_boost_round": num_rounds,
        "test_rows": int(len(scored)),
        "products_evaluated": int(scored.product_id.nunique()),
        "excluded_closed_days": int(test[test.is_closed == 1].date.nunique()),
        "overall": overall,
        "success": overall["lightgbm"]["mase_macro"] < 1,
        "per_product": per_product,
        "discontinued": discontinued_report,
        "waste_simulation": waste_simulation(scored, catalog),
        "feature_importance": [{"feature": f, "gain": float(g)} for f, g in importance],
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    metadata = {
        "model_version": model_version,
        "created_at": created_at,
        "lightgbm_version": lgb.__version__,
        "params": params,
        "num_boost_round": num_rounds,
        "feature_columns": FEATURE_COLUMNS,
        "categorical_columns": CATEGORICAL_COLUMNS,
        "trained_until": VALID_END,
        "last_data_date": last_date,
        "horizon": HORIZON,
        "min_history_days": MIN_HISTORY_DAYS,
        "inference_history_days": INFERENCE_HISTORY_DAYS,
        "products": {pid: {k: v for k, v in info.items() if k != "discounts"} for pid, info in catalog.items()},
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")

    for method, scores in overall.items():
        print(f"{method:>18}: " + ", ".join(f"{k}={v:.4f}" for k, v in scores.items()))
    print(f"success (MASE < 1): {metrics['success']}")


if __name__ == "__main__":
    main()
