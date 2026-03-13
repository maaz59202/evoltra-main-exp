import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Smartphone, ShieldCheck, Loader2, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';

type SetupStep = 'idle' | 'enrolling' | 'verifying' | 'enrolled';

const TwoFactorSetup = () => {
  const [step, setStep] = useState<SetupStep>('idle');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const verifiedTotpFactor = data.totp.find(f => f.status === 'verified');
      if (verifiedTotpFactor) {
        setIsEnabled(true);
        setEnrolledFactorId(verifiedTotpFactor.id);
        setStep('enrolled');
      } else {
        setIsEnabled(false);
        setStep('idle');
      }
    } catch (error: any) {
      console.error('Error checking MFA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEnroll = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Evoltra Authenticator',
      });
      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep('verifying');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start 2FA enrollment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      setIsEnabled(true);
      setEnrolledFactorId(factorId);
      setStep('enrolled');
      setVerifyCode('');
      toast.success('Two-factor authentication enabled successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnenroll = async () => {
    if (!enrolledFactorId) return;

    setIsUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: enrolledFactorId,
      });
      if (error) throw error;

      setIsEnabled(false);
      setEnrolledFactorId(null);
      setStep('idle');
      setQrCode('');
      setSecret('');
      toast.success('Two-factor authentication has been disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setIsUnenrolling(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret key copied to clipboard');
  };

  const handleCancel = async () => {
    // Unenroll the pending factor
    if (factorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId });
      } catch {}
    }
    setStep('idle');
    setQrCode('');
    setSecret('');
    setFactorId('');
    setVerifyCode('');
  };

  if (isLoading && step === 'idle') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Add an extra layer of security to your account using an authenticator app</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">2FA Status</p>
              <p className="text-sm text-muted-foreground">
                {isEnabled 
                  ? 'Your account is protected with two-factor authentication' 
                  : 'Add extra security by enabling two-factor authentication'}
              </p>
            </div>
          </div>
          <Badge variant={isEnabled ? 'default' : 'secondary'} className={isEnabled ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}>
            {isEnabled ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Idle State - Show Enable Button */}
        {step === 'idle' && (
          <Button onClick={handleStartEnroll} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Enable 2FA'
            )}
          </Button>
        )}

        {/* Verifying State - Show QR + Code Input */}
        {step === 'verifying' && (
          <>
            <Separator />
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Step 1: Scan QR Code</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code below.
                </p>
                <div className="flex justify-center rounded-lg border bg-white p-4 w-fit mx-auto">
                  <img src={qrCode} alt="2FA QR Code" className="h-48 w-48" />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Can't scan the code? Enter this secret key manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono break-all">
                    {secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopySecret}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-1">Step 2: Enter Verification Code</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter the 6-digit code from your authenticator app to verify setup.
                </p>
                <div className="flex items-end gap-3">
                  <div className="space-y-2 flex-1 max-w-xs">
                    <Label htmlFor="verifyCode">Verification Code</Label>
                    <Input
                      id="verifyCode"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-lg tracking-widest font-mono"
                    />
                  </div>
                  <Button onClick={handleVerify} disabled={isVerifying || verifyCode.length !== 6}>
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Verify & Enable
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Enrolled State - Show Disable Button */}
        {step === 'enrolled' && (
          <Button variant="destructive" onClick={handleUnenroll} disabled={isUnenrolling}>
            {isUnenrolling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Disabling...
              </>
            ) : (
              'Disable 2FA'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorSetup;
