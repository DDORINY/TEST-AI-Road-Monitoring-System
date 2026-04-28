import ServerStatusCard from './ServerStatusCard';
import './Header.css';

function Header() {
  const flaskBaseUrl = (import.meta.env.VITE_FLASK_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

  return (
    <header className="site-header">
      <div className="header-container">
        <a className="logo" href={flaskBaseUrl}>
          <span className="logo-badge">404</span>
          <span className="logo-text">R.N.F <strong>AI</strong></span>
        </a>

        <nav className="nav" aria-label="Main navigation">
          <a href={`${flaskBaseUrl}/#intro`}>소개</a>
          <a href={`${flaskBaseUrl}/#feature`}>기능</a>
          <a href={`${flaskBaseUrl}/#tech`}>기술</a>
          <a href={`${flaskBaseUrl}/#alert`}>알림</a>
          <a href={`${flaskBaseUrl}/realtime-monitor`}>탐지 현황</a>
          <a href={`${flaskBaseUrl}/report/create`}>신고하기</a>
          <a className="active" href="/">모니터링</a>
          <a href={`${flaskBaseUrl}/board/`}>자유게시판</a>
        </nav>

        <div className="server-status">
          <ServerStatusCard />
        </div>
      </div>
    </header>
  );
}

export default Header;
