"""
Generic LLM client for ResearchMind — backed by LangChain.

This is provider-agnostic: `LLMClient` doesn't know or care whether it's
talking to Anthropic, Gemini, or OpenAI. Provider selection lives entirely
in `backend.clients.llm_provider.get_chat_model`, driven by the
LLM_PROVIDER / LLM_MODEL env vars (see backend/.env.example). Swapping
providers is a config change, not a code change.

Falls back to a deterministic mock when no provider/key is configured or on
API failure.
"""

import json
import logging

from langchain_core.messages import SystemMessage, HumanMessage

from backend.clients.llm_provider import get_chat_model

logger = logging.getLogger("researchmind.llm")


class LLMClient:
    """
    LangChain-backed, provider-agnostic LLM client.

    Call `client.complete(prompt, system, max_tokens, temperature)` and get
    back plain text, regardless of which provider is configured underneath.
    """

    def __init__(self):
        resolved = get_chat_model()
        if resolved is None:
            self._model = None
            self.provider = "mock"
            logger.warning("LLMClient: no provider/API key configured. Running in Mock Mode.")
        else:
            self._model, self.provider = resolved
            logger.info(
                f"LLMClient: Initialized successfully via LangChain (provider='{self.provider}')."
            )

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def complete(
        self,
        prompt: str,
        system: str = "You are an AI research assistant.",
        max_tokens: int = 2000,
        temperature: float = 0.0,
    ) -> str:
        """
        Send *prompt* to the configured LLM and return the text response.
        Falls back to a deterministic mock on failure.
        """
        if self.provider == "mock" or self._model is None:
            logger.info("LLMClient: Mock Mode — returning simulated response.")
            return self._mock_response(prompt)

        try:
            # max_tokens/temperature can vary per-call, so bind them fresh
            # rather than relying only on the model's construction-time values.
            model = self._model.bind(max_tokens=max_tokens, temperature=temperature)

            messages = []
            if system:
                messages.append(SystemMessage(content=system))
            messages.append(HumanMessage(content=prompt))

            response = model.invoke(messages)
            text = (response.content or "").strip()
            if not text:
                raise ValueError(f"Empty response from LLM provider '{self.provider}'.")

            # Strip markdown code fences the model sometimes wraps around JSON
            if text.startswith("```json"):
                text = text.split("```json", 1)[1].split("```", 1)[0].strip()
            elif text.startswith("```"):
                text = text.split("```", 1)[1].split("```", 1)[0].strip()

            return text

        except Exception as exc:
            logger.error(f"LLMClient: API call failed ({self.provider}) — {exc}. Falling back to mock.")
            return self._mock_response(prompt)

    # ------------------------------------------------------------------
    # Mock responses (used when no provider is configured, or on failure)
    # ------------------------------------------------------------------

    def _mock_response(self, prompt: str) -> str:
        p = prompt.lower()

        # Planner
        if "decompose the following research topic" in p:
            return json.dumps([
                "attention mechanisms in transformer models",
                "efficient transformer architectures for NLP",
                "limitations and computational complexity of transformers",
            ])

        # Abstract-only extraction prompt
        if "analyze the following paper text" in p or "title:" in p and "abstract:" in p and "method" in p:
            title_match = __import__('re').search(r'title:\s*(.+)', prompt, __import__('re').IGNORECASE)
            title_hint = title_match.group(1).strip()[:40] if title_match else "this paper"
            return json.dumps({
                "method":     f"Technique described in '{title_hint}'",
                "dataset":    "Domain-specific benchmark dataset",
                "key_metric": "Performance improvement demonstrated",
                "limitation": "Evaluated on limited data domains; generalization requires further study",
            })

        # Full-text extraction prompt
        if "paper text" in p and "method" in p and "dataset" in p:
            return json.dumps({
                "method":          "Deep learning approach with attention mechanism",
                "method_quote":    "attention",
                "dataset":         "Benchmark dataset from paper",
                "dataset_quote":   "dataset",
                "key_metric":      "Improved performance over baselines",
                "key_metric_quote":"outperforms",
                "limitation":      "Computational requirements limit deployment on resource-constrained devices",
                "limitation_quote":"computational",
            })

        # Second-pass inference prompt
        if "answer the following questions" in p or ("method" in p and "dataset" in p and "limitation" in p):
            title_match = __import__('re').search(r'title:\s*(.+)', prompt, __import__('re').IGNORECASE)
            title_hint = title_match.group(1).strip()[:40] if title_match else "this paper"
            return json.dumps({
                "method":     f"Core approach in '{title_hint}'",
                "dataset":    "Standard benchmark for this domain",
                "key_metric": "Competitive performance demonstrated",
                "limitation": "Scope limited to specific experimental conditions",
            })

        # Summary
        if "write a concise, factual 3-sentence summary" in p:
            return (
                "This work introduces a novel deep learning approach for the target task [Source: Method]. "
                "The method is evaluated on standard benchmarks and achieves competitive results [Source: Key Metric]. "
                "Future work will address generalization limitations identified in this study [Source: Limitation]."
            )

        # Thematic synthesis / report sections
        if "thematic synthesis" in p or "academic literature review" in p:
            return (
                "### 3.1 Methodological Paradigms\n"
                "Current research focuses on transformer-based approaches that leverage self-attention mechanisms. "
                "Multiple paradigms have emerged including sparse attention and low-rank approximations.\n\n"
                "### 3.2 Empirical Evaluation & Benchmarks\n"
                "Validation typically uses standard benchmarks such as ImageNet, GLUE, and WMT translation tasks.\n\n"
                "### 3.3 Identified Limitations and Research Gaps\n"
                "A critical gap remains between theoretical complexity reduction and practical latency gains.\n\n"
                "### 3.4 Critical Assessment\n"
                "Despite progress, evaluation on out-of-domain data remains limited across most studies."
            )

        if "compile report" in p or "literature review report" in p:
            return (
                "# Research Report\n\n## Introduction\n"
                "This report analyses recent literature on the given research topic.\n\n"
                "## Gaps\nA key identified gap is the lack of evaluation on diverse, real-world datasets.\n"
            )

        # Introduction / gap narrative
        if "introduction" in p or "narrative" in p or "gap" in p:
            return (
                "Recent advances in this research domain have demonstrated significant progress. "
                "This report synthesises key findings from the surveyed literature and identifies "
                "areas where further investigation is needed."
            )

        return json.dumps({
            "method": "See paper", "dataset": "See abstract",
            "key_metric": "See results section", "limitation": "See discussion section",
        })