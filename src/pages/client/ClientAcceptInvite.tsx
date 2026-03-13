import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const ClientAcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setClientFromInvite } = useClientAuth();
  
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [tokenData, setTokenData] = useState<{
    valid: boolean;
    needsPassword: boolean;
    email: string;
    projectName: string;
    error?: string;
  } | null>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenData({ valid: false, needsPassword: true, email: '', projectName: '', error: 'No token provided' });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('client-auth', {
          body: { action: 'validate-token', token },
        });

        if (error) {
          setTokenData({ valid: false, needsPassword: true, email: '', projectName: '', error: error.message });
        } else {
          setTokenData(data);
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setTokenData({ valid: false, needsPassword: true, email: '', projectName: '', error: 'Failed to validate invitation' });
      }
      
      setLoading(false);
    };

    validateToken();
  }, [token]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('client-auth', {
        body: { action: 'set-password', token, password },
      });

      if (error || !data.success) {
        toast.error(data?.error || 'Failed to set password');
        setValidating(false);
        return;
      }

      setClientFromInvite(data.clientId, tokenData?.email || '', '');
      toast.success('Password set successfully!');
      navigate('/client/portal');
    } catch (err) {
      console.error('Set password error:', err);
      toast.error('Failed to set password');
      setValidating(false);
    }
  };

  const handleAccessProject = () => {
    navigate('/client/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tokenData?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold">Invalid Invitation</h2>
              <p className="text-muted-foreground">
                {tokenData?.error || 'This invitation link is invalid or has expired.'}
              </p>
              <Button onClick={() => navigate('/client/login')} variant="outline">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Token is valid
  if (!tokenData.needsPassword) {
    // Already has password set - redirect to login
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="text-xl font-semibold">You're already set up!</h2>
              <p className="text-muted-foreground">
                You've been invited to view <strong>{tokenData.projectName}</strong>.
                Sign in to access your project.
              </p>
              <Button onClick={handleAccessProject} className="w-full">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Needs to set password
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">E</span>
          </div>
          <CardTitle className="text-2xl">Set Up Your Account</CardTitle>
          <CardDescription>
            You've been invited to view <strong>{tokenData.projectName}</strong>.
            Create a password to access your project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={tokenData.email} disabled className="bg-muted" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={validating}>
              {validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Create Account & View Project'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAcceptInvite;
