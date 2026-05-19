import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'member'; 
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  updateAdminStatus: () => void; // New trigger function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const roomData = localStorage.getItem('currentRoom');
      if (roomData) {
        const parsedRoom = JSON.parse(roomData);
        return parsedRoom.role === 'admin';
      }
      return false;
    } catch {
      return false;
    }
  });

  // Inlined logic to check the room's role specifically
  const updateAdminStatus = useCallback(() => {
    try {
      const roomData = localStorage.getItem('currentRoom');
      if (roomData) {
        const parsedRoom = JSON.parse(roomData);
        setIsAdmin(parsedRoom.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // Check the admin status whenever the app mounts or reloads
  useEffect(() => {
    updateAdminStatus();
  }, [updateAdminStatus]);

  const isLoggedIn = user !== null;

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    updateAdminStatus(); 
  };

  const logout = () => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('currentRoom');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoggedIn,
        login,
        logout,
        setUser,
        updateAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}