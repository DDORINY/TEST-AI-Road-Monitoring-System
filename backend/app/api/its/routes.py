# app/api/its/routes.py
from flask import Blueprint, jsonify, request
from app.services.its_service import get_regions, fetch_cctv_by_region

its_bp = Blueprint("its", __name__, url_prefix="/api/its")


@its_bp.get("/regions")
def regions():
    return jsonify({
        "status": "success",
        "regions": get_regions()
    })


@its_bp.get("/cctv")
def cctv_list():
    region = request.args.get("region", "all")
    road_type = request.args.get("type", "its")
    cctv_type = request.args.get("cctvType", "4")

    try:
        result = fetch_cctv_by_region(
            region_code=region,
            road_type=road_type,
            cctv_type=cctv_type,
        )

        return jsonify({
            "status": "success",
            **result
        })

    except Exception as e:
        return jsonify({
            "status": "fail",
            "message": str(e)
        }), 500