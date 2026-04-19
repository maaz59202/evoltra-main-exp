import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {  ArrowLeft, Eye, EyeOff, Check } from '@/components/ui/icons';
import { getPendingInvite } from '@/lib/pendingInvite';
import { usePasswordSecurity } from '@/hooks/usePasswordSecurity';
import { PasswordSecurityPanel } from '@/components/auth/PasswordSecurityPanel';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signUp, signInWithProvider } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const pendingInvite = getPendingInvite();
  const passwordSecurity = usePasswordSecurity(password);
  const inviteRedirect =
    pendingInvite && pendingInvite.email.toLowerCase() === email.trim().toLowerCase()
      ? pendingInvite.path
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordSecurity.isStrongEnough) {
      toast({
        variant: 'destructive',
        title: 'Password too weak',
        description: 'Use a stronger password that meets every requirement below.'
      });
      return;
    }

    if (passwordSecurity.isCompromised) {
      toast({
        variant: 'destructive',
        title: 'Password is exposed',
        description: 'This password appears in known breach data. Choose a different one.'
      });
      return;
    }

    setLoading(true);

    const { error, data } = await signUp(email, password, fullName);

    if (error) {
      const message = error.message || 'Could not create account';
      const isDuplicate =
        message.toLowerCase().includes('already') ||
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('exists');
      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description: isDuplicate
          ? 'An account with this email already exists. Please sign in or use Google to continue.'
          : message
      });
      setLoading(false);
      return;
    }

    if (data?.session) {
      toast({
        title: 'Account created!',
        description: 'You are now signed in.'
      });
      navigate(inviteRedirect || '/dashboard');
    } else {
      setEmailSent(true);
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.'
      });
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

        <Card className="w-full max-w-md glass-card animate-fade-in relative z-10">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-6">
              We've sent a verification link to <strong>{email}</strong>. 
              Click the link to verify your account.
            </p>
            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
                Use a different email
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Go to login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Start your 14-day free trial. No credit card required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>

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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
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

              <Button 
                type="submit" 
                className="w-full gradient-primary text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
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

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground mt-4">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
