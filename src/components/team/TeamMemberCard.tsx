import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreHorizontal, Shield, ShieldCheck, Crown, UserMinus } from 'lucide-react';
import { TeamMember, MemberRole } from '@/hooks/useTeamManagement';
import { TEAM_ROLES } from '@/data/productCopy';

interface TeamMemberCardProps {
  member: TeamMember;
  currentUserId: string;
  canManage: boolean;
  onUpdateRole: (memberId: string, role: MemberRole) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

const roleTitles = Object.fromEntries(TEAM_ROLES.map((role) => [role.role, role.title])) as Record<MemberRole, string>;

const roleConfig: Record<MemberRole, { label: string; icon: React.ReactNode; color: string }> = {
  owner: { 
    label: roleTitles.owner, 
    icon: <Crown className="w-4 h-4" />, 
    color: 'bg-warning/20 text-warning border-warning/30' 
  },
  admin: { 
    label: roleTitles.admin, 
    icon: <ShieldCheck className="w-4 h-4" />, 
    color: 'bg-primary/20 text-primary border-primary/30' 
  },
  member: { 
    label: roleTitles.member, 
    icon: <Shield className="w-4 h-4" />, 
    color: 'bg-muted text-muted-foreground' 
  },
};

const TeamMemberCard = ({ 
  member, 
  currentUserId, 
  canManage, 
  onUpdateRole, 
  onRemove 
}: TeamMemberCardProps) => {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentUser = member.user_id === currentUserId;
  const isOwner = member.role === 'owner';
  const canModify = canManage && !isOwner && !isCurrentUser;

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '?';
  };

  const handleRoleChange = async (newRole: MemberRole) => {
    setIsLoading(true);
    try {
      await onUpdateRole(member.id, newRole);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    try {
      await onRemove(member.id);
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setIsLoading(false);
      setShowRemoveDialog(false);
    }
  };

  const roleInfo = roleConfig[(member.role as MemberRole) || 'member'] || roleConfig.member;

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-4 transition-colors hover:bg-background/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0 border border-border/60 bg-background ring-1 ring-white/5">
              <AvatarImage src={member.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-background/80 text-sm font-medium">
                {getInitials(member.profile?.full_name, member.profile?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-base font-semibold">
                  {member.profile?.full_name || member.profile?.email || 'Unknown User'}
                </p>
                {isCurrentUser && (
                  <Badge variant="outline" className="rounded-full border-border/60 bg-background/50 text-[11px]">
                    You
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {member.profile?.email || 'No email'}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                {isOwner ? 'Workspace owner' : roleInfo.label}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <Badge variant="outline" className={`h-9 rounded-full px-3 text-xs font-medium gap-2 ${roleInfo.color}`}>
              {roleInfo.icon}
              {roleInfo.label}
            </Badge>

            {canModify && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" disabled={isLoading}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleRoleChange('admin')}
                    disabled={member.role === 'admin'}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Make Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleRoleChange('member')}
                    disabled={member.role === 'member'}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Make Member
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowRemoveDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Remove from Team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {member.profile?.full_name || member.profile?.email} from the team? 
              They will lose access to all organization projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamMemberCard;
