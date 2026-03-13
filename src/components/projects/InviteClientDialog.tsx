import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, UserPlus, Copy, Check, Link, Mail } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface InviteClientDialogProps {
  projectId: string;
  projectName: string;
  onInvited?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const InviteClientDialog = ({ 
  projectId, 
  projectName, 
  onInvited,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger
}: InviteClientDialogProps) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkOnlyLoading, setLinkOnlyLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const handleInvite = async (skipEmail: boolean = false) => {
    if (!email.trim()) return;

    if (skipEmail) {
      setLinkOnlyLoading(true);
    } else {
      setLoading(true);
    }
    setInviteLink(null);
    setEmailSent(false);

    try {
      const { data, error } = await supabase.functions.invoke('client-auth', {
        body: {
          action: 'invite',
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          projectId,
          skipEmail,
          invitedBy: user?.id || null,
        },
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          let parsedMessage: string | null = null;
          try {
            const errorResponse = await error.context.json();
            parsedMessage = errorResponse?.error || null;
          } catch {
            // Fall back to SDK error message if response parsing fails
          }
          throw new Error(parsedMessage || error.message || 'Failed to create invitation');
        }
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create invitation');
      }

      setInviteLink(data.inviteLink);
      setEmailSent(data.emailSent || false);
      
      if (skipEmail) {
        toast.success('Invite link generated! Copy and share it with your client.');
      } else if (data.emailSent) {
        toast.success(`Invitation sent to ${email}`);
      } else {
        toast.warning(data.emailError || 'Invite created, but email was not delivered. Share the invite link manually.');
      }
      onInvited?.();
    } catch (err) {
      console.error('Invite error:', err);
      let message = err instanceof Error ? err.message : 'Failed to create invitation';
      if (err instanceof FunctionsHttpError) {
        try {
          const errorResponse = await err.context.json();
          if (errorResponse?.error) {
            message = errorResponse.error;
          }
        } catch {
          // Keep generic message if response body can't be parsed
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
      setLinkOnlyLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setEmail('');
      setFullName('');
      setInviteLink(null);
      setEmailSent(false);
      setCopied(false);
    }, 200);
  };

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setInviteLink(null);
    setEmailSent(false);
    setCopied(false);
  };

  const showTrigger = !isControlled;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Client
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Client to {projectName}</DialogTitle>
          <DialogDescription>
            Send an invitation email or generate a link to share directly with your client.
          </DialogDescription>
        </DialogHeader>
        
        {inviteLink ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <Check className="h-5 w-5 text-success" />
              <span className="text-sm text-success">
                {emailSent ? 'Invitation sent successfully!' : 'Invite link generated!'}
              </span>
            </div>
            
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={inviteLink} 
                  readOnly 
                  className="text-xs bg-muted"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {emailSent 
                  ? 'Email sent! You can also share this link directly.' 
                  : 'Share this link with your client to give them access.'}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" onClick={resetForm} variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Another
              </Button>
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Client Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Client Name (optional)</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                type="button" 
                onClick={() => handleInvite(false)} 
                disabled={loading || linkOnlyLoading || !email.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email Invitation
                  </>
                )}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline"
                onClick={() => handleInvite(true)} 
                disabled={loading || linkOnlyLoading || !email.trim()}
                className="w-full"
              >
                {linkOnlyLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Generate Link Only
                  </>
                )}
              </Button>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteClientDialog;

