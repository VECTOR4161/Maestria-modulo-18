import os
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ML_DIR / "data"
ARTIFACTS_DIR = ML_DIR / "artifacts"
REPORTS_DIR = ML_DIR / "reports"
FIGURES_DIR = REPORTS_DIR / "figures"

DAILY_SALES_PATH = DATA_DIR / "daily_sales.csv"
PRODUCTS_PATH = DATA_DIR / "products.csv"
DISCOUNTS_PATH = DATA_DIR / "discounts.csv"

MODEL_PATH = ARTIFACTS_DIR / "model.txt"
METADATA_PATH = ARTIFACTS_DIR / "metadata.json"
METRICS_PATH = REPORTS_DIR / "metrics.json"
TEST_PREDICTIONS_PATH = REPORTS_DIR / "test_predictions.csv"
CV_RESULTS_PATH = REPORTS_DIR / "cv_results.csv"
ERROR_ANALYSIS_PATH = REPORTS_DIR / "error_analysis.md"

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cafeteria")

SEED = 42
HORIZON = 7
MIN_HISTORY_DAYS = 28
INFERENCE_HISTORY_DAYS = 400
SEASONAL_PERIOD = 7
DISCONTINUED_AFTER_DAYS = 30

TRAIN_END = "2025-09-30"
VALID_START = "2025-10-01"
VALID_END = "2026-03-31"
TEST_START = "2026-04-01"
CV_FOLDS = 4
