import { useEffect, useRef, useState } from 'react';
import './CameraViewer.css';

function CameraViewer({ streamUrl }) {
  const imgRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (streamUrl && imgRef.current) {
      setIsLoading(true);
      setError(null);

      const img = imgRef.current;
      img.src = streamUrl;

      const handleLoad = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      const handleError = () => {
        setIsLoading(false);
        setError('스트림을 로드할 수 없습니다.');
        setIsPlaying(false);
      };

      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);

      return () => {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        img.src = '';
      };
    }
  }, [streamUrl]);

  const handleRefresh = () => {
    if (imgRef.current && streamUrl) {
      setIsLoading(true);
      setError(null);
      // URL에 타임스탬프를 추가하여 캐시를 우회
      imgRef.current.src = `${streamUrl}&t=${Date.now()}`;
    }
  };

  return (
    <div className="camera-viewer">
      <div className="viewer-controls">
        <button onClick={handleRefresh} className="refresh-btn">
          새로고침
        </button>
        <div className="status-indicator">
          {isLoading && <span className="status loading">로딩 중...</span>}
          {error && <span className="status error">{error}</span>}
          {isPlaying && !isLoading && <span className="status playing">실시간</span>}
        </div>
      </div>

      <div className="stream-container">
        {streamUrl ? (
          <img
            ref={imgRef}
            alt="카메라 스트림"
            className="stream-image"
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        ) : (
          <div className="no-stream">
            <p>스트림 URL이 설정되지 않았습니다.</p>
          </div>
        )}

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>스트림 로딩 중...</p>
          </div>
        )}

        {error && (
          <div className="error-overlay">
            <p>{error}</p>
            <button onClick={handleRefresh} className="retry-btn">
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CameraViewer;
