import os
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|max_delay;500000")

import sys
import time
from typing import Dict, Any

import cv2
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from .camera.usb_camera import USBCamera
from .camera.rtsp_client import RTSPClient
from .camera.frame_streamer import MJPEGStreamer
from .camera.camera_config import camera_config

ROOT_ENV_PATH = os.path.join(ROOT_DIR, ".env")
if os.path.exists(ROOT_ENV_PATH):
    from dotenv import load_dotenv
    load_dotenv(ROOT_ENV_PATH, override=True)

app = FastAPI(title="IPCAM Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5001",
        "http://127.0.0.1:5001",
        "http://192.168.0.161:5001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 카메라 인스턴스 관리
cameras = {}
streamers = {}


def resolve_camera_source(source: str) -> str:
    rtsp_aliases = {
        "ipcam": "IPCAM_RTSP_URL_1",
        "rtsp": "IPCAM_RTSP_URL_1",
        "ipcam1": "IPCAM_RTSP_URL_1",
        "ipcam2": "IPCAM_RTSP_URL_2",
        "ipcam3": "IPCAM_RTSP_URL_3",
    }
    env_key = rtsp_aliases.get(source)
    if not env_key:
        return source

    fallback = os.getenv("IPCAM_RTSP_URL", camera_config.get_config("rtsp").get("url", ""))
    if source in ("ipcam", "rtsp", "ipcam1"):
        return os.getenv(env_key) or fallback
    return os.getenv(env_key, "")


def get_camera(source: str) -> tuple:
    """카메라 소스에 따른 카메라 객체 반환"""
    source = resolve_camera_source(source)
    if not source:
        raise HTTPException(status_code=400, detail="RTSP URL is not configured for this IP camera")

    if source.startswith('rtsp://') or source.startswith('http://'):
        if source not in cameras:
            cameras[source] = RTSPClient(source)
        return cameras[source], 'rtsp'
    else:
        # USB 카메라로 가정
        try:
            index = int(source)
            camera_key = f"usb_{index}"
            if camera_key not in cameras:
                cameras[camera_key] = USBCamera(index)
            return cameras[camera_key], 'usb'
        except ValueError:
            # 기본 카메라
            camera_key = "usb_0"
            if camera_key not in cameras:
                cameras[camera_key] = USBCamera(0)
            return cameras[camera_key], 'usb'


def get_streamer(source: str) -> MJPEGStreamer:
    """스트리머 객체 반환"""
    if source not in streamers:
        camera, camera_type = get_camera(source)
        streamers[source] = MJPEGStreamer(camera.read_frame)
    return streamers[source]


@app.get("/health")
def health():
    return {"status": "ok", "server": "ipcam_server"}


@app.get("/stream")
def stream(source: str = Query("0")):
    """MJPEG 스트림 제공"""
    try:
        camera, camera_type = get_camera(source)

        # 카메라 열기
        if not camera.is_opened:
            if not camera.open():
                raise HTTPException(status_code=500, detail="카메라를 열 수 없습니다")

        # 스트리머 시작
        streamer = get_streamer(source)
        streamer.start_streaming()

        return StreamingResponse(
            streamer.generate_frames(),
            media_type="multipart/x-mixed-replace; boundary=frame",
            headers={"Cache-Control": "no-cache"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트림 오류: {str(e)}")


@app.get("/cameras")
def list_cameras():
    """사용 가능한 카메라 목록"""
    return {
        "cameras": list(cameras.keys()),
        "streamers": {k: v.get_stream_info() for k, v in streamers.items()}
    }


@app.get("/camera/{source}/info")
def camera_info(source: str):
    """카메라 정보"""
    try:
        camera, camera_type = get_camera(source)
        if not camera.is_opened:
            camera.open()

        return {
            "source": source,
            "type": camera_type,
            "is_opened": camera.is_opened,
            "properties": camera.get_properties() if hasattr(camera, 'get_properties') else {}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카메라 정보 조회 오류: {str(e)}")


@app.post("/camera/{source}/open")
def open_camera(source: str):
    """카메라 열기"""
    try:
        camera, camera_type = get_camera(source)
        success = camera.open()
        return {"success": success, "source": source, "type": camera_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카메라 열기 오류: {str(e)}")


@app.post("/camera/{source}/close")
def close_camera(source: str):
    """카메라 닫기"""
    try:
        if source in cameras:
            cameras[source].close()
            return {"success": True, "source": source}
        else:
            return {"success": False, "message": "카메라를 찾을 수 없습니다"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카메라 닫기 오류: {str(e)}")


@app.get("/stream/{source}/info")
def stream_info(source: str):
    """스트림 정보"""
    try:
        streamer = get_streamer(source)
        return streamer.get_stream_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트림 정보 조회 오류: {str(e)}")
