from __future__ import annotations

import json
import os
from dataclasses import dataclass
from urllib import error, request


@dataclass(slots=True)
class OmniRouteClient:
    base_url: str | None = os.getenv("OMNIROUTE_BASE_URL")
    model: str | None = os.getenv("OMNIROUTE_MODEL")
    api_key: str | None = os.getenv("OMNIROUTE_API_KEY")
    temperature: float = float(os.getenv("OMNIROUTE_TEMPERATURE", "0"))
    max_tokens: int = int(os.getenv("OMNIROUTE_MAX_TOKENS", "1024"))
    timeout: float = float(os.getenv("OMNIROUTE_TIMEOUT", "30"))

    def is_configured(self) -> bool:
        return bool(self.base_url and self.model)

    def interpret_query(self, query: str) -> dict[str, str | int | float | None]:
        payload = self._post("interpret", {"query": query})
        if not isinstance(payload, dict):
            raise ValueError("OmniRoute interpretation response must be JSON object")
        return payload

    def generate_answer(self, prompt: str) -> str:
        payload = self._post("answer", {"prompt": prompt})
        if isinstance(payload, dict) and isinstance(payload.get("answer"), str):
            return payload["answer"]
        if isinstance(payload, str):
            return payload
        raise ValueError("OmniRoute answer response must contain text")

    def _post(self, route: str, body: dict[str, object]) -> object:
        if not self.is_configured():
            raise RuntimeError("OmniRouteClient requires OMNIROUTE_BASE_URL and OMNIROUTE_MODEL")
        url = f"{self.base_url.rstrip('/')}/{route.lstrip('/')}"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload = json.dumps({"model": self.model, **body, "temperature": self.temperature, "max_tokens": self.max_tokens}).encode("utf-8")
        req = request.Request(url, data=payload, headers=headers, method="POST")
        try:
            with request.urlopen(req, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
        except error.URLError as exc:
            raise RuntimeError(f"OmniRoute request failed: {exc}") from exc
        return json.loads(raw)
