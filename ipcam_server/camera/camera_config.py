"""
카메라 설정 관리 모듈
"""
import os
from typing import Dict, Any


class CameraConfig:
    """카메라 설정을 관리하는 클래스"""

    def __init__(self):
        self.configs = {
            'default': {
                'width': 640,
                'height': 480,
                'fps': 30,
                'codec': 'MJPEG',
                'buffer_size': 10
            },
            'rtsp': {
                'url': os.getenv('IPCAM_RTSP_URL', 'rtsp://admin:password@192.168.1.100:554/stream'),
                'timeout': 10,
                'reconnect_attempts': 3
            },
            'usb': {
                'index': int(os.getenv('USB_CAMERA_INDEX', '0')),
                'api_preference': 'CAP_ANY'
            }
        }

    def get_config(self, camera_type: str = 'default') -> Dict[str, Any]:
        """카메라 타입에 따른 설정 반환"""
        return self.configs.get(camera_type, self.configs['default'])

    def update_config(self, camera_type: str, **kwargs):
        """설정 업데이트"""
        if camera_type not in self.configs:
            self.configs[camera_type] = {}
        self.configs[camera_type].update(kwargs)


# 전역 설정 인스턴스
camera_config = CameraConfig()
