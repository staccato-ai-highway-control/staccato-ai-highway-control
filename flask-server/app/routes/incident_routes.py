from flask import Blueprint, jsonify, request

from app.services.incident_service import IncidentError, IncidentService
from app.utils.security import require_auth, require_roles


incident_bp = Blueprint("incident", __name__, url_prefix="/incidents")


@incident_bp.get("")
@require_auth
def list_incidents():
    filters = {
        "incident_status": request.args.get("incident_status"),
        "incident_type": request.args.get("incident_type"),
        "risk_level": request.args.get("risk_level"),
        "cctv_id": request.args.get("cctv_id", type=int),
    }

    return jsonify(
        {
            "data": IncidentService.list_incidents(filters),
        }
    )


@incident_bp.post("")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN")
def create_incident():
    data = request.get_json(silent=True) or {}

    try:
        result = IncidentService.create_incident(
            data=data,
            actor_user=request.current_user,
        )

        return jsonify(
            {
                "message": "Incident created.",
                "data": result,
            }
        ), 201

    except IncidentError as error:
        return jsonify({"message": error.message}), error.status_code


@incident_bp.get("/<int:incident_id>")
@require_auth
def get_incident_detail(incident_id):
    try:
        return jsonify(
            {
                "data": IncidentService.get_incident_detail(incident_id),
            }
        )

    except IncidentError as error:
        return jsonify({"message": error.message}), error.status_code


@incident_bp.patch("/<int:incident_id>/status")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN")
def change_incident_status(incident_id):
    data = request.get_json(silent=True) or {}

    try:
        result = IncidentService.change_status(
            incident_id=incident_id,
            data=data,
            actor_user=request.current_user,
        )

        return jsonify(
            {
                "message": "Incident status changed.",
                "data": result,
            }
        )

    except IncidentError as error:
        return jsonify({"message": error.message}), error.status_code


@incident_bp.get("/<int:incident_id>/histories")
@require_auth
def list_incident_histories(incident_id):
    try:
        return jsonify(
            {
                "data": IncidentService.list_histories(incident_id),
            }
        )

    except IncidentError as error:
        return jsonify({"message": error.message}), error.status_code


@incident_bp.get("/<int:incident_id>/memos")
@require_auth
def list_incident_memos(incident_id):
    try:
        return jsonify(
            {
                "data": IncidentService.list_memos(incident_id),
            }
        )

    except IncidentError as error:
        return jsonify({"message": error.message}), error.status_code


@incident_bp.post("/<int:incident_id>/memos")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN", "MAINTENANCE_ADMIN")
def add_incident_memo(incident_id):
    data = request.get_json(silent=True) or {}

    try:
        result = IncidentService.add_memo(
            incident_id=incident_id,
            data=data,
            actor_user=request.current_user,
        )

        return jsonify(
            {
                "message": "Incident memo created.",
                "data": result,
            }
        ), 201

    except IncidentError as error:
        return jsonify({"message": error.message}), error.status_code
