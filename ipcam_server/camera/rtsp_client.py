"""RTSP camera client."""

import logging
import threading
import time
from typing import Dict, Optional, Tuple

import cv2

from .camera_config import camera_config

logger = logging.getLogger(__name__)


class RTSPClient:
    """Manage a single RTSP stream."""

    def __init__(self, rtsp_url: str):
        self.rtsp_url = rtsp_url
        self.capture: Optional[cv2.VideoCapture] = None
        self.is_opened = False
        self.last_frame_time = 0
        self.reconnect_attempts = 0
        self.read_failures = 0
        self.last_reconnect_time = 0
        self.config = camera_config.get_config("rtsp")
        self.lock = threading.RLock()

    def open(self) -> bool:
        with self.lock:
            try:
                if self.capture is not None:
                    self.capture.release()
                    self.capture = None

                self.capture = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
                self.capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)

                if self.capture.isOpened():
                    self.is_opened = True
                    self.reconnect_attempts = 0
                    self.read_failures = 0
                    logger.info("RTSP stream opened")
                    return True

                self.is_opened = False
                logger.error("RTSP stream open failed")
                return False
            except Exception as exc:
                self.is_opened = False
                logger.error("RTSP stream init error: %s", exc)
                return False

    def read_frame(self) -> Tuple[bool, Optional[object]]:
        with self.lock:
            if not self.is_opened or self.capture is None:
                return False, None

            try:
                ok, frame = self.capture.read()
                if ok:
                    self.last_frame_time = time.time()
                    self.read_failures = 0
                    return True, frame

                self.read_failures += 1
                logger.warning("RTSP frame read failed")
                self._reconnect_if_needed()
                return False, None
            except Exception as exc:
                self.read_failures += 1
                logger.error("RTSP frame read error: %s", exc)
                self._reconnect_if_needed()
                return False, None

    def _reconnect_if_needed(self):
        now = time.time()
        if self.read_failures < 5 or now - self.last_reconnect_time < 3:
            return

        logger.warning("RTSP reconnect after %s failed reads", self.read_failures)
        self.last_reconnect_time = now
        self.close()
        time.sleep(0.3)
        self.open()

    def close(self):
        with self.lock:
            if self.capture is not None:
                self.capture.release()
                self.capture = None
            self.is_opened = False
            logger.info("RTSP stream closed")

    def is_alive(self) -> bool:
        if not self.is_opened:
            return False
        return (time.time() - self.last_frame_time) < 10

    def get_properties(self) -> Dict[str, float]:
        with self.lock:
            if not self.is_opened or self.capture is None:
                return {}

            return {
                "width": self.capture.get(cv2.CAP_PROP_FRAME_WIDTH),
                "height": self.capture.get(cv2.CAP_PROP_FRAME_HEIGHT),
                "fps": self.capture.get(cv2.CAP_PROP_FPS),
                "codec": self.capture.get(cv2.CAP_PROP_FOURCC),
            }
