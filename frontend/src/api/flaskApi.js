const FLASK_API_BASE_URL = import.meta.env.VITE_FLASK_API_BASE_URL || 'http://localhost:5000';

export async function getFlaskStatus() {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/health`);
    return response;
  } catch (error) {
    console.error('Flask server status check failed:', error);
    throw error;
  }
}

export async function getDashboardStats() {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/api/dashboard/stats`);
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return await response.json();
  } catch (error) {
    console.error('Dashboard stats fetch error:', error);
    throw error;
  }
}

export async function getRealtimeAlerts() {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/api/alerts/realtime`);
    if (!response.ok) throw new Error('Failed to fetch realtime alerts');
    return await response.json();
  } catch (error) {
    console.error('Realtime alerts fetch error:', error);
    throw error;
  }
}

export async function getReports(page = 1, limit = 10) {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/api/reports?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch reports');
    return await response.json();
  } catch (error) {
    console.error('Reports fetch error:', error);
    throw error;
  }
}

export async function getReportDetail(reportId) {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/api/reports/${reportId}`);
    if (!response.ok) throw new Error('Failed to fetch report detail');
    return await response.json();
  } catch (error) {
    console.error('Report detail fetch error:', error);
    throw error;
  }
}

export async function createReport(reportData) {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });
    if (!response.ok) throw new Error('Failed to create report');
    return await response.json();
  } catch (error) {
    console.error('Report create error:', error);
    throw error;
  }
}

export async function login(credentials) {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error('Login failed');
    return await response.json();
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logout() {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Logout failed');
    return await response.json();
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/api/auth/me`);
    if (!response.ok) throw new Error('Failed to fetch current user');
    return await response.json();
  } catch (error) {
    console.error('Current user fetch error:', error);
    throw error;
  }
}

export async function acknowledgeAlert(alertId) {
  try {
    const response = await fetch(`${FLASK_API_BASE_URL}/api/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to acknowledge alert');
    return await response.json();
  } catch (error) {
    console.error('Alert acknowledge error:', error);
    throw error;
  }
}
