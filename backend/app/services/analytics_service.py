"""Analytics service — all metric computations over the in-memory DataFrame."""

import logging
from datetime import date, timedelta
from typing import Any

import numpy as np
import pandas as pd

from app.services.data_service import DataService

logger = logging.getLogger(__name__)

_WEEKDAY_ES: dict[str, str] = {
    "Monday": "Lunes",
    "Tuesday": "Martes",
    "Wednesday": "Miércoles",
    "Thursday": "Jueves",
    "Friday": "Viernes",
    "Saturday": "Sábado",
    "Sunday": "Domingo",
}


class AnalyticsService:
    """Computes all dashboard metrics.  Methods that accept a DataFrame
    expect it to be already filtered; call ``get_filtered_data`` first.
    """

    def __init__(self, data_service: DataService) -> None:
        """
        Args:
            data_service: Initialised DataService instance.
        """
        self._data = data_service

    # ------------------------------------------------------------------
    # Filtering
    # ------------------------------------------------------------------

    def get_filtered_data(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> pd.DataFrame:
        """Filter the dataset by an inclusive date range.

        Args:
            start_date: Keep records on or after this date.
            end_date: Keep records on or before this date.

        Returns:
            Filtered (non-copied) DataFrame slice.

        Raises:
            ValueError: No records match the requested range.
        """
        df = self._data.get_dataframe()

        if start_date is not None:
            df = df[df["date"] >= start_date]
        if end_date is not None:
            df = df[df["date"] <= end_date]

        if df.empty:
            raise ValueError(
                "No data found for the selected date range. "
                "Try widening the filter."
            )

        return df

    # ------------------------------------------------------------------
    # Scalar metrics
    # ------------------------------------------------------------------

    def get_current(self, df: pd.DataFrame) -> int:
        """Last recorded store count."""
        return int(df["value"].iloc[-1])

    def get_average(self, df: pd.DataFrame) -> float:
        """Arithmetic mean of store counts, rounded to 2 decimal places."""
        return round(float(df["value"].mean()), 2)

    def get_maximum(self, df: pd.DataFrame) -> dict[str, Any]:
        """Peak value and its timestamp.

        Returns:
            Dict with keys ``value`` (int) and ``timestamp`` (Timestamp).
        """
        idx = int(df["value"].idxmax())
        return {
            "value": int(df.at[idx, "value"]),
            "timestamp": df.at[idx, "timestamp"],
        }

    def get_minimum(self, df: pd.DataFrame) -> dict[str, Any]:
        """Lowest value and its timestamp.

        Returns:
            Dict with keys ``value`` (int) and ``timestamp`` (Timestamp).
        """
        idx = int(df["value"].idxmin())
        return {
            "value": int(df.at[idx, "value"]),
            "timestamp": df.at[idx, "timestamp"],
        }

    def get_variation_percent(self, df: pd.DataFrame) -> float:
        """Percentage change from the first to the last reading.

        Formula: ``((last - first) / first) * 100``
        """
        first = float(df["value"].iloc[0])
        last = float(df["value"].iloc[-1])
        if first == 0.0:
            return 0.0
        return round(((last - first) / first) * 100, 4)

    def get_volatility(self, df: pd.DataFrame) -> float:
        """Standard deviation of store counts."""
        return round(float(df["value"].std()), 2)

    # ------------------------------------------------------------------
    # Series / grouped metrics
    # ------------------------------------------------------------------

    def get_timeseries(self, df: pd.DataFrame) -> list[dict[str, Any]]:
        """Full time series as ``[{timestamp, value}, ...]``."""
        subset = df[["timestamp", "value"]]
        return [
            {"timestamp": ts, "value": int(val)}
            for ts, val in zip(subset["timestamp"], subset["value"])
        ]

    def get_hourly_average(self, df: pd.DataFrame) -> list[dict[str, Any]]:
        """Mean store count per hour of day (0–23)."""
        grouped = (
            df.groupby("hour", sort=True)["value"]
            .mean()
            .reset_index()
        )
        return [
            {"hour": int(row["hour"]), "average": round(float(row["value"]), 2)}
            for _, row in grouped.iterrows()
        ]

    def get_heatmap_data(self, df: pd.DataFrame) -> list[dict[str, Any]]:
        """Mean store count per (date, hour) bucket."""
        grouped = (
            df.groupby(["date", "hour"], sort=True)["value"]
            .mean()
            .reset_index()
        )
        return [
            {
                "date": row["date"],
                "hour": int(row["hour"]),
                "value": round(float(row["value"]), 2),
            }
            for _, row in grouped.iterrows()
        ]

    def get_distribution(
        self, df: pd.DataFrame, bins: int = 20
    ) -> dict[str, list]:
        """Histogram distribution via ``numpy.histogram``.

        Args:
            df: Filtered DataFrame.
            bins: Desired number of bins (default 20).

        Returns:
            ``{"bins": [edge_0, ..., edge_n], "counts": [c_0, ..., c_{n-1}]}``
        """
        counts, bin_edges = np.histogram(df["value"].to_numpy(), bins=bins)
        return {
            "bins": [round(float(b), 2) for b in bin_edges.tolist()],
            "counts": counts.tolist(),
        }

    def get_daily_summary(self, df: pd.DataFrame) -> list[dict[str, Any]]:
        """Per-day aggregates: average, max, min, volatility, record count."""
        grouped = (
            df.groupby("date", sort=True)["value"]
            .agg(average="mean", maximum="max", minimum="min", volatility="std", records="count")
            .reset_index()
        )
        return [
            {
                "date": row["date"],
                "average": round(float(row["average"]), 2),
                "maximum": int(row["maximum"]),
                "minimum": int(row["minimum"]),
                "volatility": round(
                    float(row["volatility"]) if not pd.isna(row["volatility"]) else 0.0,
                    2,
                ),
                "records": int(row["records"]),
            }
            for _, row in grouped.iterrows()
        ]

    def get_peak_hours(
        self, df: pd.DataFrame, top_n: int = 3
    ) -> list[dict[str, Any]]:
        """Hours with the highest average store availability."""
        hourly = df.groupby("hour")["value"].mean().sort_values(ascending=False)
        return [
            {"hour": int(hour), "average": round(float(avg), 2)}
            for hour, avg in hourly.head(top_n).items()
        ]

    def get_low_hours(
        self, df: pd.DataFrame, top_n: int = 3
    ) -> list[dict[str, Any]]:
        """Hours with the lowest average store availability."""
        hourly = df.groupby("hour")["value"].mean().sort_values(ascending=True)
        return [
            {"hour": int(hour), "average": round(float(avg), 2)}
            for hour, avg in hourly.head(top_n).items()
        ]

    def compare_periods(
        self,
        start_date: date,
        end_date: date,
    ) -> dict[str, Any]:
        """Compare the requested period with the immediately preceding one of equal length.

        Args:
            start_date: First day of the current period.
            end_date: Last day of the current period.

        Returns:
            Dict with current/previous period stats and percentage change.
            ``change_percent`` is ``None`` when no prior data exists.
        """
        period_days = (end_date - start_date).days + 1
        prev_end = start_date - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_days - 1)

        current_df = self.get_filtered_data(start_date, end_date)
        current_avg = float(current_df["value"].mean())

        try:
            prev_df = self.get_filtered_data(prev_start, prev_end)
            prev_avg: float | None = float(prev_df["value"].mean())
            change_percent: float | None = (
                round(((current_avg - prev_avg) / prev_avg) * 100, 2)
                if prev_avg and prev_avg != 0
                else 0.0
            )
        except ValueError:
            prev_avg = None
            change_percent = None

        return {
            "current_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "average": round(current_avg, 2),
            },
            "previous_period": {
                "start": prev_start.isoformat(),
                "end": prev_end.isoformat(),
                "average": round(prev_avg, 2) if prev_avg is not None else None,
            },
            "change_percent": change_percent,
        }

    def generate_insights(self, df: pd.DataFrame) -> list[str]:
        """Produce a list of human-readable analytical insights.

        Covers: overall average, period variation, peak/low hours,
        best/worst days, best weekday, and stability level.

        Args:
            df: Filtered DataFrame.

        Returns:
            List of insight strings in Spanish.
        """
        insights: list[str] = []

        avg = df["value"].mean()
        insights.append(
            f"La disponibilidad promedio en el período fue de {avg:,.0f} tiendas."
        )

        # Direction of variation
        first = float(df["value"].iloc[0])
        last = float(df["value"].iloc[-1])
        if first != 0:
            variation = ((last - first) / first) * 100
            direction = "incrementó" if variation >= 0 else "redujo"
            insights.append(
                f"La disponibilidad se {direction} un {abs(variation):.2f}% "
                "entre el inicio y el fin del período."
            )

        # Peak and low hour
        hourly_avg = df.groupby("hour")["value"].mean()
        peak_hour = int(hourly_avg.idxmax())
        peak_val = hourly_avg.max()
        low_hour = int(hourly_avg.idxmin())
        low_val = hourly_avg.min()

        insights.append(
            f"La hora con mayor disponibilidad fue las {peak_hour:02d}:00 h "
            f"con {peak_val:,.0f} tiendas en promedio."
        )
        insights.append(
            f"La hora con menor disponibilidad fue las {low_hour:02d}:00 h "
            f"con {low_val:,.0f} tiendas en promedio."
        )

        # Best and worst day
        daily_avg = df.groupby("date")["value"].mean()
        best_date = daily_avg.idxmax()
        worst_date = daily_avg.idxmin()

        insights.append(
            f"El mejor día del período fue {best_date} "
            f"con {daily_avg[best_date]:,.0f} tiendas en promedio."
        )
        insights.append(
            f"El día con menor rendimiento fue {worst_date} "
            f"con {daily_avg[worst_date]:,.0f} tiendas en promedio."
        )

        # Best weekday
        weekday_avg = df.groupby("weekday_name")["value"].mean()
        best_weekday_en = str(weekday_avg.idxmax())
        best_weekday = _WEEKDAY_ES.get(best_weekday_en, best_weekday_en)
        insights.append(
            f"El día de la semana con mejor rendimiento fue el {best_weekday} "
            f"con {weekday_avg.max():,.0f} tiendas en promedio."
        )

        # Stability
        std = float(df["value"].std())
        cv = (std / avg) * 100 if avg != 0 else 0.0
        level = "alta" if cv >= 15 else ("moderada" if cv >= 5 else "baja")
        insights.append(
            f"La variabilidad fue {level} "
            f"(desviación estándar: {std:,.0f}, coeficiente de variación: {cv:.1f}%)."
        )

        return insights
