"""Chatbot API endpoint."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.requests import Request

from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.chatbot_service import ChatbotService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chatbot"])


def get_chatbot(request: Request) -> ChatbotService:
    """Retrieve the shared ChatbotService from application state."""
    return request.app.state.chatbot_service


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a natural-language query to the chatbot",
)
def chat(
    body: ChatRequest,
    chatbot: ChatbotService = Depends(get_chatbot),
) -> ChatResponse:
    """Answer a natural-language question about the dataset.

    The LLM decides which analytical tools to call; every number in the answer
    comes from ``AnalyticsService``. The response includes a log of the tool
    calls that were made, for traceability.
    """
    try:
        result = chatbot.process_message(body.message)
        return ChatResponse(**result)
    except RuntimeError as exc:
        # Raised when the LLM API key is not configured.
        logger.warning("Chat unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error while processing chat message.")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your message.",
        ) from exc
