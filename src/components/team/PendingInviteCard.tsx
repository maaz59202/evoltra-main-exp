import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Mail, Clock, X, Copy, Check } from '@/components/ui/icons';
import { TeamInvite } from '@/hooks/useTeamManagement';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface PendingInviteCardProps {
  invite: TeamInvite;
  canManage: boolean;
  onCancel: (inviteId: string) => Promise<void>;
}

const PendingInviteCard = ({ invite, canManage, onCancel }: PendingInviteCardProps) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isExpired = new Date(invite.expires_at) < new Date();
  const expiresIn = formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true });

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await onCancel(invite.id);
    } catch (err) {
      console.error('Failed to cancel invite:', err);
    } finally {
      setIsLoading(false);
      setShowCancelDialog(false);
    }
  };

  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/invite/${invite.token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className={`rounded-xl border border-border/50 bg-background/20 px-4 py-3 ${isExpired ? 'opacity-60' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-[15px] font-medium">{invite.email}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{isExpired ? 'Expired' : `Expires ${expiresIn}`}</span>
              </div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">
                Pending {invite.role} invite
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Badge variant="outline" className="h-8 rounded-full px-3 capitalize">
              {invite.role}
            </Badge>
            <Badge variant={isExpired ? 'destructive' : 'secondary'} className="h-8 rounded-full px-3">
              {isExpired ? 'Expired' : 'Pending'}
            </Badge>

            {canManage && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={copyInviteLink}
                  disabled={isExpired}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to {invite.email}? 
              They will no longer be able to join using this invite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PendingInviteCard;
