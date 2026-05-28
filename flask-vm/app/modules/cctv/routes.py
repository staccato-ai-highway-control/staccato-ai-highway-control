from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Cctv, CctvRoi, CctvSlot, CctvStatusLog


cctv_bp = Blueprint("cctv", __name__, url_prefix="/api")


CCTV_WRITE_FIELDS = {
    "cctv_code",
    "cctv_name",
    "stream_url",
    "location_name",
    "road_name",
    "direction",
    "latitude",
    "longitude",
    "is_active",
    "installed_at",
}


def _parse_is_active(raw_value):
    if raw_value is None:
        return None

    text = str(raw_value).strip().lower()
    if text in {"1", "true", "yes"}:
        return 1
    if text in {"0", "false", "no"}:
        return 0
    return None


def _utc_now_naive() -> datetime:
    return datetime.utcnow().replace(microsecond=0)


def _clean_string(value):
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def _parse_decimal(value, field_name: str):
    if value in (None, ""):
        return None

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"{field_name} must be a number.") from exc


def _parse_date(value, field_name: str):
    if value in (None, ""):
        return None

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value).strip())
    except ValueError as exc:
        raise ValueError(f"{field_name} must be YYYY-MM-DD.") from exc


def _bool_to_int(value, field_name: str = "is_active"):
    parsed = _parse_is_active(value)
    if parsed is None and value is not None:
        raise ValueError(f"{field_name} must be 1/0 or true/false.")
    return parsed


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


def _serialize_roi(item: CctvRoi) -> dict:
    data = item.to_dict()
    data.update({
        "roi_id": item.id,
        "points": item.polygon_json,
        "polygon": item.polygon_json,
        "active": bool(item.is_active),
    })
    return data


def _latest_status_log(cctv_id: int):
    return (
        CctvStatusLog.query
        .filter(CctvStatusLog.cctv_id == cctv_id)
        .order_by(CctvStatusLog.checked_at.desc(), CctvStatusLog.id.desc())
        .first()
    )


def _serialize_stream_status(item: Cctv) -> dict:
    latest = _latest_status_log(item.id)
    status = latest.status if latest else ("ACTIVE" if item.is_active else "INACTIVE")

    return {
        "cctv_id": item.id,
        "cctv_code": item.cctv_code,
        "camera_id": item.cctv_code,
        "stream_url": item.stream_url,
        "status": status,
        "active": bool(item.is_active),
        "message": latest.message if latest else None,
        "checked_at": latest.checked_at.isoformat() if latest and latest.checked_at else None,
        "status_log_id": latest.id if latest else None,
    }


def _serialize_slot(slot: CctvSlot) -> dict:
    data = slot.to_dict()
    cctv = db.session.get(Cctv, slot.cctv_id) if slot.cctv_id else None

    data.update({
        "camera_id": slot.cctv_code,
        "cctv": _serialize_cctv(cctv) if cctv else None,
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


def _apply_cctv_payload(item: Cctv, payload: dict, *, partial: bool) -> None:
    if not isinstance(payload, dict):
        raise ValueError("JSON object body is required.")

    if not partial:
        missing = [
            field
            for field in ["cctv_code", "cctv_name"]
            if not _clean_string(payload.get(field))
        ]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

    if "cctv_code" in payload:
        code = _clean_string(payload.get("cctv_code"))
        if not code:
            raise ValueError("cctv_code is required.")
        item.cctv_code = code

    if "cctv_name" in payload:
        name = _clean_string(payload.get("cctv_name"))
        if not name:
            raise ValueError("cctv_name is required.")
        item.cctv_name = name

    string_fields = [
        "stream_url",
        "location_name",
        "road_name",
        "direction",
    ]
    for field in string_fields:
        if field in payload:
            setattr(item, field, _clean_string(payload.get(field)))

    if "latitude" in payload:
        item.latitude = _parse_decimal(payload.get("latitude"), "latitude")

    if "longitude" in payload:
        item.longitude = _parse_decimal(payload.get("longitude"), "longitude")

    if "is_active" in payload:
        item.is_active = _bool_to_int(payload.get("is_active"))

    if "installed_at" in payload:
        item.installed_at = _parse_date(payload.get("installed_at"), "installed_at")


def _update_slot_from_payload(slot: CctvSlot, payload: dict) -> None:
    cctv_identifier = (
        payload.get("cctv_id")
        or payload.get("cctv_code")
        or payload.get("camera_id")
    )

    if cctv_identifier in (None, ""):
        slot.cctv_id = None
        slot.cctv_code = None
    else:
        cctv = _get_cctv_by_id_or_code(str(cctv_identifier))
        if cctv is None:
            raise ValueError(f"CCTV not found for slot {slot.slot_number}.")

        slot.cctv_id = cctv.id
        slot.cctv_code = cctv.cctv_code

    slot.display_name = _clean_string(payload.get("display_name"))
    slot.layout_json = payload.get("layout")
    slot.updated_at = _utc_now_naive()


@cctv_bp.get("/cctvs")
def get_cctvs():
    items = _list_cctvs()

    return jsonify({
        "success": True,
        "count": len(items),
        "items": items,
    }), 200


@cctv_bp.post("/cctvs")
def create_cctv():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"success": False, "error": "JSON body is required."}), 400

    try:
        item = Cctv(
            is_active=1,
            created_at=_utc_now_naive(),
            updated_at=None,
        )
        _apply_cctv_payload(item, payload, partial=False)

        if _get_cctv_by_code(item.cctv_code):
            return jsonify({
                "success": False,
                "error": "cctv_code already exists.",
            }), 409

        db.session.add(item)
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "success": True,
        "item": _serialize_cctv(item),
    }), 201


@cctv_bp.get("/cctvs/stream-status")
def get_cctv_stream_statuses():
    items = (
        Cctv.query
        .order_by(Cctv.id.asc())
        .all()
    )

    statuses = [_serialize_stream_status(item) for item in items]
    return jsonify({
        "success": True,
        "count": len(statuses),
        "items": statuses,
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


@cctv_bp.put("/cctvs/<int:cctv_id>")
@cctv_bp.patch("/cctvs/<int:cctv_id>")
def update_cctv(cctv_id: int):
    item = db.session.get(Cctv, cctv_id)
    if item is None:
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"success": False, "error": "JSON body is required."}), 400

    try:
        original_code = item.cctv_code
        _apply_cctv_payload(item, payload, partial=True)

        if item.cctv_code != original_code and _get_cctv_by_code(item.cctv_code):
            return jsonify({
                "success": False,
                "error": "cctv_code already exists.",
            }), 409

        item.updated_at = _utc_now_naive()
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "success": True,
        "item": _serialize_cctv(item),
    }), 200


@cctv_bp.delete("/cctvs/<int:cctv_id>")
def delete_cctv(cctv_id: int):
    item = db.session.get(Cctv, cctv_id)
    if item is None:
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    CctvSlot.query.filter(CctvSlot.cctv_id == item.id).update({
        "cctv_id": None,
        "cctv_code": None,
        "updated_at": _utc_now_naive(),
    })
    db.session.delete(item)
    db.session.commit()

    return jsonify({
        "success": True,
        "deleted_id": cctv_id,
    }), 200


@cctv_bp.get("/cctvs/<int:cctv_id>/rois")
def get_cctv_rois(cctv_id: int):
    item = db.session.get(Cctv, cctv_id)
    if item is None:
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    query = CctvRoi.query.filter(CctvRoi.cctv_id == cctv_id)
    is_active = _parse_is_active(request.args.get("is_active"))
    if is_active is not None:
        query = query.filter(CctvRoi.is_active == is_active)

    rois = query.order_by(CctvRoi.id.asc()).all()

    return jsonify({
        "success": True,
        "cctv_id": cctv_id,
        "count": len(rois),
        "items": [_serialize_roi(roi) for roi in rois],
    }), 200


@cctv_bp.get("/cctvs/<int:cctv_id>/stream-status")
def get_cctv_stream_status(cctv_id: int):
    item = db.session.get(Cctv, cctv_id)
    if item is None:
        return jsonify({
            "success": False,
            "error": "CCTV not found.",
        }), 404

    return jsonify({
        "success": True,
        "item": _serialize_stream_status(item),
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


@cctv_bp.get("/cctv-slots")
def get_cctv_slots():
    slots = (
        CctvSlot.query
        .order_by(CctvSlot.slot_number.asc())
        .all()
    )

    return jsonify({
        "success": True,
        "count": len(slots),
        "items": [_serialize_slot(slot) for slot in slots],
    }), 200


@cctv_bp.put("/cctv-slots")
def put_cctv_slots():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"success": False, "error": "JSON body is required."}), 400

    slots_payload = payload.get("slots") if isinstance(payload, dict) else None
    if not isinstance(slots_payload, list):
        return jsonify({"success": False, "error": "slots must be a list."}), 400

    try:
        saved_slots = []
        now = _utc_now_naive()

        for slot_payload in slots_payload:
            if not isinstance(slot_payload, dict):
                raise ValueError("Each slot must be an object.")

            raw_slot_number = (
                slot_payload.get("slot_number")
                or slot_payload.get("slot")
                or slot_payload.get("slot_index")
            )
            try:
                slot_number = int(raw_slot_number)
            except (TypeError, ValueError) as exc:
                raise ValueError("slot_number is required and must be an integer.") from exc

            if slot_number <= 0:
                raise ValueError("slot_number must be greater than 0.")

            slot = CctvSlot.query.filter(CctvSlot.slot_number == slot_number).first()
            if slot is None:
                slot = CctvSlot(
                    slot_number=slot_number,
                    created_at=now,
                    updated_at=None,
                )
                db.session.add(slot)

            _update_slot_from_payload(slot, slot_payload)
            saved_slots.append(slot)

        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "success": True,
        "count": len(saved_slots),
        "items": [_serialize_slot(slot) for slot in saved_slots],
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
