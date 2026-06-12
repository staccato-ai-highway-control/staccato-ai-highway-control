"""bbox 관련 공통 변환과 검증 기능을 제공한다.

라우트와 서비스가 동일한 입력 규칙 및 응답 계약을 재사용하도록 돕는다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: typing에서 Any 이름을 가져와 아래 로직에서 재사용한다.
from typing import Any


# 설명: `build_bbox_metadata` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.
def build_bbox_metadata(
    bbox: Any,
    *,
    coordinate_space: str | None = None,
    frame_width: int | None = None,
    frame_height: int | None = None,
) -> dict:
    # 설명: `normalized`에 `_normalize_bbox` 호출 결과를 저장해 다음 처리에서 사용한다.
    normalized = _normalize_bbox(bbox)
    # 설명: `present`에 bbox not in (None, '', [], {}) 표현식의 계산 결과를 저장한다.
    present = bbox not in (None, "", [], {})
    # 설명: 호출자에게 {'present': present, 'valid': normalized is not None, 'format': 'xyxy' if norma... 값을 함수 결과로 반환한다.
    return {
        "present": present,
        "valid": normalized is not None,
        "format": "xyxy" if normalized is not None else None,
        "coordinate_space": coordinate_space or "PIXEL",
        "frame_width": frame_width,
        "frame_height": frame_height,
        "coordinates": normalized,
        "error": "INVALID_BBOX_FORMAT" if present and normalized is None else None,
    }


# 설명: `_normalize_bbox` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_bbox(value: Any) -> dict[str, float] | None:
    # 설명: `isinstance(value, dict)` 조건 결과에 따라 실행 경로를 분기한다.
    if isinstance(value, dict):
        # 설명: `keys`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        keys = ("x1", "y1", "x2", "y2")
        # 설명: `not all((key in value for key in keys))` 조건 결과에 따라 실행 경로를 분기한다.
        if not all(key in value for key in keys):
            # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
            return None
        # 설명: `raw_values`에 [value[key] for key in keys] 표현식의 계산 결과를 저장한다.
        raw_values = [value[key] for key in keys]
    # 설명: `isinstance(value, (list, tuple)) and len(value) == 4` 조건 결과에 따라 실행 경로를 분기한다.
    elif isinstance(value, (list, tuple)) and len(value) == 4:
        # 설명: `keys`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        keys = ("x1", "y1", "x2", "y2")
        # 설명: `raw_values`에 `list` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw_values = list(value)
    else:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `coordinates`에 {key: float(raw_value) for key, raw_value in zip(keys, raw_values)} 표현식의 계산 결과를 저장한다.
        coordinates = {
            key: float(raw_value)
            for key, raw_value in zip(keys, raw_values)
        }
    except (TypeError, ValueError):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `coordinates['x2'] <= coordinates['x1'] or coordinates['y2'] <= coordinates['y1']` 조건 결과에 따라 실행 경로를 분기한다.
    if coordinates["x2"] <= coordinates["x1"] or coordinates["y2"] <= coordinates["y1"]:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 coordinates 값을 함수 결과로 반환한다.
    return coordinates
