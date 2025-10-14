const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const auth = {
  async login(email: string, password: string) {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const { access_token } = await response.json();
    localStorage.setItem('token', access_token);

    const meResponse = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!meResponse.ok) {
      throw new Error('Failed to load user profile');
    }

    const me = await meResponse.json();
    if (me.role) {
      localStorage.setItem('role', me.role);
    }

    return me;
  },

  token(): string | null {
    return localStorage.getItem('token');
  },

  role(): string {
    return (localStorage.getItem('role') || 'SUPPORT_WORKER') as string;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }
};

type HeaderMap = Record<string, string>;

export const withAuth = (extra: HeaderMap = {}): HeaderMap => ({
  'Content-Type': 'application/json',
  ...(auth.token() ? { Authorization: `Bearer ${auth.token()}` } : {}),
  ...extra
});
