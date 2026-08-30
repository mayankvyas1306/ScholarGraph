"""
Provider-agnostic LangChain chat model factory for ResearchMind.

This is the single place that knows how to build an LLM. Everything else
(agents, `LLMClient`, etc.) talks to a `langchain_core.BaseChatModel`
instance, never to a provider SDK directly. Switching the underlying model
between Anthropic, Gemini, and OpenAI is a config change, not a code change:

    LLM_PROVIDER=anthropic    LLM_MODEL=claude-3-5-sonnet-latest
    LLM_PROVIDER=google_genai LLM_MODEL=gemini-2.5-flash
    LLM_PROVIDER=openai       LLM_MODEL=gpt-4o-mini

If LLM_PROVIDER is unset, the first provider with a usable API key present
is used (Gemini, then Anthropic, then OpenAI — matching this project's
historical fallback order). If none are configured, `get_chat_model`
returns None and callers fall back to a mock.

Requires: langchain, langchain-anthropic, langchain-google-genai, langchain-openai
"""

import os
import logging
from typing import Optional, Tuple

from langchain_core.language_models.chat_models import BaseChatModel
from langchain.chat_models import init_chat_model

logger = logging.getLogger("researchmind.llm")

# provider -> (env var holding the API key, default model name)
_PROVIDER_DEFAULTS = {
    "anthropic": ("ANTHROPIC_API_KEY", "claude-3-5-sonnet-latest"),
    "google_genai": ("GEMINI_API_KEY", "gemini-2.5-flash"),
    "openai": ("OPENAI_API_KEY", "gpt-4o-mini"),
}

# Auto-detect order when LLM_PROVIDER isn't set explicitly.
_AUTODETECT_ORDER = ["google_genai", "anthropic", "openai"]


def _clean(value: str) -> str:
    return (value or "").strip("'\" ")


def _is_usable_key(key: str) -> bool:
    return bool(key) and not key.startswith("your-")


def _first_available_provider() -> Optional[str]:
    for provider in _AUTODETECT_ORDER:
        env_var, _ = _PROVIDER_DEFAULTS[provider]
        if _is_usable_key(_clean(os.environ.get(env_var, ""))):
            return provider
    return None


def get_chat_model(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.0,
    max_tokens: int = 2000,
) -> Optional[Tuple[BaseChatModel, str]]:
    """
    Build a LangChain chat model for the configured provider.

    Returns (model, provider_name) on success, or None if no provider is
    configured / no usable API key is present (i.e. mock mode).

    Resolution order: explicit `provider` arg > LLM_PROVIDER env var >
    first provider with a usable API key.
    """
    provider = (
        provider
        or _clean(os.environ.get("LLM_PROVIDER", "")).lower()
        or _first_available_provider()
    )

    if not provider:
        logger.warning("LLMProvider: no provider configured / no API key found.")
        return None

    if provider not in _PROVIDER_DEFAULTS:
        logger.error(
            f"LLMProvider: unknown provider '{provider}'. "
            f"Expected one of {list(_PROVIDER_DEFAULTS)}."
        )
        return None

    env_var, default_model = _PROVIDER_DEFAULTS[provider]
    api_key = _clean(os.environ.get(env_var, ""))
    if not _is_usable_key(api_key):
        logger.warning(f"LLMProvider: {env_var} not set for provider '{provider}'.")
        return None

    model_name = model or _clean(os.environ.get("LLM_MODEL", "")) or default_model

    try:
        chat_model = init_chat_model(
            model_name,
            model_provider=provider,
            api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return chat_model, provider
    except Exception as exc:
        logger.error(f"LLMProvider: failed to initialize provider '{provider}' — {exc}")
        return None