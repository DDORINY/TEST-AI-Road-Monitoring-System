"""USB camera client."""

import logging
import threading
from typing import Dict, Optional, Tuple

import cv2

from .camera_config import camera_config

logger = logging.getLogger(__name__)


class USBCamera:
    """Manage one USB camera device."""

    def __init__(self, camera_index: int = 0):
        self.camera_index = camera_index
        self.capture: Optional[cv2.VideoCapture] = None
        self.is_opened = False
        self.config = camera_config.get_config("usb")
        self.lock = threading.RLock()

    def open(self) -> bool:
        with self.lock:
            try:
                if self.capture is not None:
                    self.capture.release()
                    self.capture = None

                self.capture = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
                if not self.capture.isOpened():
                    self.capture.release()
                    self.capture = cv2.VideoCapture(self.camera_index)

                if self.capture.isOpened():
                    config = camera_config.get_config("default")
                    self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, config["width"])
                    self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, config["height"])
                    self.capture.set(cv2.CAP_PROP_FPS, config["fps"])
                    self.capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    self.is_opened = True
                    logger.info("USB camera %s opened", self.camera_index)
                    return True

                self.is_opened = False
                logger.error("USB camera %s open failed", self.camera_index)
                return False
            except Exception as exc:
                self.is_opened = False
                logger.error("USB camera %s init error: %s", self.camera_index, exc)
                return False

    def read_frame(self) -> Tuple[bool, Optional[object]]:
        with self.lock:
            if not self.is_opened or self.capture is None:
                return False, None

            try:
                return self.capture.read()
            except Exception as exc:
                logger.error("USB camera frame read error: %s", exc)
                return False, None

    def close(self):
        with self.lock:
            if self.capture is not None:
                self.capture.release()
                self.capture = None
            self.is_opened = False
            logger.info("USB camera %s closed", self.camera_index)

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
