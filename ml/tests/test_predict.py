import json

import pandas as pd
import pytest

from config import DAILY_SALES_PATH, METADATA_PATH, MODEL_PATH, TEST_PREDICTIONS_PATH
from predict import InputError, run

pytestmark = pytest.mark.skipif(
    not (MODEL_PATH.exists() and METADATA_PATH.exists() and DAILY_SALES_PATH.exists()),
    reason="Requiere ejecutar extract.py y train.py",
)


def product_id_by_name(name: str) -> str:
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    return next(pid for pid, info in metadata["products"].items() if info["name"] == name)


def history_for(product_id: str, cutoff: str, days: int = 400) -> list[dict]:
    sales = pd.read_csv(DAILY_SALES_PATH, parse_dates=["date"])
    sales = sales[(sales.product_id == product_id) & (sales.date <= cutoff)]
    sales = sales[sales.date > pd.Timestamp(cutoff) - pd.Timedelta(days=days)]
    series = sales.set_index("date")["qty"].reindex(pd.date_range(sales.date.min(), cutoff), fill_value=0.0)
    return [{"date": d.date().isoformat(), "qty": float(q)} for d, q in series.items()]


def test_valid_forecast_matches_offline_evaluation():
    product_id = product_id_by_name("Cafe Americano")
    cutoff = "2026-09-26"
    result = run({"productId": product_id, "cutoffDate": cutoff, "horizon": 7, "history": history_for(product_id, cutoff)})
    assert len(result["predictions"]) == 7
    assert all(p["forecast"] >= 0 for p in result["predictions"])
    offline = pd.read_csv(TEST_PREDICTIONS_PATH, parse_dates=["date"])
    offline = offline[(offline.product_id == product_id) & (offline.date > cutoff) & (offline.date <= "2026-10-03")]
    online = [p["forecast"] for p in result["predictions"]]
    assert online == pytest.approx(offline["pred"].round(2).tolist(), abs=0.01)


def test_closed_days_are_forced_to_zero():
    product_id = product_id_by_name("Croissant")
    cutoff = "2026-02-14"
    result = run({"productId": product_id, "cutoffDate": cutoff, "horizon": 7, "history": history_for(product_id, cutoff)})
    closed = {p["date"]: p["forecast"] for p in result["predictions"] if p["isClosed"]}
    assert closed == {"2026-02-16": 0.0, "2026-02-17": 0.0}


@pytest.mark.parametrize(
    "change, message",
    [
        ({"horizon": 30}, "horizonte"),
        ({"productId": "00000000-0000-0000-0000-000000000000"}, "producto"),
        ({"history": [{"date": "2026-09-01", "qty": 3}]}, "al menos"),
        ({"history": [{"date": "2026-09-01", "qty": -3}]}, "mayor o igual a 0"),
        ({"cutoffDate": "no-es-fecha"}, "Fecha inválida"),
    ],
)
def test_invalid_inputs(change, message):
    product_id = product_id_by_name("Capuchino")
    payload = {"productId": product_id, "cutoffDate": "2026-09-26", "horizon": 7, "history": history_for(product_id, "2026-09-26")}
    if "history" in change:
        payload.pop("cutoffDate")
    payload.update(change)
    with pytest.raises(InputError, match=message):
        run(payload)
