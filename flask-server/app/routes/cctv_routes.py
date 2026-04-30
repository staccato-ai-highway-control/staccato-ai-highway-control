from flask import Blueprint, jsonify, request

from app.services.cctv_service import CctvError, CctvService
from app.utils.security import require_auth, require_roles


cctv_bp = Blueprint("cctv", __name__, url_prefix="/cctvs")


@cctv_bp.get("")
@require_auth
def list_cctvs():
    active_only = request.args.get("active_only", "false").lower() == "true"

    return jsonify(
        {
            "data": CctvService.list_cctvs(active_only=active_only),
        }
    )


@cctv_bp.post("")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "MAINTENANCE_ADMIN")
def create_cctv():
    data = request.get_json(silent=True) or {}

    try:
        result = CctvService.create_cctv(data)
        return jsonify(
            {
                "message": "CCTV created.",
                "data": result,
            }
        ), 201

    except CctvError as error:
        return jsonify({"message": error.message}), error.status_code


@cctv_bp.get("/<int:cctv_id>")
@require_auth
def get_cctv(cctv_id):
    try:
        cctv = CctvService.get_cctv(cctv_id)
        rois = CctvService.list_rois(cctv_id)

        return jsonify(
            {
                "data": {
                    **cctv.to_dict(),
                    "rois": rois,
                },
            }
        )

    except CctvError as error:
        return jsonify({"message": error.message}), error.status_code


@cctv_bp.patch("/<int:cctv_id>")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "MAINTENANCE_ADMIN")
def update_cctv(cctv_id):
    data = request.get_json(silent=True) or {}

    try:
        result = CctvService.update_cctv(cctv_id, data)
        return jsonify(
            {
                "message": "CCTV updated.",
                "data": result,
            }
        )

    except CctvError as error:
        return jsonify({"message": error.message}), error.status_code


@cctv_bp.delete("/<int:cctv_id>")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "MAINTENANCE_ADMIN")
def deactivate_cctv(cctv_id):
    try:
        result = CctvService.deactivate_cctv(cctv_id)
        return jsonify(
            {
                "message": "CCTV deactivated.",
                "data": result,
            }
        )

    except CctvError as error:
        return jsonify({"message": error.message}), error.status_code


@cctv_bp.get("/<int:cctv_id>/rois")
@require_auth
def list_rois(cctv_id):
    active_only = request.args.get("active_only", "false").lower() == "true"

    try:
        return jsonify(
            {
                "data": CctvService.list_rois(cctv_id, active_only=active_only),
            }
        )

    except CctvError as error:
        return jsonify({"message": error.message}), error.status_code


@cctv_bp.post("/<int:cctv_id>/rois")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "MAINTENANCE_ADMIN")
def create_roi(cctv_id):
    data = request.get_json(silent=True) or {}

    try:
        result = CctvService.create_roi(cctv_id, data)
        return jsonify(
            {
                "message": "ROI created.",
                "data": result,
            }
        ), 201

    except CctvError as error:
        return jsonify({"message": error.message}), error.status_code


@cctv_bp.patch("/<int:cctv_id>/rois/<int:roi_id>")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "MAINTENANCE_ADMIN")
def update_roi(cctv_id, roi_id):
    data = request.get_json(silent=True) or {}

    try:
        result = CctvService.update_roi(cctv_id, roi_id, data)
        return jsonify(
            {
                "message": "ROI updated.",
                "data": result,
            }
        )

    except CctvError as error:
        return jsonify({"message": error.message}), error.status_code


@cctv_bp.delete("/<int:cctv_id>/rois/<int:roi_id>")
@require_roles("SUPER_ADMIN", "CONTROL_ADMIN", "MAINTENANCE_ADMIN")
def deactivate_roi(cctv_id, roi_id):
    try:
        result = CctvService.deactivate_roi(cctv_id, roi_id)
        return jsonify(
            {
                "message": "ROI deactivated.",
                "data": result,
            }
        )

    except CctvError as error:
        return jsonify({"message": error.message}), error.status_code
