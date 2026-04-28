import { useState, useEffect, useRef } from 'react';
import { getCameras, getStreamUrl, openCamera, closeCamera } from '../api/cameraApi';
import CameraViewer from '../components/CameraViewer';
import './CameraPage.css';

function CameraPage() {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      setLoading(true);
      const cameraList = await getCameras();
      setCameras(cameraList);
      if (cameraList.length > 0) {
        setSelectedCamera(cameraList[0]);
      }
    } catch (error) {
      console.error('카메라 목록 로드 실패:', error);
      setError('카메라 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraSelect = async (camera) => {
    try {
      setSelectedCamera(camera);
      setError(null);

      // 카메라 열기
      await openCamera(camera.source);

      // 스트림 URL 설정
      const url = getStreamUrl(camera.source);
      setStreamUrl(url);

    } catch (error) {
      console.error('카메라 선택 실패:', error);
      setError('카메라를 열 수 없습니다.');
    }
  };

  const handleCameraClose = async () => {
    if (selectedCamera) {
      try {
        await closeCamera(selectedCamera.source);
        setStreamUrl('');
        setSelectedCamera(null);
      } catch (error) {
        console.error('카메라 닫기 실패:', error);
      }
    }
  };

  if (loading) {
    return <div className="camera-loading">카메라 목록 로딩 중...</div>;
  }

  return (
    <div className="camera-page">
      <div className="camera-header">
        <h1>카메라 모니터링</h1>
        <button onClick={loadCameras} className="refresh-btn">
          카메라 새로고침
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="camera-content">
        <div className="camera-list">
          <h2>사용 가능한 카메라</h2>
          {cameras.length === 0 ? (
            <p>연결된 카메라가 없습니다.</p>
          ) : (
            <div className="camera-grid">
              {cameras.map((camera) => (
                <div
                  key={camera.source}
                  className={`camera-item ${selectedCamera?.source === camera.source ? 'active' : ''}`}
                  onClick={() => handleCameraSelect(camera)}
                >
                  <div className="camera-info">
                    <h3>{camera.name || `카메라 ${camera.source}`}</h3>
                    <p>소스: {camera.source}</p>
                    <p>상태: {camera.status || '알 수 없음'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="camera-viewer">
          {selectedCamera ? (
            <div className="viewer-container">
              <div className="viewer-header">
                <h2>{selectedCamera.name || `카메라 ${selectedCamera.source}`}</h2>
                <button onClick={handleCameraClose} className="close-btn">
                  닫기
                </button>
              </div>
              <CameraViewer streamUrl={streamUrl} />
            </div>
          ) : (
            <div className="no-camera">
              <p>카메라를 선택하여 스트리밍을 시작하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CameraPage;