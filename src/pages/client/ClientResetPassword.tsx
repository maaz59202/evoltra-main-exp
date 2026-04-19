import { Spinner } from '@/components/ui/spinner';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff,  } from '@/components/ui/icons';

import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { usePasswordSecurity } from '@/hooks/usePasswordSecurity';
import { PasswordSecurityPanel } from '@/components/auth/PasswordSecurityPanel';

const ClientResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setClientFromInvite } = useClientAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordSecurity = usePasswordSecurity(password);
  const [tokenData, setTokenData] = useState<{
    valid: boolean;
    email: string;
    projectName: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenData({ valid: false, email: '', projectName: '', error: 'No token provided' });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('client-auth', {
          body: { action: 'validate-token', token },
        });

        if (error || !data?.valid) {
          setTokenData({
            valid: false,
            email: '',
            projectName: '',
            error: data?.error || error?.message || 'Invalid or expired reset link',
          });
        } else {
          setTokenData({
            valid: true,
            email: data.email,
            projectName: data.projectName,
          });
        }
      } catch (err) {
        console.error('Client reset token validation error:', err);
        setTokenData({
          valid: false,
          email: '',
          projectName: '',
          error: 'Failed to validate reset link',
        });
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordSecurity.isStrongEnough) {
      toast.error('Use a stronger password that meets every requirement below.');
      return;
    }

    if (passwordSecurity.isCompromised) {
      toast.error('This password appears in breach data. Choose a different password.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('client-auth', {
        body: { action: 'set-password', token, password },
      });

      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Failed to reset password');
        setSubmitting(false);
        return;
      }

      setClientFromInvite(data.clientId, tokenData?.email || '', '');
      toast.success('Password reset successfully');
      navigate('/client/portal');
    } catch (err) {
      console.error('Client reset password error:', err);
      toast.error('Failed to reset password');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!tokenData?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold">Invalid Reset Link</h2>
              <p className="text-muted-foreground">
                {tokenData?.error || 'This password reset link is invalid or has expired.'}
              </p>
              <Button onClick={() => navigate('/client/forgot-password')} variant="outline">
                Request another reset link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600">
            <span className="text-2xl font-bold text-white">E</span>
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Set a new password for your client portal access to <strong>{tokenData.projectName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={tokenData.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
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
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordSecurityPanel
                password={password}
                requirements={passwordSecurity.requirements}
                strengthLabel={passwordSecurity.strengthLabel}
                strengthScore={passwordSecurity.strengthScore}
                isCompromised={passwordSecurity.isCompromised}
                breachCount={passwordSecurity.breachCount}
                checkingBreach={passwordSecurity.checkingBreach}
                breachLookupFailed={passwordSecurity.breachLookupFailed}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientResetPassword;
