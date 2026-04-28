import { useState, useEffect } from 'react';
import { getFlaskStatus } from '../api/flaskApi';
import { getAIServerStatus } from '../api/aiApi';
import { getIPCamStatus } from '../api/cameraApi';
import './ServerStatusCard.css';

function ServerStatusCard() {
  const [statuses, setStatuses] = useState({
    backend: 'unknown',
    ai: 'unknown',
    ipcam: 'unknown'
  });

  useEffect(() => {
    const checkStatuses = async () => {
      try {
        // Backend 상태 확인
        const backendRes = await getFlaskStatus();
        const backendStatus = backendRes.ok ? 'online' : 'offline';

        // AI 서버 상태 확인
        const aiRes = await getAIServerStatus();
        const aiStatus = aiRes.ok ? 'online' : 'offline';

        // IPCAM 서버 상태 확인
        const ipcamRes = await getIPCamStatus();
        const ipcamStatus = ipcamRes.ok ? 'online' : 'offline';

        setStatuses({
          backend: backendStatus,
          ai: aiStatus,
          ipcam: ipcamStatus
        });
      } catch (error) {
        console.error('서버 상태 확인 오류:', error);
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 30000); // 30초마다 확인

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'green';
      case 'offline': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="server-status-card">
      <div className="status-item">
        <span className="label">Backend</span>
        <span className={`status ${getStatusColor(statuses.backend)}`}>
          {statuses.backend}
        </span>
      </div>
      <div className="status-item">
        <span className="label">AI</span>
        <span className={`status ${getStatusColor(statuses.ai)}`}>
          {statuses.ai}
        </span>
      </div>
      <div className="status-item">
        <span className="label">IPCAM</span>
        <span className={`status ${getStatusColor(statuses.ipcam)}`}>
          {statuses.ipcam}
        </span>
      </div>
    </div>
  );
}

export default ServerStatusCard;
