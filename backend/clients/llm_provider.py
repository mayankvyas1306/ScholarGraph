"""
Provider-agnostic LangChain chat model factory for ResearchMind.

This is the single place that knows how to build an LLM. Everything else
(agents, `LLMClient`, etc.) talks to a `langchain_core.BaseChatModel`
instance, never to a provider SDK directly. Switching the underlying model
between Ollama, OpenAI, Gemini, and Anthropic is a config change, not a code
change:

    LLM_PROVIDER=ollama       LLM_MODEL=llama3.1
    LLM_PROVIDER=openai       LLM_MODEL=gpt-4o-mini
    LLM_PROVIDER=google_genai LLM_MODEL=gemini-2.5-flash
    LLM_PROVIDER=anthropic    LLM_MODEL=claude-3-5-sonnet-latest

If LLM_PROVIDER is unset, the first usable provider is picked in this
order: Ollama (local, no key needed — used if a server is reachable),
then OpenAI, then Gemini, then Anthropic. If none are configured/reachable,
`get_chat_model` returns None and callers fall back to a mock.

Requires: langchain, langchain-ollama, langchain-openai,
langchain-google-genai, langchain-anthropic
"""

import os
import logging
from typing import Optional, Tuple

import requests

from langchain_core.language_models.chat_models import BaseChatModel
from langchain.chat_models import init_chat_model

logger = logging.getLogger("researchmind.llm")

# provider -> (env var holding the API key, default model name)
# Ollama has no API key (it's a local/self-hosted server), so its entry
# leaves the env var as None — see `_provider_is_usable` / `get_chat_model`.
_PROVIDER_DEFAULTS = {
    "ollama":       (None,                "llama3.1"),
    "openai":       ("OPENAI_API_KEY",    "gpt-4o-mini"),
    "google_genai": ("GEMINI_API_KEY",    "gemini-2.5-flash"),
    "anthropic":    ("ANTHROPIC_API_KEY", "claude-3-5-sonnet-latest"),
}

# Auto-detect / fallback order when LLM_PROVIDER isn't set explicitly.
# 1) Ollama (local, free, no key) 2) OpenAI 3) Gemini 4) Anthropic
_AUTODETECT_ORDER = ["ollama", "openai", "google_genai", "anthropic"]

_OLLAMA_BASE_URL_ENV = "OLLAMA_BASE_URL"
_DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"
_OLLAMA_PROBE_TIMEOUT = 0.5  # seconds — keep autodetect snappy


def _clean(value: str) -> str:
    return (value or "").strip("'\" ")


def _is_usable_key(key: str) -> bool:
    return bool(key) and not key.startswith("your-")


def _ollama_base_url() -> str:
    return _clean(os.environ.get(_OLLAMA_BASE_URL_ENV, "")) or _DEFAULT_OLLAMA_BASE_URL


def _is_ollama_available() -> bool:
    """Best-effort check that a local/remote Ollama server is reachable."""
    try:
        resp = requests.get(f"{_ollama_base_url()}/api/tags", timeout=_OLLAMA_PROBE_TIMEOUT)
        return resp.ok
    except Exception:
        return False


def _provider_is_usable(provider: str) -> bool:
    if provider == "ollama":
        return _is_ollama_available()
    env_var, _ = _PROVIDER_DEFAULTS[provider]
    return _is_usable_key(_clean(os.environ.get(env_var, "")))


def _first_available_provider() -> Optional[str]:
    for provider in _AUTODETECT_ORDER:
        if _provider_is_usable(provider):
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
    configured / usable (i.e. mock mode).

    Resolution order: explicit `provider` arg > LLM_PROVIDER env var >
    first usable provider (Ollama, then OpenAI, then Gemini, then Anthropic).
    """
    provider = (
        provider
        or _clean(os.environ.get("LLM_PROVIDER", "")).lower()
        or _first_available_provider()
    )

    if not provider:
        logger.warning("LLMProvider: no provider configured / reachable.")
        return None

    if provider not in _PROVIDER_DEFAULTS:
        logger.error(
            f"LLMProvider: unknown provider '{provider}'. "
            f"Expected one of {list(_PROVIDER_DEFAULTS)}."
        )
        return None

    env_var, default_model = _PROVIDER_DEFAULTS[provider]
    model_name = model or _clean(os.environ.get("LLM_MODEL", "")) or default_model

    init_kwargs = {"temperature": temperature, "max_tokens": max_tokens}

    if provider == "ollama":
        if not _is_ollama_available():
            logger.warning(
                f"LLMProvider: Ollama server not reachable at {_ollama_base_url()}."
            )
            return None
        init_kwargs["base_url"] = _ollama_base_url()
    else:
        api_key = _clean(os.environ.get(env_var, ""))
        if not _is_usable_key(api_key):
            logger.warning(f"LLMProvider: {env_var} not set for provider '{provider}'.")
            return None
        init_kwargs["api_key"] = api_key

    try:
        chat_model = init_chat_model(model_name, model_provider=provider, **init_kwargs)
        return chat_model, provider
    except Exception as exc:
        logger.error(f"LLMProvider: failed to initialize provider '{provider}' — {exc}")
        return None