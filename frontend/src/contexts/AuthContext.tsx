import { ReactNode, createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'warehouse_staff' | 'accountant';
};

type AuthContextType = {
  user: any;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('wareflow_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser({ email: parsed.email });
      setProfile(parsed);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });

    const p: Profile = {
      id: String(data.user.id),
      email: data.user.email,
      full_name: data.user.name,
      role: data.user.role,
    };

    localStorage.setItem('wareflow_user', JSON.stringify(p));
    localStorage.setItem('wareflow_token', data.accessToken);

    setUser({ email: p.email });
    setProfile(p);
    toast.success('Đăng nhập thành công!');
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('wareflow_user');
    localStorage.removeItem('wareflow_token');
    toast.success('Đã đăng xuất');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
