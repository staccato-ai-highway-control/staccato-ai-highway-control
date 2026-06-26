import logging

from flask import Blueprint, jsonify, request

from app.modules.report_model_comparison.service import (
    ReportModelComparisonService,
)
from app.utils.security import require_auth


logger = logging.getLogger(__name__)

report_model_comparison_bp = Blueprint(
    "report_model_comparison",
    __name__,
    url_prefix="/api",
)


@report_model_comparison_bp.route(
    "/report-model-comparisons/models",
    methods=["GET"],
)
@require_auth
def list_report_model_comparison_models():
    try:
        result, status_code = ReportModelComparisonService.list_models(
            request.current_user
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("비교 분석 모델 목록 조회 중 오류 발생")
        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다.",
        }), 500


@report_model_comparison_bp.route(
    "/reports/<int:report_id>/model-comparisons",
    methods=["POST"],
)
@require_auth
def create_report_model_comparison_batch(report_id):
    try:
        data = request.get_json(silent=True)

        if data is None:
            data = {}

        result, status_code = ReportModelComparisonService.create_batch(
            report_id=report_id,
            data=data,
            current_user=request.current_user,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("모델 비교 분석 요청 생성 중 오류 발생")
        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다.",
        }), 500


@report_model_comparison_bp.route(
    "/reports/<int:report_id>/model-comparisons",
    methods=["GET"],
)
@require_auth
def list_report_model_comparison_batches(report_id):
    try:
        result, status_code = ReportModelComparisonService.list_report_batches(
            report_id=report_id,
            current_user=request.current_user,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("신고별 모델 비교 분석 목록 조회 중 오류 발생")
        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다.",
        }), 500


@report_model_comparison_bp.route(
    "/report-model-comparisons/<int:batch_id>",
    methods=["GET"],
)
@require_auth
def get_report_model_comparison_batch(batch_id):
    try:
        result, status_code = ReportModelComparisonService.get_batch(
            batch_id=batch_id,
            current_user=request.current_user,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("모델 비교 분석 Batch 상세 조회 중 오류 발생")
        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다.",
        }), 500
