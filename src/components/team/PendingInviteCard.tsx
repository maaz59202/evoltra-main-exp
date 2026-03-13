import { useState } from 'react';
import { Card } from '@/components/ui/card';
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
import { Mail, Clock, X, Copy, Check } from 'lucide-react';
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
      <Card className={`p-4 ${isExpired ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{invite.email}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{isExpired ? 'Expired' : `Expires ${expiresIn}`}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {invite.role}
            </Badge>
            <Badge variant={isExpired ? 'destructive' : 'secondary'}>
              {isExpired ? 'Expired' : 'Pending'}
            </Badge>

            {canManage && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
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
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

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
