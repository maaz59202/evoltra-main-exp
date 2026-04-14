import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getPendingInvite } from '@/lib/pendingInvite';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireOnboarding = true 
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [hasOwnerMembership, setHasOwnerMembership] = useState(false);
  const [hasNonOwnerMembership, setHasNonOwnerMembership] = useState(false);

  useEffect(() => {
    if (!user || !requireOnboarding) {
      setMembershipLoading(false);
      setHasOwnerMembership(false);
      setHasNonOwnerMembership(false);
      return;
    }

    let isActive = true;

    const fetchMembershipRoles = async () => {
      setMembershipLoading(true);

      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id);

      if (!isActive) return;

      if (error) {
        console.error('Error checking organization memberships:', error);
        setHasOwnerMembership(false);
        setHasNonOwnerMembership(false);
        setMembershipLoading(false);
        return;
      }

      const roles = (data || []).map((membership) => membership.role);
      setHasOwnerMembership(roles.includes('owner'));
      setHasNonOwnerMembership(roles.some((role) => role === 'admin' || role === 'member'));
      setMembershipLoading(false);
    };

    fetchMembershipRoles();

    return () => {
      isActive = false;
    };
  }, [user, requireOnboarding]);

  if (loading || membershipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const pendingInvite = getPendingInvite();
  const hasMatchingPendingInvite =
    !!pendingInvite &&
    pendingInvite.email.toLowerCase() === (user.email || '').toLowerCase();

  if (
    requireOnboarding &&
    hasMatchingPendingInvite &&
    !location.pathname.startsWith('/invite')
  ) {
    return <Navigate to={pendingInvite.path} replace />;
  }

  // Check if onboarding is required and not completed
  if (requireOnboarding && profile && !profile.onboarding_completed) {
    if (!hasOwnerMembership && hasNonOwnerMembership) {
      return <>{children}</>;
    }

    // If not already on onboarding page, redirect there
    if (!location.pathname.startsWith('/onboarding')) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
