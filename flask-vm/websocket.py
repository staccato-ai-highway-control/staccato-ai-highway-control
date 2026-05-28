"""Flask-VM Relay WebSocket broadcast helpers."""

from __future__ import annotations

import json
import os
from queue import Empty, Full, Queue
import threading
from typing import Any


BROADCAST_QUEUE_SIZE = int(os.environ.get("FLASK_RELAY_BROADCAST_QUEUE_SIZE", "1000"))


class WebSocketHub:
    def __init__(self) -> None:
        self._clients: set[Any] = set()
        self._lock = threading.Lock()
        self._broadcast_queue: Queue[tuple[str, dict[str, Any]]] = Queue(
            maxsize=max(1, BROADCAST_QUEUE_SIZE)
        )
        self.queued_messages = 0
        self.sent_messages = 0
        self.dropped_messages = 0
        self._worker = threading.Thread(
            target=self._broadcast_loop,
            name="FlaskRelayWebSocketBroadcaster",
            daemon=True,
        )
        self._worker.start()

    def add(self, websocket: Any) -> None:
        with self._lock:
            self._clients.add(websocket)

    def remove(self, websocket: Any) -> None:
        with self._lock:
            self._clients.discard(websocket)

    def count(self) -> int:
        with self._lock:
            return len(self._clients)

    def broadcast(self, event_type: str, payload: dict[str, Any]) -> bool:
        try:
            self._broadcast_queue.put_nowait((event_type, payload))
            self.queued_messages += 1
            return True
        except Full:
            self.dropped_messages += 1
            return False

    def stats(self) -> dict[str, Any]:
        return {
            "clients": self.count(),
            "queue_size": self._broadcast_queue.qsize(),
            "queue_limit": BROADCAST_QUEUE_SIZE,
            "queued_messages": self.queued_messages,
            "sent_messages": self.sent_messages,
            "dropped_messages": self.dropped_messages,
        }

    def _broadcast_loop(self) -> None:
        while True:
            try:
                event_type, payload = self._broadcast_queue.get(timeout=0.5)
            except Empty:
                continue

            self._send_now(event_type, payload)
            self.sent_messages += 1

    def _send_now(self, event_type: str, payload: dict[str, Any]) -> None:
        message = json.dumps(
            {
                "type": event_type,
                "payload": payload,
            },
            ensure_ascii=False,
        )
        with self._lock:
            clients = list(self._clients)

        for websocket in clients:
            try:
                websocket.send(message)
            except Exception:
                self.remove(websocket)


hub = WebSocketHub()


def broadcast_event(event_type: str, payload: dict[str, Any]) -> bool:
    return hub.broadcast(event_type, payload)


def init_websocket(app: Any) -> None:
    try:
        from flask_sock import Sock
    except ImportError:
        @app.get("/ws")
        def websocket_dependency_missing():
            return {
                "ok": False,
                "error": "flask-sock is not installed. Run `pip install -r requirements.txt`.",
            }, 501

        return

    sock = Sock(app)

    @sock.route("/ws")
    def websocket_route(websocket):
        hub.add(websocket)
        websocket.send(
            json.dumps(
                {
                    "type": "system:notice",
                    "payload": {"message": "connected to Flask-VM Relay"},
                },
                ensure_ascii=False,
            )
        )
        try:
            while True:
                message = websocket.receive()
                if message is None:
                    break
                if message == "ping":
                    websocket.send(json.dumps({"type": "pong"}, ensure_ascii=False))
        finally:
            hub.remove(websocket)
