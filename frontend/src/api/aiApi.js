const AI_API_BASE_URL = import.meta.env.VITE_AI_API_BASE_URL || 'http://localhost:8000';

// AI 서버 상태 확인
export async function getAIServerStatus() {
  try {
    const response = await fetch(`${AI_API_BASE_URL}/health`);
    return response;
  } catch (error) {
    console.error('AI 서버 상태 확인 실패:', error);
    throw error;
  }
}

// 이미지 AI 분석
export async function analyzeImage(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${AI_API_BASE_URL}/infer/image`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('이미지 분석 실패');
    return await response.json();
  } catch (error) {
    console.error('이미지 분석 오류:', error);
    throw error;
  }
}

// 비디오 AI 분석
export async function analyzeVideo(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${AI_API_BASE_URL}/infer/video`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('비디오 분석 실패');
    return await response.json();
  } catch (error) {
    console.error('비디오 분석 오류:', error);
    throw error;
  }
}

// AI 모델 정보
export async function getAIModelInfo() {
  try {
    const response = await fetch(`${AI_API_BASE_URL}/model/info`);
    if (!response.ok) throw new Error('AI 모델 정보 조회 실패');
    return await response.json();
  } catch (error) {
    console.error('AI 모델 정보 조회 오류:', error);
    throw error;
  }
}
