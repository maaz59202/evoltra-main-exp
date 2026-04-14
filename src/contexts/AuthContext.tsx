import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getPendingInvite } from '@/lib/pendingInvite';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  notification_preferences: {
    emailNotifications?: boolean;
    projectUpdates?: boolean;
    clientMessages?: boolean;
    teamActivity?: boolean;
    invoiceReminders?: boolean;
    marketingEmails?: boolean;
  } | null;
  mode: 'solo' | 'team' | null;
  onboarding_completed: boolean | null;
  goals: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: Error | null; data?: { user: User | null; session: Session | null } }>;
  signInWithProvider: (
    provider: 'google' | 'github',
    redirectTo?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureProfileRecord = async (authUser: User) => {
    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: authUser.id,
        email: authUser.email ?? null,
        full_name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          null,
        avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    );

    if (error) {
      console.error('Error ensuring profile record:', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            await ensureProfileRecord(session.user);
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        ensureProfileRecord(session.user).then(() =>
          fetchProfile(session.user.id).then((profileData) => {
          setProfile(profileData);
          setLoading(false);
          })
        );
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName }
      }
    });
    return { error: error as Error | null, data };
  };
  //${window.location.origin}/dashboard`
  const signInWithProvider = async (provider: 'google' | 'github', redirectTo?: string) => {
    const pendingInvite = getPendingInvite();
    const targetRedirect =
      redirectTo ||
      pendingInvite?.path ||
      `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: targetRedirect.startsWith('http')
          ? targetRedirect
          : `${window.location.origin}${targetRedirect}`,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
    }

    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      signIn, 
      signUp, 
      signInWithProvider,
      signOut, 
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
