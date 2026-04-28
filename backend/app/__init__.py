"""
Flask 애플리케이션을 생성하는 파일
"""

from flask import Flask, session, request
from werkzeug.exceptions import RequestEntityTooLarge

from .config import Config
from .extensions import db, migrate, socketio
from app.common.response import error_response


ALLOWED_DEV_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}


def create_app():
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static"
    )

    # -------------------------------------------------
    # 앱 설정 로드
    # -------------------------------------------------
    app.config.from_object(Config)

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in ALLOWED_DEV_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response

    # -------------------------------------------------
    # 전역 업로드 용량 초과(413) 처리
    # - Config.MAX_CONTENT_LENGTH를 초과하면 여기로 떨어짐
    # -------------------------------------------------
    @app.errorhandler(RequestEntityTooLarge)
    def handle_request_too_large(e):
        return error_response(
            message="업로드 가능한 최대 용량(50MB)을 초과했습니다.",
            status_code=413
        )

    # -------------------------------------------------
    # Flask 확장 초기화
    # -------------------------------------------------
    # DB 초기화
    db.init_app(app)

    # migration 초기화
    migrate.init_app(app, db)

    # 소켓 초기화
    socketio.init_app(app)

    # -------------------------------------------------
    # 모델 로딩
    # - SQLAlchemy가 모델을 인식할 수 있도록 앱 컨텍스트 안에서 import
    # -------------------------------------------------
    with app.app_context():
        from . import models

    # -----------------------------
    # 템플릿 공통 변수 주입
    # -----------------------------
    @app.context_processor
    def inject_user_state():
        """
        모든 템플릿에서 로그인 상태 / 관리자 여부를 공통으로 사용하기 위한 값 주입

        base.html 에서 사용 예:
        {% if is_logged_in and is_admin %}
            실시간 알림 CSS / JS / 오디오 / 토스트 영역 로드
        {% endif %}

        모든 템플릿에서 로그인 상태 / 관리자 여부 / 관리자 사이드바 카운트를 공통 사용
        """
        is_logged_in = "user_id" in session
        is_admin = session.get("role") == "admin"
        user_name = session.get("name")

        admin_pending_report_count = 0
        admin_pending_role_count = 0

        if is_admin:
            from app.models.report_model import Report
            from app.models.role_request_model import RoleRequest

            admin_pending_report_count = Report.query.filter(
                Report.deleted_at.is_(None),
                Report.status == "접수"
            ).count()

            admin_pending_role_count = RoleRequest.query.filter(
                RoleRequest.status == "대기"
            ).count()

        endpoint = request.endpoint or ""
        active_member = None

        if endpoint.startswith("main."):
            active_member = "kdh"
        elif endpoint.startswith("report."):
            active_member = "smg"
        elif endpoint.startswith("report_list."):
            active_member = "lhj"
        elif endpoint.startswith("realtime_monitor."):
            active_member = "kdk"
        elif endpoint.startswith("admin_realtime_alert."):
            active_member = "kdk"
        elif endpoint.startswith("admin."):
            active_member = "kdh"

        return {
            "is_logged_in": is_logged_in,
            "is_admin": is_admin,
            "user_name": user_name,
            "admin_pending_report_count": admin_pending_report_count,
            "admin_pending_role_count": admin_pending_role_count,
            "active_member": active_member
        }

    # -----------------------------
    # 블루프린트 등록
    # -----------------------------
    from app.api.auth.routes import auth_bp
    from app.api.main.routes import main_bp
    from app.api.report.routes import report_bp
    from app.api.admin.dashboard_routes import admin_bp
    from app.api.admin.report_routes import admin_report_bp
    from app.api.admin.user_routes import admin_user_bp
    from app.api.admin.ai_compare_routes import admin_ai_bp
    from app.api.myreport.routes import report_list_bp
    from app.api.admin.realtime_alert_routes import admin_realtime_alert_bp
    from app.api.realtime.routes import realtime_monitor_bp
    from app.api.kakao.routes import kakao_navigation_bp
    from app.api.admin.region_analysis_routes import admin_region_analysis_bp
    from app.api.board.routes import board_bp
    from app.api.its.routes import its_bp

    from app.models import BoardPost, BoardComment

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(admin_report_bp)
    app.register_blueprint(admin_user_bp)
    app.register_blueprint(admin_ai_bp)
    app.register_blueprint(report_list_bp)
    app.register_blueprint(admin_realtime_alert_bp)
    app.register_blueprint(realtime_monitor_bp)
    app.register_blueprint(kakao_navigation_bp)
    app.register_blueprint(admin_region_analysis_bp)
    app.register_blueprint(board_bp)
    app.register_blueprint(its_bp)


    # -----------------------------
    # 소켓 이벤트 등록
    # - import만 해도 이벤트 핸들러가 등록되도록 구성
    # -----------------------------
    from app.socket_events import admin_realtime_alert_socket  # noqa: F401

    return app
