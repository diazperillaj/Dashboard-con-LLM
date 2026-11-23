"""Data loading and in-memory management service."""

import logging
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)


class DataService:
    """Loads the availability CSV once at startup and keeps it in memory.

    All derived columns (date, hour, weekday, week, month, weekday_name)
    are added at load time so downstream services never recompute them.
    """

    def __init__(self, csv_path: str) -> None:
        """
        Args:
            csv_path: Absolute or relative path to availability.csv.
        """
        self._csv_path = Path(csv_path)
        self._df: pd.DataFrame | None = None

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def load(self) -> None:
        """Parse the CSV, coerce types, and build derived columns.

        Raises:
            FileNotFoundError: The CSV file does not exist at the given path.
            ValueError: Required columns are absent or unparseable.
        """
        if not self._csv_path.exists():
            raise FileNotFoundError(
                f"CSV file not found: {self._csv_path.resolve()}"
            )

        logger.info("Loading dataset from '%s' ...", self._csv_path)

        df = pd.read_csv(
            self._csv_path,
            parse_dates=["timestamp"],
            dtype={"value": "int64"},
        )

        missing = {"timestamp", "value"} - set(df.columns)
        if missing:
            raise ValueError(f"CSV is missing required columns: {missing}")

        df = df.sort_values("timestamp").reset_index(drop=True)

        # Derived temporal columns
        df["date"] = df["timestamp"].dt.date
        df["hour"] = df["timestamp"].dt.hour
        df["weekday"] = df["timestamp"].dt.dayofweek          # 0 = Monday
        df["weekday_name"] = df["timestamp"].dt.day_name()    # e.g. "Monday"
        df["week"] = df["timestamp"].dt.isocalendar().week.astype(int)
        df["month"] = df["timestamp"].dt.month

        self._df = df

        logger.info(
            "Dataset ready — %d records | range: %s → %s",
            len(df),
            df["timestamp"].iloc[0].isoformat(),
            df["timestamp"].iloc[-1].isoformat(),
        )

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def get_dataframe(self) -> pd.DataFrame:
        """Return the full in-memory DataFrame (read-only by convention).

        Raises:
            RuntimeError: If ``load()`` has not been called yet.
        """
        if self._df is None:
            raise RuntimeError(
                "DataService has not been initialised — call load() first."
            )
        return self._df

    @property
    def record_count(self) -> int:
        """Total number of rows in the loaded dataset."""
        return len(self._df) if self._df is not None else 0

    @property
    def date_range(self) -> tuple[str, str]:
        """(earliest_timestamp, latest_timestamp) as ISO-8601 strings."""
        if self._df is None:
            return ("N/A", "N/A")
        return (
            self._df["timestamp"].iloc[0].isoformat(),
            self._df["timestamp"].iloc[-1].isoformat(),
        )
