from flask import Blueprint, jsonify, request

from app.modules.llm_gateway.service import (
    get_llm_health,
    generate_llm_report,
    generate_chatbot_answer,
)

llm_gateway_bp = Blueprint("llm_gateway", __name__)


@llm_gateway_bp.get("/internal/llm/health")
def llm_health():
    result = get_llm_health()
    status_code = 200 if result.get("success") else 502
    return jsonify(result), status_code


@llm_gateway_bp.post("/internal/llm/reports/generate")
def create_llm_report():
    payload = request.get_json(silent=True) or {}

    result = generate_llm_report(payload)
    status_code = 200 if result.get("success") else 502

    return jsonify(result), status_code


@llm_gateway_bp.post("/internal/llm/chatbot/answer")
def create_chatbot_answer():
    payload = request.get_json(silent=True) or {}

    result = generate_chatbot_answer(payload)
    status_code = 200 if result.get("success") else 502

    return jsonify(result), status_code
