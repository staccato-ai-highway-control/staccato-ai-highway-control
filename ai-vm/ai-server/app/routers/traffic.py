import requests
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.config import (
    ITS_CCTV_DEFAULT_MAX_X,
    ITS_CCTV_DEFAULT_MAX_Y,
    ITS_CCTV_DEFAULT_MIN_X,
    ITS_CCTV_DEFAULT_MIN_Y,
    ITS_CCTV_DEFAULT_ROAD_TYPE,
    ITS_CCTV_DEFAULT_TYPE,
)
from app.its_openapi import get_its_cctv_list


router = APIRouter(tags=["Traffic CCTV"])


@router.get("/traffic/api/cctv")
def traffic_cctv_api(
    min_x: str = Query(ITS_CCTV_DEFAULT_MIN_X, alias="minX"),
    max_x: str = Query(ITS_CCTV_DEFAULT_MAX_X, alias="maxX"),
    min_y: str = Query(ITS_CCTV_DEFAULT_MIN_Y, alias="minY"),
    max_y: str = Query(ITS_CCTV_DEFAULT_MAX_Y, alias="maxY"),
    cctv_type: str = Query(ITS_CCTV_DEFAULT_TYPE, alias="cctvType"),
    road_type: str = Query(ITS_CCTV_DEFAULT_ROAD_TYPE, alias="roadType"),
):
    try:
        cctv_list = get_its_cctv_list(
            min_x=min_x,
            max_x=max_x,
            min_y=min_y,
            max_y=max_y,
            cctv_type=cctv_type,
            road_type=road_type,
        )
    except ValueError as error:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(error), "data": []},
        )
    except requests.RequestException as error:
        return JSONResponse(
            status_code=502,
            content={
                "success": False,
                "message": f"ITS API request failed: {error}",
                "data": [],
            },
        )
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"CCTV list fetch failed: {error}",
                "data": [],
            },
        )

    return {
        "success": True,
        "message": "CCTV list fetched",
        "data": cctv_list,
    }
