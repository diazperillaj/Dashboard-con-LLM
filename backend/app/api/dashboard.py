"""Dashboard API — analytics endpoints."""

import logging
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.requests import Request

from app.schemas.schemas import (
    DailySummary,
    DistributionResponse,
    HeatmapPoint,
    HourlyAverage,
    InsightsResponse,
    KPIResponse,
    TimeSeriesPoint,
)
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Dashboard"])

# Reusable query parameter annotation
DateQuery = Annotated[date | None, Query(description="Date filter in YYYY-MM-DD format")]


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------

def get_analytics(request: Request) -> AnalyticsService:
    """Retrieve the shared AnalyticsService from application state."""
    return request.app.state.analytics_service


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/kpis",
    response_model=KPIResponse,
    summary="Key performance indicators",
)
def get_kpis(
    start_date: DateQuery = None,
    end_date: DateQuery = None,
    analytics: AnalyticsService = Depends(get_analytics),
) -> KPIResponse:
    """Return current, average, max, min, variation, and volatility
    for the selected period.
    """
    try:
        df = analytics.get_filtered_data(start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    maximum = analytics.get_maximum(df)
    minimum = analytics.get_minimum(df)

    return KPIResponse(
        current=analytics.get_current(df),
        average=analytics.get_average(df),
        maximum=maximum["value"],
        maximum_timestamp=maximum["timestamp"],
        minimum=minimum["value"],
        minimum_timestamp=minimum["timestamp"],
        variation_percent=analytics.get_variation_percent(df),
        volatility=analytics.get_volatility(df),
    )


@router.get(
    "/timeseries",
    response_model=list[TimeSeriesPoint],
    summary="Raw availability time series",
)
def get_timeseries(
    start_date: DateQuery = None,
    end_date: DateQuery = None,
    analytics: AnalyticsService = Depends(get_analytics),
) -> list[TimeSeriesPoint]:
    """Return every reading within the selected period as ``{timestamp, value}``."""
    try:
        df = analytics.get_filtered_data(start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return [TimeSeriesPoint(**p) for p in analytics.get_timeseries(df)]


@router.get(
    "/hourly-average",
    response_model=list[HourlyAverage],
    summary="Average availability by hour of day",
)
def get_hourly_average(
    start_date: DateQuery = None,
    end_date: DateQuery = None,
    analytics: AnalyticsService = Depends(get_analytics),
) -> list[HourlyAverage]:
    """Return the mean store count for each hour of the day (0–23)."""
    try:
        df = analytics.get_filtered_data(start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return [HourlyAverage(**h) for h in analytics.get_hourly_average(df)]


@router.get(
    "/heatmap",
    response_model=list[HeatmapPoint],
    summary="Date × hour availability heatmap",
)
def get_heatmap(
    start_date: DateQuery = None,
    end_date: DateQuery = None,
    analytics: AnalyticsService = Depends(get_analytics),
) -> list[HeatmapPoint]:
    """Return mean availability per (date, hour) bucket for heatmap rendering."""
    try:
        df = analytics.get_filtered_data(start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return [HeatmapPoint(**p) for p in analytics.get_heatmap_data(df)]


@router.get(
    "/distribution",
    response_model=DistributionResponse,
    summary="Histogram distribution of store counts",
)
def get_distribution(
    start_date: DateQuery = None,
    end_date: DateQuery = None,
    bins: Annotated[
        int,
        Query(ge=5, le=200, description="Number of histogram bins (5–200)"),
    ] = 20,
    analytics: AnalyticsService = Depends(get_analytics),
) -> DistributionResponse:
    """Return a numpy histogram of store count values."""
    try:
        df = analytics.get_filtered_data(start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return DistributionResponse(**analytics.get_distribution(df, bins=bins))


@router.get(
    "/table",
    response_model=list[DailySummary],
    summary="Daily summary table",
)
def get_table(
    start_date: DateQuery = None,
    end_date: DateQuery = None,
    analytics: AnalyticsService = Depends(get_analytics),
) -> list[DailySummary]:
    """Return per-day aggregates: average, max, min, volatility, and record count."""
    try:
        df = analytics.get_filtered_data(start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return [DailySummary(**s) for s in analytics.get_daily_summary(df)]


@router.get(
    "/insights",
    response_model=InsightsResponse,
    summary="Auto-generated analytical insights",
)
def get_insights(
    start_date: DateQuery = None,
    end_date: DateQuery = None,
    analytics: AnalyticsService = Depends(get_analytics),
) -> InsightsResponse:
    """Return a list of human-readable insights derived from the data."""
    try:
        df = analytics.get_filtered_data(start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return InsightsResponse(insights=analytics.generate_insights(df))
