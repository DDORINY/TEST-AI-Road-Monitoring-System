import { useState, useRef } from 'react';
import { analyzeImage, analyzeVideo, getAIModelInfo } from '../api/aiApi';
import './AIPage.css';

function AIPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setError(null);

      let result;
      if (selectedFile.type.startsWith('image/')) {
        result = await analyzeImage(selectedFile);
      } else if (selectedFile.type.startsWith('video/')) {
        result = await analyzeVideo(selectedFile);
      } else {
        throw new Error('지원하지 않는 파일 형식입니다.');
      }

      setAnalysisResult(result);

    } catch (error) {
      console.error('분석 실패:', error);
      setError(error.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadModelInfo = async () => {
    try {
      const info = await getAIModelInfo();
      setModelInfo(info);
    } catch (error) {
      console.error('모델 정보 로드 실패:', error);
    }
  };

  const resetAnalysis = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="ai-page">
      <div className="ai-header">
        <h1>AI 분석</h1>
        <button onClick={loadModelInfo} className="model-info-btn">
          모델 정보
        </button>
      </div>

      {modelInfo && (
        <div className="model-info">
          <h3>AI 모델 정보</h3>
          <p>모델: {modelInfo.model_name || '알 수 없음'}</p>
          <p>버전: {modelInfo.version || '알 수 없음'}</p>
          <p>설명: {modelInfo.description || 'AI 기반 객체 감지 모델'}</p>
        </div>
      )}

      <div className="ai-content">
        <div className="file-upload-section">
          <h2>파일 선택</h2>
          <div className="upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="file-input"
            />
            <div className="upload-placeholder">
              {selectedFile ? (
                <div className="file-info">
                  <p>선택된 파일: {selectedFile.name}</p>
                  <p>크기: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p>유형: {selectedFile.type}</p>
                </div>
              ) : (
                <p>이미지 또는 비디오 파일을 선택하세요</p>
              )}
            </div>
          </div>

          <div className="action-buttons">
            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || loading}
              className="analyze-btn"
            >
              {loading ? '분석 중...' : '분석 시작'}
            </button>
            <button onClick={resetAnalysis} className="reset-btn">
              초기화
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {analysisResult && (
          <div className="analysis-result">
            <h2>분석 결과</h2>
            <div className="result-content">
              <div className="detections">
                <h3>감지된 객체</h3>
                {analysisResult.detections && analysisResult.detections.length > 0 ? (
                  <ul>
                    {analysisResult.detections.map((detection, index) => (
                      <li key={index} className="detection-item">
                        <span className="class-name">{detection.class}</span>
                        <span className="confidence">
                          신뢰도: {(detection.confidence * 100).toFixed(1)}%
                        </span>
                        {detection.bbox && (
                          <span className="bbox">
                            위치: [{detection.bbox.join(', ')}]
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>감지된 객체가 없습니다.</p>
                )}
              </div>

              {analysisResult.processing_time && (
                <div className="processing-info">
                  <p>처리 시간: {analysisResult.processing_time.toFixed(2)}초</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIPage;