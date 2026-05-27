from __future__ import annotations

from typing import Any

import requests

from .config import FLASK_RELAY_EVENTS_URL, FLASK_RELAY_TIMEOUT_SECONDS


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
        if not self.events_url:
            self.failed_events += 1
            self.last_error = "FLASK_RELAY_EVENTS_URL is empty."
            return False

        try:
            response = requests.post(
                self.events_url,
                json=event,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
        except requests.RequestException as error:
            self.failed_events += 1
            self.last_error = str(error)
            return False

        self.sent_events += 1
        self.last_error = None
        return True

    def to_status_payload(self) -> dict[str, Any]:
        return {
            "events_url": self.events_url,
            "sent_events": self.sent_events,
            "failed_events": self.failed_events,
            "last_error": self.last_error,
        }
