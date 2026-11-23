"""Pydantic schemas for all API request and response models."""

from datetime import date, datetime
from typing import Any, List, Optional, Union

from pydantic import BaseModel, Field


class KPIResponse(BaseModel):
    """Key performance indicators computed over the selected period."""

    current: int = Field(..., description="Last recorded store count")
    average: float = Field(..., description="Arithmetic mean of store counts")
    maximum: int = Field(..., description="Peak store count")
    maximum_timestamp: datetime = Field(..., description="Timestamp of the peak value")
    minimum: int = Field(..., description="Lowest store count")
    minimum_timestamp: datetime = Field(..., description="Timestamp of the lowest value")
    variation_percent: float = Field(
        ..., description="Percentage change from first to last reading"
    )
    volatility: float = Field(..., description="Standard deviation of store counts")


class TimeSeriesPoint(BaseModel):
    """A single observation in the availability time series."""

    timestamp: datetime
    value: int


class HourlyAverage(BaseModel):
    """Average store availability aggregated by hour of day."""

    hour: int = Field(..., ge=0, le=23, description="Hour of day (0–23)")
    average: float = Field(..., description="Mean store count for this hour")


class HeatmapPoint(BaseModel):
    """One cell of the date × hour availability heatmap."""

    date: date
    hour: int = Field(..., ge=0, le=23)
    value: float = Field(..., description="Mean store count for this date-hour bucket")


class DistributionResponse(BaseModel):
    """Histogram of store availability values generated with numpy.

    ``bins`` has n+1 edge values for n buckets; ``counts[i]`` is the
    frequency of observations that fall in ``[bins[i], bins[i+1])``.
    """

    bins: List[float] = Field(..., description="Bin edge values (length = n_bins + 1)")
    counts: List[int] = Field(..., description="Observation count per bin")


class DailySummary(BaseModel):
    """Per-day aggregate statistics for the table view."""

    date: date
    average: float
    maximum: int
    minimum: int
    volatility: float
    records: int = Field(..., description="Number of data points for this day")


class InsightsResponse(BaseModel):
    """Auto-generated analytical insights for the selected period."""

    insights: List[str]


class ChatRequest(BaseModel):
    """Incoming chat message from the user."""

    message: str = Field(..., min_length=1, description="Natural-language question")


class ToolCall(BaseModel):
    """Records a single tool invocation made during chatbot processing."""

    tool: str = Field(..., description="Tool name")
    parameters: dict = Field(default_factory=dict)
    result: Optional[Union[dict, list, float, int, str]] = None


class ChatResponse(BaseModel):
    """Response envelope returned by the chatbot endpoint."""

    message: str
    tools_available: List[str]
    tool_calls: List[ToolCall] = Field(default_factory=list)
    status: str = Field(default="ready")
