import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('mathx_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const syncProfile = async (userData) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userData.sub, // Using Google sub as ID for simplicity in this flow
          full_name: userData.name,
          email: userData.email,
          avatar_url: userData.picture,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      console.log('Profile synced with Supabase');
    } catch (error) {
      console.error('Error syncing profile:', error.message);
    }
  };

  const login = async (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    const userData = {
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
      sub: decoded.sub // Google unique ID
    };
    setUser(userData);
    localStorage.setItem('mathx_user', JSON.stringify(userData));
    
    // Sync with Supabase
    await syncProfile(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mathx_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
