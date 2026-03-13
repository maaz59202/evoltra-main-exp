import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';

interface InviteData {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  organization?: {
    name: string;
  };
}

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        // Fetch invite without auth (public access for validation)
        const { data, error: fetchError } = await supabase
          .from('team_invites')
          .select(`
            id,
            organization_id,
            email,
            role,
            expires_at,
            accepted_at,
            organizations:organization_id (name)
          `)
          .eq('token', token)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Invitation not found or has been cancelled');
          setLoading(false);
          return;
        }

        // Check if already accepted
        if (data.accepted_at) {
          setError('This invitation has already been accepted');
          setLoading(false);
          return;
        }

        // Check if expired
        if (new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired');
          setLoading(false);
          return;
        }

        // Transform the data
        const inviteData: InviteData = {
          ...data,
          organization: Array.isArray(data.organizations) 
            ? data.organizations[0] 
            : data.organizations
        };

        setInvite(inviteData);
      } catch (err) {
        console.error('Error fetching invite:', err);
        setError('Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!invite || !user) return;

    // Check if the logged-in user's email matches the invite
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      toast.error(`Please log in with ${invite.email} to accept this invitation`);
      return;
    }

    setAccepting(true);
    try {
      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invite.organization_id,
          user_id: user.id,
          role: invite.role,
        });

      if (memberError) {
        if (memberError.code === '23505') {
          toast.error('You are already a member of this organization');
          navigate('/team');
          return;
        }
        throw memberError;
      }

      // Mark invite as accepted
      await supabase
        .from('team_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      toast.success(`Welcome to ${invite.organization?.name || 'the team'}!`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error accepting invite:', err);
      toast.error('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invitation Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link to="/">Go to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invite.organization?.name || 'a team'}</strong> as a{' '}
            <strong className="capitalize">{invite.role}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">Invitation sent to</p>
            <p className="font-medium">{invite.email}</p>
          </div>

          {user ? (
            user.email?.toLowerCase() === invite.email.toLowerCase() ? (
              <Button 
                className="w-full" 
                onClick={handleAcceptInvite}
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  You're logged in as <strong>{user.email}</strong>. 
                  Please log in with <strong>{invite.email}</strong> to accept this invitation.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">Switch Account</Link>
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Please log in or create an account with <strong>{invite.email}</strong> to accept this invitation.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link to="/login">
                    <LogIn className="w-4 h-4 mr-2" />
                    Log In
                  </Link>
                </Button>
                <Button className="flex-1" asChild>
                  <Link to="/signup">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
