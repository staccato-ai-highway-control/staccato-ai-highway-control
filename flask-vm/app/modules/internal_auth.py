from __future__ import annotations

import hmac

from flask import current_app, jsonify, request


INTERNAL_TOKEN_HEADER = "X-Internal-API-Token"


def require_internal_api_token():
    """Validate internal VM-to-VM API token.

    Test suites keep existing request fixtures lightweight by default.
    Set REQUIRE_INTERNAL_API_TOKEN_IN_TESTING=True in a test to verify auth behavior.
    """

    if current_app.config.get("TESTING") and not current_app.config.get(
        "REQUIRE_INTERNAL_API_TOKEN_IN_TESTING"
    ):
        return None

    expected_token = str(current_app.config.get("INTERNAL_API_TOKEN") or "").strip()

    if not expected_token:
        return (
            jsonify(
                {
                    "ok": False,
                    "success": False,
                    "error": "INTERNAL_API_TOKEN is not configured.",
                }
            ),
            503,
        )

    provided_token = str(request.headers.get(INTERNAL_TOKEN_HEADER) or "").strip()

    if not provided_token or not hmac.compare_digest(provided_token, expected_token):
        return (
            jsonify(
                {
                    "ok": False,
                    "success": False,
                    "error": "Invalid internal API token.",
                }
            ),
            401,
        )

    return None
