const IPCAM_API_BASE_URL = import.meta.env.VITE_IPCAM_API_BASE_URL || 'http://localhost:7000';

// IPCAM 서버 상태 확인
export async function getIPCamStatus() {
  try {
    const response = await fetch(`${IPCAM_API_BASE_URL}/health`);
    return response;
  } catch (error) {
    console.error('IPCAM 서버 상태 확인 실패:', error);
    throw error;
  }
}

// 카메라 스트림 URL 생성
export function getStreamUrl(source = '0') {
  return `${IPCAM_API_BASE_URL}/stream?source=${encodeURIComponent(source)}`;
}

// 카메라 목록 조회
export async function getCameras() {
  try {
    const response = await fetch(`${IPCAM_API_BASE_URL}/cameras`);
    if (!response.ok) throw new Error('카메라 목록 조회 실패');
    return await response.json();
  } catch (error) {
    console.error('카메라 목록 조회 오류:', error);
    throw error;
  }
}

// 카메라 정보 조회
export async function getCameraInfo(source) {
  try {
    const response = await fetch(`${IPCAM_API_BASE_URL}/camera/${source}/info`);
    if (!response.ok) throw new Error('카메라 정보 조회 실패');
    return await response.json();
  } catch (error) {
    console.error('카메라 정보 조회 오류:', error);
    throw error;
  }
}

// 카메라 열기
export async function openCamera(source) {
  try {
    const response = await fetch(`${IPCAM_API_BASE_URL}/camera/${source}/open`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('카메라 열기 실패');
    return await response.json();
  } catch (error) {
    console.error('카메라 열기 오류:', error);
    throw error;
  }
}

// 카메라 닫기
export async function closeCamera(source) {
  try {
    const response = await fetch(`${IPCAM_API_BASE_URL}/camera/${source}/close`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('카메라 닫기 실패');
    return await response.json();
  } catch (error) {
    console.error('카메라 닫기 오류:', error);
    throw error;
  }
}

// 스트림 정보 조회
export async function getStreamInfo(source) {
  try {
    const response = await fetch(`${IPCAM_API_BASE_URL}/stream/${source}/info`);
    if (!response.ok) throw new Error('스트림 정보 조회 실패');
    return await response.json();
  } catch (error) {
    console.error('스트림 정보 조회 오류:', error);
    throw error;
  }
}
