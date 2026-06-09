from __future__ import annotations

from typing import Any

import requests

from .config import (
    FLASK_RELAY_EVENTS_URL,
    FLASK_RELAY_TIMEOUT_SECONDS,
    INTERNAL_API_TOKEN,
)


class RelayClient:
    def __init__(
        self,
        events_url: str = FLASK_RELAY_EVENTS_URL,
        timeout_seconds: float = FLASK_RELAY_TIMEOUT_SECONDS,
    ) -> None:
        self.events_url = events_url
        self.timeout_seconds = timeout_seconds
        self.sent_events = 0
        self.failed_events = 0
        self.last_error: str | None = None

    def send_event(self, event: dict[str, Any]) -> bool:
        event_id = str(event.get("event_id") or "-")

        if not self.events_url:
            self.failed_events += 1
            self.last_error = "FLASK_RELAY_EVENTS_URL is empty."
            print(f"[relay] failed event_id={event_id} reason=empty_events_url", flush=True)
            return False

        try:
            response = requests.post(
                self.events_url,
                json=event,
                headers=self._headers(),
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
        except requests.RequestException as error:
            self.failed_events += 1
            status_code = getattr(getattr(error, "response", None), "status_code", None)
            response_text = getattr(getattr(error, "response", None), "text", "") or ""
            self.last_error = str(error)
            print(
                f"[relay] failed event_id={event_id} url={self.events_url} "
                f"status={status_code} error={self.last_error} body={response_text[:300]}",
                flush=True,
            )
            return False

        self.sent_events += 1
        self.last_error = None
        print(
            f"[relay] sent event_id={event_id} url={self.events_url} status={response.status_code}",
            flush=True,
        )
        return True

    def _headers(self) -> dict[str, str] | None:
        if not INTERNAL_API_TOKEN:
            return None

        return {"X-Internal-API-Token": INTERNAL_API_TOKEN}

    def to_status_payload(self) -> dict[str, Any]:
        return {
            "events_url": self.events_url,
            "internal_api_token_configured": bool(INTERNAL_API_TOKEN),
            "sent_events": self.sent_events,
            "failed_events": self.failed_events,
            "last_error": self.last_error,
        }
