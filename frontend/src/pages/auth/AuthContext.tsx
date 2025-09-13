// frontend/src/context/AuthContext.tsx (inside the file)
import api from "../lib/api";

const STORAGE_KEY = "ndis_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<null | { id: string; name: string; email: string; role: string; token?: string }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      // backend returns: { access_token, token_type, user: {...} }
      const payload = {
        id: data.user.id,
        name: `${data.user.first_name} ${data.user.last_name}`.trim(),
        email: data.user.email,
        role: data.user.role,
        token: data.access_token,
      };
      setUser(payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.response?.data?.detail || "Login failed" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
