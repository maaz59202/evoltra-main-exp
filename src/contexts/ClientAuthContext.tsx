import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClientUser {
  id: string;
  email: string;
  fullName: string | null;
}

interface ClientAuthContextType {
  client: ClientUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  setClientFromInvite: (clientId: string, email: string, fullName?: string) => void;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

const CLIENT_STORAGE_KEY = 'evoltra_client_session';
const safeStorage = {
  get: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors on restricted browsers/modes
    }
  },
  remove: (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors on restricted browsers/modes
    }
  },
};

export const ClientAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const stored = safeStorage.get(CLIENT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setClient(parsed);
      } catch {
        safeStorage.remove(CLIENT_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('client-auth', {
        body: { action: 'login', email, password },
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.success) {
        return { error: data.error || 'Login failed' };
      }

      const clientData: ClientUser = {
        id: data.clientId,
        email: data.email,
        fullName: data.fullName,
      };

      setClient(clientData);
      safeStorage.set(CLIENT_STORAGE_KEY, JSON.stringify(clientData));
      
      return { error: null };
    } catch (err) {
      console.error('Client login error:', err);
      return { error: 'Failed to login' };
    }
  };

  const logout = () => {
    setClient(null);
    safeStorage.remove(CLIENT_STORAGE_KEY);
  };

  const setClientFromInvite = (clientId: string, email: string, fullName?: string) => {
    const clientData: ClientUser = {
      id: clientId,
      email,
      fullName: fullName || null,
    };
    setClient(clientData);
    safeStorage.set(CLIENT_STORAGE_KEY, JSON.stringify(clientData));
  };

  return (
    <ClientAuthContext.Provider value={{ client, loading, login, logout, setClientFromInvite }}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};
