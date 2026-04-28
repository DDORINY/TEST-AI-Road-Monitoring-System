import os
from typing import Any, Dict, List

import requests


ITS_CCTV_URL = "https://openapi.its.go.kr:9443/cctvInfo"

REGIONS: Dict[str, Dict[str, Any]] = {
    "all": {
        "name": "전국",
        "min_x": 124.0,
        "max_x": 132.0,
        "min_y": 33.0,
        "max_y": 39.5,
    },
    "seoul": {
        "name": "서울",
        "min_x": 126.76,
        "max_x": 127.18,
        "min_y": 37.41,
        "max_y": 37.70,
    },
    "gyeonggi": {
        "name": "경기",
        "min_x": 126.35,
        "max_x": 127.85,
        "min_y": 36.85,
        "max_y": 38.35,
    },
    "incheon": {
        "name": "인천",
        "min_x": 126.30,
        "max_x": 126.85,
        "min_y": 37.20,
        "max_y": 37.65,
    },
    "daejeon": {
        "name": "대전",
        "min_x": 127.25,
        "max_x": 127.55,
        "min_y": 36.20,
        "max_y": 36.50,
    },
    "daegu": {
        "name": "대구",
        "min_x": 128.35,
        "max_x": 128.75,
        "min_y": 35.75,
        "max_y": 36.05,
    },
    "busan": {
        "name": "부산",
        "min_x": 128.75,
        "max_x": 129.35,
        "min_y": 35.00,
        "max_y": 35.40,
    },
    "gwangju": {
        "name": "광주",
        "min_x": 126.70,
        "max_x": 127.00,
        "min_y": 35.05,
        "max_y": 35.30,
    },
    "ulsan": {
        "name": "울산",
        "min_x": 129.00,
        "max_x": 129.50,
        "min_y": 35.35,
        "max_y": 35.75,
    },
    "jeju": {
        "name": "제주",
        "min_x": 126.10,
        "max_x": 126.95,
        "min_y": 33.10,
        "max_y": 33.65,
    },
}


def get_regions() -> List[Dict[str, str]]:
    return [
        {"code": code, "name": region["name"]}
        for code, region in REGIONS.items()
    ]


def fetch_cctv_by_region(
    region_code: str = "all",
    road_type: str = "its",
    cctv_type: str = "4",
) -> Dict[str, Any]:
    api_key = os.getenv("ITS_API_KEY")
    if not api_key:
        raise RuntimeError("ITS_API_KEY is not configured")

    region = REGIONS.get(region_code, REGIONS["all"])
    params = {
        "apiKey": api_key,
        "type": road_type,
        "cctvType": cctv_type,
        "minX": region["min_x"],
        "maxX": region["max_x"],
        "minY": region["min_y"],
        "maxY": region["max_y"],
        "getType": "json",
    }

    response = requests.get(ITS_CCTV_URL, params=params, timeout=10)
    response.raise_for_status()
    payload = response.json()

    raw_items = _extract_items(payload)
    return {
        "region": {"code": region_code, "name": region["name"]},
        "count": len(raw_items),
        "items": [_normalize_cctv(item) for item in raw_items],
        "raw": payload,
    }


def _extract_items(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    response = payload.get("response")
    if isinstance(response, dict):
        data = response.get("data", [])
        if isinstance(data, list):
            return data

    data = payload.get("data", [])
    if isinstance(data, list):
        return data

    return []


def _normalize_cctv(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": item.get("cctvname") or item.get("cctvName"),
        "url": item.get("cctvurl") or item.get("cctvUrl"),
        "format": item.get("cctvformat") or item.get("cctvFormat"),
        "x": _to_float(item.get("coordx") or item.get("coordX")),
        "y": _to_float(item.get("coordy") or item.get("coordY")),
        "roadSectionId": item.get("roadsectionid") or item.get("roadSectionId"),
        "updatedAt": item.get("filecreatetime") or item.get("fileCreateTime"),
        "raw": item,
    }


def _to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
