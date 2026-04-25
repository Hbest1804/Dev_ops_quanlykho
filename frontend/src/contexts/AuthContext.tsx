import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

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
  login: (email: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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

  const login = (email: string) => {
    const mockProfile: Profile = {
      id: '1',
      email,
      full_name: email.split('@')[0],
      role: 'admin',
    };
    setUser({ email });
    setProfile(mockProfile);
    localStorage.setItem('wareflow_user', JSON.stringify(mockProfile));
    toast.success('Đăng nhập thành công!');
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('wareflow_user');
    toast.success('Đã đăng xuất');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
