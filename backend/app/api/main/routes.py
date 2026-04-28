from flask import Blueprint, jsonify, render_template
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.alert_model import Alert
from app.models.detection_model import Detection
from app.models.report_model import Report

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    return render_template("main/index.html")


@main_bp.route("/health")
def health():
    return jsonify({"status": "ok", "server": "flask_backend"})


def _format_datetime(value):
    return value.strftime("%Y-%m-%d %H:%M:%S") if value else None


def _report_to_dict(report):
    return {
        "id": report.id,
        "title": report.title,
        "content": report.content,
        "reportType": report.report_type,
        "locationText": report.location_text,
        "latitude": float(report.latitude) if report.latitude is not None else None,
        "longitude": float(report.longitude) if report.longitude is not None else None,
        "riskLevel": report.risk_level,
        "status": report.status,
        "createdAt": _format_datetime(report.created_at),
        "updatedAt": _format_datetime(report.updated_at),
    }


def _alert_to_dict(alert):
    return {
        "id": alert.id,
        "reportId": alert.report_id,
        "detectionId": alert.detection_id,
        "level": alert.alert_level,
        "message": alert.message,
        "isRead": bool(alert.is_read),
        "createdAt": _format_datetime(alert.created_at),
        "readAt": _format_datetime(alert.read_at),
    }


def _safe_count(query):
    try:
        return query.count()
    except SQLAlchemyError:
        db.session.rollback()
        return 0


@main_bp.route("/api/dashboard/stats")
def dashboard_stats():
    total_reports = _safe_count(Report.query.filter(Report.deleted_at.is_(None)))
    active_alerts = _safe_count(Alert.query.filter(Alert.is_read.is_(False)))
    processed_videos = _safe_count(Detection.query)

    return jsonify({
        "totalReports": total_reports,
        "activeAlerts": active_alerts,
        "processedVideos": processed_videos,
        "systemUptime": "00:00:00",
    })


@main_bp.route("/api/alerts/realtime")
def realtime_alerts():
    try:
        alerts = (
            Alert.query
            .order_by(Alert.created_at.desc())
            .limit(50)
            .all()
        )
    except SQLAlchemyError:
        db.session.rollback()
        alerts = []
    return jsonify({"alerts": [_alert_to_dict(alert) for alert in alerts]})


@main_bp.route("/api/alerts/<int:alert_id>/acknowledge", methods=["POST"])
def acknowledge_alert(alert_id):
    alert = Alert.query.get_or_404(alert_id)
    alert.is_read = True
    alert.read_at = db.func.current_timestamp()
    db.session.commit()

    return jsonify({"success": True, "alert": _alert_to_dict(alert)})


@main_bp.route("/api/reports")
def reports():
    try:
        reports_data = (
            Report.query
            .filter(Report.deleted_at.is_(None))
            .order_by(Report.created_at.desc())
            .limit(50)
            .all()
        )
    except SQLAlchemyError:
        db.session.rollback()
        reports_data = []
    return jsonify({"reports": [_report_to_dict(report) for report in reports_data]})


@main_bp.route("/api/reports/<int:report_id>")
def report_detail(report_id):
    report = Report.query.filter(
        Report.id == report_id,
        Report.deleted_at.is_(None)
    ).first_or_404()

    return jsonify(_report_to_dict(report))
