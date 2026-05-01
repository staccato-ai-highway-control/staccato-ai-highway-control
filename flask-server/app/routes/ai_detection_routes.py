from flask import Blueprint, jsonify, request

from app.services.ai_detection_service import AiDetectionError, AiDetectionService
from app.utils.security import require_roles


ai_detection_bp = Blueprint("ai_detection", __name__)


@ai_detection_bp.post("/analysis-jobs/<int:job_id>/run-ai")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN", "MAINTENANCE_ADMIN")
def run_ai_analysis(job_id):
    try:
        result = AiDetectionService.run_ai_analysis(
            job_id=job_id,
            actor_user=request.current_user,
        )

        return jsonify(
            {
                "message": "AI analysis completed.",
                "data": result,
            }
        )

    except AiDetectionError as error:
        return jsonify({"message": error.message}), error.status_code
