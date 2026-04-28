# AI-accident-detection\n\n이 프로젝트는 서버를 분리하여 다음과 같이 구성됩니다.

- `run.py` → Flask API 서버 실행: `http://localhost:5000`
- `ai_server.py` → AI 추론 서버 실행: `http://localhost:8000`
- `ipcam_server.py` → IPCAM / USB CAM 스트리밍 서버 실행: `http://localhost:7000`
- `frontend/` → 프론트엔드 서버 실행: `http://localhost:3000`

## 실행 방법

### Flask API 서버
```bash
python run.py
```

### AI 서버
```bash
python ai_server.py
```

### IPCAM 스트리밍 서버
```bash
python ipcam_server.py
```

### 프론트엔드 서버
```bash
cd frontend
npm install
npm run dev
```

## AI 서버 엔드포인트

- `GET /health`
- `POST /infer/image` : 이미지 파일 업로드 후 추론
- `POST /infer/video` : 영상 파일 업로드 후 추론

## IPCAM 서버 엔드포인트

- `GET /health`
- `GET /stream?source=0` : 기본 USB 카메라 스트리밍
- `GET /stream?source=rtsp://...` : RTSP 카메라 스트리밍

