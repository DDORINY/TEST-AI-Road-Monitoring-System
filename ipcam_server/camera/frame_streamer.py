"""MJPEG frame streamer."""

import logging
import time
from typing import Callable, Dict, Iterator, Optional, Tuple

import cv2
import numpy as np

from .camera_config import camera_config

logger = logging.getLogger(__name__)


class MJPEGStreamer:
    """Generate multipart MJPEG bytes from a camera frame source."""

    def __init__(self, frame_source: Callable[[], Tuple[bool, Optional[object]]]):
        self.frame_source = frame_source
        self.is_streaming = False
        self.clients = set()
        self.config = camera_config.get_config("default")
        self.last_frame = None
        self.failed_reads = 0

    def start_streaming(self):
        if not self.is_streaming:
            self.is_streaming = True
            logger.info("MJPEG streaming started")

    def stop_streaming(self):
        self.is_streaming = False
        self.clients.clear()
        logger.info("MJPEG streaming stopped")

    def add_client(self, client_id: str):
        self.clients.add(client_id)

    def remove_client(self, client_id: str):
        self.clients.discard(client_id)

    def generate_frames(self) -> Iterator[bytes]:
        while self.is_streaming:
            try:
                ok, frame = self.frame_source()
                if ok and frame is not None:
                    self.last_frame = frame
                    self.failed_reads = 0
                    yield self._encode_frame(frame)
                else:
                    self.failed_reads += 1
                    logger.warning("Frame read failed")

                    # Keep the browser connection alive. If the camera stalls,
                    # resend the latest frame briefly, then send a blank frame.
                    if self.last_frame is not None and self.failed_reads < 30:
                        yield self._encode_frame(self.last_frame)
                    else:
                        yield self._encode_frame(self._blank_frame())
                    time.sleep(0.1)

                time.sleep(1.0 / max(int(self.config.get("fps", 30)), 1))
            except GeneratorExit:
                break
            except Exception as exc:
                logger.error("MJPEG frame generation error: %s", exc)
                time.sleep(0.1)

    def get_client_count(self) -> int:
        return len(self.clients)

    def get_stream_info(self) -> Dict[str, object]:
        return {
            "is_streaming": self.is_streaming,
            "client_count": self.get_client_count(),
            "fps": self.config["fps"],
            "resolution": f"{self.config['width']}x{self.config['height']}",
            "failed_reads": self.failed_reads,
        }

    def _encode_frame(self, frame) -> bytes:
        success, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not success:
            frame = self._blank_frame()
            success, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])

        frame_bytes = jpeg.tobytes()
        return (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n"
            b"Cache-Control: no-cache\r\n\r\n" + frame_bytes + b"\r\n"
        )

    def _blank_frame(self):
        width = int(self.config.get("width", 640))
        height = int(self.config.get("height", 480))
        return np.zeros((height, width, 3), dtype=np.uint8)
