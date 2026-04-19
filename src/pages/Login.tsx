import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {  ArrowLeft, Eye, EyeOff } from '@/components/ui/icons';
import { getPendingInvite } from '@/lib/pendingInvite';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorFactorId, setTwoFactorFactorId] = useState<string | null>(null);
  const { signIn, signInWithProvider } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
  const pendingInvite = getPendingInvite();
  const inviteRedirect =
    pendingInvite && pendingInvite.email.toLowerCase() === email.trim().toLowerCase()
      ? pendingInvite.path
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message || 'Invalid email or password'
      });
      setLoading(false);
      return;
    }

    try {
      const [{ data: assurance }, { data: factors }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);

      const verifiedTotpFactor = factors?.totp?.find((factor) => factor.status === 'verified');
      const needsTwoFactor =
        assurance?.nextLevel === 'aal2' &&
        assurance?.currentLevel !== 'aal2' &&
        !!verifiedTotpFactor;

      if (needsTwoFactor && verifiedTotpFactor) {
        setRequiresTwoFactor(true);
        setTwoFactorFactorId(verifiedTotpFactor.id);
        toast({
          title: 'Two-factor required',
          description: 'Enter the 6-digit code from your authenticator app to finish signing in.',
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.'
      });

      navigate(inviteRedirect || from, { replace: true });
    } catch (mfaError) {
      console.error('MFA check failed after login:', mfaError);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.'
      });
      navigate(inviteRedirect || from, { replace: true });
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorFactorId || twoFactorCode.length !== 6) return;

    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: twoFactorFactorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: twoFactorFactorId,
        challengeId: challenge.id,
        code: twoFactorCode,
      });
      if (verifyError) throw verifyError;

      toast({
        title: 'Welcome back!',
        description: 'Two-factor verification complete.'
      });
      navigate(inviteRedirect || from, { replace: true });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: error instanceof Error ? error.message : 'Invalid two-factor code',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-hero-pattern opacity-50" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Back to home */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <Card className="glass-card animate-fade-in">
          <CardHeader className="text-center">
            {/* Logo */}
            <Link to="/" className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
            </Link>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your Evoltra account
            </CardDescription>
          </CardHeader>

          <CardContent>
            {requiresTwoFactor ? (
              <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="twoFactorCode">Authenticator Code</Label>
                  <Input
                    id="twoFactorCode"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="bg-background/50 text-center text-lg tracking-[0.4em]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Open your authenticator app and enter the 6-digit verification code.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary text-white"
                  disabled={loading || twoFactorCode.length !== 6}
                >
                  {loading ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify and Continue'
                  )}
                </Button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link 
                        to="/forgot-password" 
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-background/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-glass-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="outline"
                    className="glass-button"
                    onClick={() => signInWithProvider('google', pendingInvite?.path)}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </Button>
                </div>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
