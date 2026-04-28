"""
Flask API 서버 실행 파일
"""

import os
import sys
from sqlalchemy import text

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import create_app
from app.extensions import db, socketio


app = create_app()

with app.app_context():
    try:
        db.session.execute(text("SELECT 1"))
        print("✅ DB 연결 성공")
    except Exception as e:
        print("❌ DB 연결 실패:", e)


# 실시간 알림을 위한 소켓 연동으로 변경
if __name__ == "__main__":
    # 디버그 모드 활성화
    os.environ["FLASK_ENV"] = "development"
    os.environ["FLASK_DEBUG"] = "1"
    
    socketio.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("FLASK_PORT", "5001")),
        debug=True, # 개발용이라 허용
        allow_unsafe_werkzeug=True # 개발용이라 허용
    )
