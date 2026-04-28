import { useState, useEffect } from 'react';
import './AlertPanel.css';

function AlertPanel({ alerts = [] }) {
  const [filteredAlerts, setFilteredAlerts] = useState(alerts);
  const [filter, setFilter] = useState('all'); // all, critical, warning, info

  useEffect(() => {
    filterAlerts();
  }, [alerts, filter]);

  const filterAlerts = () => {
    if (filter === 'all') {
      setFilteredAlerts(alerts);
    } else {
      setFilteredAlerts(alerts.filter(alert => alert.severity === filter));
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'critical': return 'alert-critical';
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      default: return 'alert-info';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '알 수 없음';
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR');
  };

  return (
    <div className="alert-panel">
      <div className="alert-header">
        <h3>알림 패널</h3>
        <div className="filter-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">모든 알림</option>
            <option value="critical">심각</option>
            <option value="warning">경고</option>
            <option value="info">정보</option>
          </select>
        </div>
      </div>

      <div className="alert-list">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            <p>표시할 알림이 없습니다.</p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div
              key={alert.id || index}
              className={`alert-item ${getSeverityClass(alert.severity)}`}
            >
              <div className="alert-icon">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="alert-content">
                <div className="alert-title">
                  {alert.title || '알림'}
                </div>
                <div className="alert-message">
                  {alert.message || alert.description || '알림 내용'}
                </div>
                <div className="alert-meta">
                  <span className="alert-time">
                    {formatTimestamp(alert.timestamp)}
                  </span>
                  {alert.source && (
                    <span className="alert-source">
                      출처: {alert.source}
                    </span>
                  )}
                  {alert.location && (
                    <span className="alert-location">
                      위치: {alert.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="alert-actions">
                {alert.acknowledged ? (
                  <span className="acknowledged-badge">확인됨</span>
                ) : (
                  <button className="acknowledge-btn">
                    확인
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {filteredAlerts.length > 0 && (
        <div className="alert-summary">
          <p>총 {filteredAlerts.length}개의 알림</p>
        </div>
      )}
    </div>
  );
}

export default AlertPanel;
