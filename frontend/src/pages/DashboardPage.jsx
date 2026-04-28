import { useEffect, useState } from 'react';
import { getDashboardStats, getRealtimeAlerts } from '../api/flaskApi';
import AlertPanel from '../components/AlertPanel';
import './DashboardPage.css';

function DashboardPage() {
  const [stats, setStats] = useState({
    totalReports: 0,
    activeAlerts: 0,
    processedVideos: 0,
    systemUptime: '00:00:00',
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const statsData = await getDashboardStats();
      setStats(statsData);

      const alertsData = await getRealtimeAlerts();
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      setStats({
        totalReports: 0,
        activeAlerts: 0,
        processedVideos: 0,
        systemUptime: '00:00:00',
      });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">대시보드 로딩 중...</div>;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>AI 사고 감지 시스템 대시보드</h1>
        <button onClick={loadDashboardData} className="refresh-btn">
          새로고침
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>총 보고서</h3>
          <div className="stat-value">{stats.totalReports}</div>
        </div>
        <div className="stat-card">
          <h3>활성 알림</h3>
          <div className="stat-value alert">{stats.activeAlerts}</div>
        </div>
        <div className="stat-card">
          <h3>처리된 영상</h3>
          <div className="stat-value">{stats.processedVideos}</div>
        </div>
        <div className="stat-card">
          <h3>시스템 가동시간</h3>
          <div className="stat-value">{stats.systemUptime}</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="alerts-section">
          <h2>실시간 알림</h2>
          <AlertPanel alerts={alerts} />
        </div>

        <div className="quick-actions">
          <h2>빠른 작업</h2>
          <div className="action-buttons">
            <button className="action-btn primary">AI 분석 시작</button>
            <button className="action-btn secondary">보고서 보기</button>
            <button className="action-btn secondary">설정</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
