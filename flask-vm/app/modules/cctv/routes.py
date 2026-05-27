from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Cctv


cctv_bp = Blueprint("cctv", __name__, url_prefix="/api")


def _parse_is_active(raw_value):
    if raw_value is None:
        return None

    text = str(raw_value).strip().lower()
    if text in {"1", "true", "yes"}:
        return 1
    if text in {"0", "false", "no"}:
        return 0
    return None


def _serialize_cctv(item: Cctv) -> dict:
    data = item.to_dict()
    data.update({
        "camera_id": item.cctv_code,
        "camera_name": item.cctv_name,
        "name": item.cctv_name,
        "status": "ACTIVE" if item.is_active else "INACTIVE",
        "active": bool(item.is_active),
    })
    return data


def _list_cctvs():
    query = Cctv.query

    is_active = _parse_is_active(request.args.get("is_active"))
    if is_active is not None:
        query = query.filter(Cctv.is_active == is_active)

    road_name = (request.args.get("road_name") or "").strip()
    if road_name:
        query = query.filter(Cctv.road_name == road_name)

    items = (
        query
        .order_by(Cctv.id.asc())
        .all()
    )

    return [_serialize_cctv(item) for item in items]


def _get_cctv_by_code(code: str):
    clean_code = str(code or "").strip()
    if not clean_code:
        return None

    return Cctv.query.filter(Cctv.cctv_code == clean_code).first()


def _get_cctv_by_id_or_code(identifier: str):
    clean_identifier = str(identifier or "").strip()
    if not clean_identifier:
        return None

    if clean_identifier.isdigit():
        item = db.session.get(Cctv, int(clean_identifier))
        if item is not None:
            return item

    return _get_cctv_by_code(clean_identifier)


@cctv_bp.get("/cctvs")
def get_cctvs():
    items = _list_cctvs()

    return jsonify({
        "success": True,
        "count": len(items),
        "items": items,
    }), 200


@cctv_bp.get("/cctvs/<int:cctv_id>")
def get_cctv_detail(cctv_id: int):
    item = db.session.get(Cctv, cctv_id)
    if item is None:
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    return jsonify({
        "success": True,
        "item": _serialize_cctv(item),
    }), 200


@cctv_bp.get("/cctvs/code/<cctv_code>")
def get_cctv_by_code(cctv_code: str):
    item = _get_cctv_by_code(cctv_code)
    if item is None and not str(cctv_code or "").strip():
        return jsonify({
            "success": False,
            "error": "cctv_code is required.",
        }), 400

    if item is None:
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    return jsonify({
        "success": True,
        "item": _serialize_cctv(item),
    }), 200


@cctv_bp.get("/cameras")
def get_cameras():
    cameras = _list_cctvs()

    return jsonify({
        "ok": True,
        "success": True,
        "count": len(cameras),
        "cameras": cameras,
    }), 200


@cctv_bp.get("/cameras/<camera_id>")
def get_camera(camera_id: str):
    item = _get_cctv_by_id_or_code(camera_id)
    if item is None:
        return jsonify({
            "ok": False,
            "success": False,
            "error": "camera not found",
        }), 404

    return jsonify({
        "ok": True,
        "success": True,
        "camera": _serialize_cctv(item),
    }), 200
