"""Chatbot service with OpenRouter LLM integration and tool-calling architecture.

Flow per request:
    User → LLM (OpenRouter) → Tool selection → AnalyticsService → Result → LLM → Response

The LLM never receives the raw DataFrame; it only sees compact JSON returned
by the registered analytical tools.
"""

import json
import logging
from datetime import date
from typing import Any, Callable

from openai import OpenAI, OpenAIError

from app.core.config import settings
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

def _build_system_prompt(data_start: str, data_end: str) -> str:
    """Build the system prompt injecting the real dataset date range."""
    return f"""Eres un asistente analítico especializado en métricas de disponibilidad de tiendas.
Tienes acceso a herramientas que consultan datos precisos de un dataset de ~70,000 registros muestreados cada 10 segundos.

RANGO DE DATOS DISPONIBLE: {data_start} → {data_end}
Todas las fechas que uses en las herramientas deben estar dentro de ese rango.

Reglas:
- Usa SIEMPRE las herramientas disponibles para responder — nunca inventes ni estimes números.
- Responde en el mismo idioma del usuario.
- Sé conciso y orientado a datos. Formatea los números con separadores de miles.
- Si el usuario menciona una fecha o rango de fechas, extráelas y pásalas como start_date / end_date en formato YYYY-MM-DD.
- Si el usuario dice "primera semana de febrero" infiere start_date y end_date dentro del rango disponible.
- Para comparar períodos usa la herramienta compare_periods con start_date y end_date explícitos.
- Si no hay datos para las fechas pedidas, indícalo claramente."""

_MAX_TOOL_ITERATIONS = 8


# ---------------------------------------------------------------------------
# Tool abstraction
# ---------------------------------------------------------------------------

class Tool:
    """A callable analytical tool with its LLM-compatible metadata."""

    def __init__(
        self,
        name: str,
        description: str,
        parameters_schema: dict,
        handler: Callable[..., Any],
    ) -> None:
        self.name = name
        self.description = description
        self.parameters_schema = parameters_schema
        self._handler = handler

    def execute(self, **kwargs: Any) -> Any:
        """Invoke the underlying handler."""
        logger.debug("Tool '%s' called with %s", self.name, kwargs)
        return self._handler(**kwargs)

    def to_llm_schema(self) -> dict:
        """Return an OpenAI / OpenRouter function-calling compatible dict."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters_schema,
        }


class ToolRegistry:
    """Stores and dispatches all registered analytical tools."""

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def list_names(self) -> list[str]:
        return sorted(self._tools.keys())

    def all_schemas(self) -> list[dict]:
        return [t.to_llm_schema() for t in self._tools.values()]

    def execute(self, name: str, **kwargs: Any) -> Any:
        """Execute a tool by name.

        Raises:
            KeyError: Tool not found.
        """
        tool = self._tools.get(name)
        if tool is None:
            raise KeyError(f"Tool '{name}' is not registered.")
        return tool.execute(**kwargs)


# ---------------------------------------------------------------------------
# Shared JSON Schema fragments
# ---------------------------------------------------------------------------

_DATE_PROP = {
    "type": "string",
    "format": "date",
    "description": "Date in YYYY-MM-DD format.",
}

_DATE_RANGE_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "start_date": {**_DATE_PROP, "description": "Start of the date range (inclusive)."},
        "end_date": {**_DATE_PROP, "description": "End of the date range (inclusive)."},
    },
    "required": [],
}


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class ChatbotService:
    """Orchestrates chatbot interactions using OpenRouter and registered tools."""

    def __init__(self, analytics_service: AnalyticsService) -> None:
        self._analytics = analytics_service
        self._registry = ToolRegistry()
        self._register_tools()

        # Build the system prompt with the real dataset date range
        data_start, data_end = analytics_service._data.date_range
        self._system_prompt = _build_system_prompt(data_start, data_end)

        # Initialise the OpenAI-compatible client pointing at OpenRouter
        if settings.openrouter_api_key:
            self._client: OpenAI | None = OpenAI(
                api_key=settings.openrouter_api_key,
                base_url=settings.openrouter_base_url,
                default_headers={
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": settings.app_name,
                },
            )
            logger.info(
                "OpenRouter client ready — model: %s", settings.openrouter_model
            )
        else:
            self._client = None
            logger.warning(
                "OPENROUTER_API_KEY not set — /api/chat will return 503 until it is configured."
            )

    # ------------------------------------------------------------------
    # Tool registration
    # ------------------------------------------------------------------

    def _register_tools(self) -> None:
        """Build and register all analytical tools."""
        analytics = self._analytics

        def _date(value: str | None) -> date | None:
            return date.fromisoformat(value) if value else None

        def _filtered(start_date: str | None = None, end_date: str | None = None):
            return analytics.get_filtered_data(_date(start_date), _date(end_date))

        def get_average(start_date: str | None = None, end_date: str | None = None) -> dict:
            df = _filtered(start_date, end_date)
            return {"average": analytics.get_average(df)}

        def get_maximum(start_date: str | None = None, end_date: str | None = None) -> dict:
            df = _filtered(start_date, end_date)
            r = analytics.get_maximum(df)
            return {"maximum": r["value"], "timestamp": r["timestamp"].isoformat()}

        def get_minimum(start_date: str | None = None, end_date: str | None = None) -> dict:
            df = _filtered(start_date, end_date)
            r = analytics.get_minimum(df)
            return {"minimum": r["value"], "timestamp": r["timestamp"].isoformat()}

        def get_current(start_date: str | None = None, end_date: str | None = None) -> dict:
            df = _filtered(start_date, end_date)
            return {"current": analytics.get_current(df)}

        def get_variation(start_date: str | None = None, end_date: str | None = None) -> dict:
            df = _filtered(start_date, end_date)
            return {"variation_percent": analytics.get_variation_percent(df)}

        def get_volatility(start_date: str | None = None, end_date: str | None = None) -> dict:
            df = _filtered(start_date, end_date)
            return {"volatility": analytics.get_volatility(df)}

        def compare_periods(start_date: str, end_date: str) -> dict:
            return analytics.compare_periods(
                date.fromisoformat(start_date),
                date.fromisoformat(end_date),
            )

        def get_hourly_pattern(start_date: str | None = None, end_date: str | None = None) -> dict:
            df = _filtered(start_date, end_date)
            return {"hourly_pattern": analytics.get_hourly_average(df)}

        def get_peak_hours(start_date: str | None = None, end_date: str | None = None) -> dict:
            df = _filtered(start_date, end_date)
            return {"peak_hours": analytics.get_peak_hours(df)}

        def get_low_hours(start_date: str | None = None, end_date: str | None = None) -> dict:
            df = _filtered(start_date, end_date)
            return {"low_hours": analytics.get_low_hours(df)}

        tools: list[Tool] = [
            Tool(
                name="get_average",
                description="Return the mean store availability for the given date range.",
                parameters_schema=_DATE_RANGE_SCHEMA,
                handler=get_average,
            ),
            Tool(
                name="get_maximum",
                description="Return the peak store count and the timestamp when it occurred.",
                parameters_schema=_DATE_RANGE_SCHEMA,
                handler=get_maximum,
            ),
            Tool(
                name="get_minimum",
                description="Return the lowest store count and the timestamp when it occurred.",
                parameters_schema=_DATE_RANGE_SCHEMA,
                handler=get_minimum,
            ),
            Tool(
                name="get_current",
                description="Return the most recent store availability reading.",
                parameters_schema=_DATE_RANGE_SCHEMA,
                handler=get_current,
            ),
            Tool(
                name="get_variation",
                description="Return the percentage change from the first to the last reading.",
                parameters_schema=_DATE_RANGE_SCHEMA,
                handler=get_variation,
            ),
            Tool(
                name="get_volatility",
                description="Return the standard deviation (volatility) of store availability.",
                parameters_schema=_DATE_RANGE_SCHEMA,
                handler=get_volatility,
            ),
            Tool(
                name="compare_periods",
                description=(
                    "Compare the selected period with the immediately preceding period of "
                    "equal length. Returns averages and percentage change. "
                    "Both start_date and end_date are required."
                ),
                parameters_schema={
                    "type": "object",
                    "properties": {
                        "start_date": {
                            **_DATE_PROP,
                            "description": "First day of the current period.",
                        },
                        "end_date": {
                            **_DATE_PROP,
                            "description": "Last day of the current period.",
                        },
                    },
                    "required": ["start_date", "end_date"],
                },
                handler=compare_periods,
            ),
            Tool(
                name="get_hourly_pattern",
                description="Return average store availability for each hour of the day (0–23).",
                parameters_schema=_DATE_RANGE_SCHEMA,
                handler=get_hourly_pattern,
            ),
            Tool(
                name="get_peak_hours",
                description="Return the top-3 hours with the highest average store availability.",
                parameters_schema=_DATE_RANGE_SCHEMA,
                handler=get_peak_hours,
            ),
            Tool(
                name="get_low_hours",
                description="Return the top-3 hours with the lowest average store availability.",
                parameters_schema=_DATE_RANGE_SCHEMA,
                handler=get_low_hours,
            ),
        ]

        for tool in tools:
            self._registry.register(tool)

        logger.info("ChatbotService: %d tools registered.", len(tools))

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    @property
    def tool_names(self) -> list[str]:
        return self._registry.list_names()

    @property
    def tool_schemas(self) -> list[dict]:
        """LLM-compatible schemas in OpenAI function-calling format."""
        return self._registry.all_schemas()

    def execute_tool(self, name: str, **kwargs: Any) -> Any:
        """Execute a registered tool by name."""
        return self._registry.execute(name, **kwargs)

    def process_message(self, message: str) -> dict:
        """Process a user message through OpenRouter with agentic tool calling.

        Loop:
            1. Send message + tool schemas to the LLM.
            2. If the LLM requests tool calls, execute them and feed results back.
            3. Repeat until the LLM produces a final text response.

        Args:
            message: Natural-language question from the user.

        Returns:
            Dict compatible with ``ChatResponse`` schema.

        Raises:
            RuntimeError: If the API key is not configured.
            OpenAIError: On LLM provider errors (propagates to the HTTP layer).
        """
        if self._client is None:
            raise RuntimeError(
                "OPENROUTER_API_KEY is not configured. "
                "Add it to your .env file and restart the server."
            )

        logger.info("Chat message: %s", message)

        # OpenRouter expects tools in {"type": "function", "function": schema} form
        tools_payload = [
            {"type": "function", "function": schema}
            for schema in self.tool_schemas
        ]

        messages: list[dict] = [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": message},
        ]

        tool_calls_log: list[dict] = []
        final_text = ""

        for iteration in range(_MAX_TOOL_ITERATIONS):
            logger.debug("LLM call — iteration %d", iteration + 1)

            response = self._client.chat.completions.create(
                model=settings.openrouter_model,
                messages=messages,
                tools=tools_payload,
                tool_choice="auto",
            )

            choice = response.choices[0]

            if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
                # ---- Append assistant turn (with tool_calls) ----
                assistant_turn: dict = {
                    "role": "assistant",
                    "content": choice.message.content,  # may be None
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in choice.message.tool_calls
                    ],
                }
                messages.append(assistant_turn)

                # ---- Execute each requested tool ----
                for tc in choice.message.tool_calls:
                    tool_name = tc.function.name
                    params: dict = json.loads(tc.function.arguments or "{}")
                    try:
                        result: Any = self.execute_tool(tool_name, **params)
                        logger.debug("Tool '%s' returned: %s", tool_name, result)
                    except Exception as exc:
                        result = {"error": str(exc)}
                        logger.warning("Tool '%s' failed: %s", tool_name, exc)

                    tool_calls_log.append({
                        "tool": tool_name,
                        "parameters": params,
                        "result": result,
                    })

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, default=str),
                    })

            else:
                # LLM produced its final answer
                final_text = choice.message.content or ""
                logger.info(
                    "Chat completed in %d iteration(s), %d tool call(s).",
                    iteration + 1,
                    len(tool_calls_log),
                )
                break
        else:
            # Safeguard: max iterations reached without a stop signal
            final_text = (
                "Se alcanzó el límite de iteraciones del agente. "
                "Por favor reformula tu pregunta."
            )
            logger.warning("Max tool iterations (%d) reached.", _MAX_TOOL_ITERATIONS)

        return {
            "message": final_text,
            "tools_available": self.tool_names,
            "tool_calls": tool_calls_log,
            "status": "ok",
        }
