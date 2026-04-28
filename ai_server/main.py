import os
import shutil
import sys
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from .inference.detector import detect_image, detect_video

BASE_DIR = Path(__file__).resolve().parent
TEMP_DIR = BASE_DIR / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "tiff"}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "mkv", "webm", "ts"}

app = FastAPI(title="AI Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "server": "ai_server"}


def allowed_file(filename: str, allowed_ext: set[str]) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_ext


async def save_upload_file(upload_file: UploadFile, destination: Path) -> None:
    file_bytes = await upload_file.read()
    destination.write_bytes(file_bytes)


@app.post("/infer/image")
async def infer_image(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="이미지 파일이 필요합니다.")

    if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(status_code=400, detail="지원하지 않는 이미지 형식입니다.")

    safe_name = os.path.basename(file.filename)
    temp_path = TEMP_DIR / f"{uuid.uuid4().hex}_{safe_name}"

    try:
        await save_upload_file(file, temp_path)
        detections = detect_image(str(temp_path))
        return {"success": True, "detections": detections}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI 추론 중 오류가 발생했습니다.: {exc}")
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass


@app.post("/infer/video")
async def infer_video(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="영상 파일이 필요합니다.")

    if not allowed_file(file.filename, ALLOWED_VIDEO_EXTENSIONS):
        raise HTTPException(status_code=400, detail="지원하지 않는 영상 형식입니다.")

    safe_name = os.path.basename(file.filename)
    temp_path = TEMP_DIR / f"{uuid.uuid4().hex}_{safe_name}"

    try:
        await save_upload_file(file, temp_path)
        detections = detect_video(str(temp_path))
        return {"success": True, "detections": detections}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI 추론 중 오류가 발생했습니다.: {exc}")
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass
