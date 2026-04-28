import './Footer.css';

function Footer() {
  const flaskBaseUrl = (import.meta.env.VITE_FLASK_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <span className="logo-badge">404</span>
            <span className="logo-text">R.N.F <strong>AI</strong></span>
          </div>
          <p>
            AI 기반 도로 위험 감지 시스템으로 실시간 모니터링과 신고 관리를 지원합니다.
          </p>
          <div className="footer-tech">
            <span>Flask</span>
            <span>YOLO</span>
            <span>MySQL</span>
            <span>AI Vision</span>
          </div>
        </div>

        <div className="footer-links">
          <h4>서비스</h4>
          <a href={`${flaskBaseUrl}/#intro`}>서비스 소개</a>
          <a href={`${flaskBaseUrl}/#feature`}>핵심 기능</a>
          <a href={`${flaskBaseUrl}/realtime-monitor`}>실시간 탐지 현황</a>
          <a href={`${flaskBaseUrl}/report/create`}>도로 위험 신고</a>
        </div>

        <div className="footer-links">
          <h4>Project Archive</h4>
          <a href="https://github.com/lms-mini-project/AI-accident-detection" target="_blank" rel="noreferrer">Team GitHub</a>
          <a href="https://www.notion.so/doreen1004/AI-31fbec735c378068834eec617ff1a984?source=copy_link" target="_blank" rel="noreferrer">Project Notion</a>
          <a href="https://doha.atlassian.net/jira/software/projects/AI/summary" target="_blank" rel="noreferrer">Jira Board</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 404 R.N.F AI Road Hazard Detection System</p>
      </div>
    </footer>
  );
}

export default Footer;
