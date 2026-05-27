from flask import jsonify, request

from app.modules.dashboard import dashboard_bp
from app.modules.dashboard.service import get_dashboard_summary
from app.utils.security import require_auth


@dashboard_bp.get("/summary")
@require_auth
def dashboard_summary():
    result = get_dashboard_summary(request.current_user)

    return jsonify({
        "success": True,
        "data": result,
    }), 200
