from __future__ import annotations

from flask import jsonify
from werkzeug.exceptions import HTTPException


ERROR_STATUS_CODES = {401, 403, 404, 500}
DEFAULT_MESSAGES = {
    401: "Authentication is required.",
    403: "Permission denied.",
    404: "Resource not found.",
    500: "Internal server error.",
}
DEFAULT_ERROR_CODES = {
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    500: "INTERNAL_SERVER_ERROR",
}


def register_api_error_handlers(app) -> None:
    @app.after_request
    def normalize_error_response(response):
        if response.status_code not in ERROR_STATUS_CODES or not response.is_json:
            return response

        payload = response.get_json(silent=True)
        if not isinstance(payload, dict):
            payload = {}

        message = (
            payload.get("message")
            or payload.get("error")
            or DEFAULT_MESSAGES[response.status_code]
        )

        payload["success"] = False
        payload["status_code"] = response.status_code
        payload.setdefault("error_code", DEFAULT_ERROR_CODES[response.status_code])
        payload.setdefault("message", message)
        payload.setdefault("error", message)
        response.set_data(app.json.dumps(payload))
        response.content_type = "application/json"
        return response

    @app.errorhandler(404)
    def handle_not_found(error):
        return _error_response(404)

    @app.errorhandler(500)
    def handle_internal_server_error(error):
        app.logger.exception("Unhandled server error", exc_info=error)
        return _error_response(500)

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        status_code = error.code or 500
        if status_code not in ERROR_STATUS_CODES:
            return error
        return _error_response(status_code, error.description)


def _error_response(status_code: int, message: str | None = None):
    resolved_message = message or DEFAULT_MESSAGES[status_code]
    return jsonify({
        "success": False,
        "status_code": status_code,
        "error_code": DEFAULT_ERROR_CODES[status_code],
        "message": resolved_message,
        "error": resolved_message,
    }), status_code
