import { Spinner } from '@/components/ui/spinner';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TeamMemberCard from '@/components/team/TeamMemberCard';
import PendingInviteCard from '@/components/team/PendingInviteCard';
import InviteMemberDialog from '@/components/team/InviteMemberDialog';
import CreateOrganizationDialog from '@/components/organizations/CreateOrganizationDialog';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Building2,
  
  Lock,
  Mail,
  MoreHorizontal,
  UserPlus,
  Users,
} from '@/components/ui/icons';

const Team = () => {
  const { user } = useAuth();
  const {
    organizations,
    selectedOrgId,
    setSelectedOrgId,
    loading: orgsLoading,
    refetch,
    deleteOrganization,
  } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [showDeleteOrgDialog, setShowDeleteOrgDialog] = useState(false);

  const activeOrgId = selectedOrgId || organizations[0]?.id || null;
  const selectedOrg = organizations.find((org) => org.id === activeOrgId);
  const {
    members,
    invites,
    loading,
    currentUserRole,
    canManageMembers,
    organizationPlan,
    inviteMember,
    cancelInvite,
    updateMemberRole,
    removeMember,
  } = useTeamManagement(activeOrgId, selectedOrg?.name);

  const teamFeaturesUnlocked = organizationPlan === 'team';
  const canManageTeamWorkspace = canManageMembers && teamFeaturesUnlocked;
  useEffect(() => {
    const orgFromQuery = searchParams.get('org');
    if (!orgFromQuery) return;

    setSelectedOrgId(orgFromQuery);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('org');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, setSelectedOrgId]);

  if (orgsLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <div className="mx-auto max-w-3xl rounded-[24px] border border-border/60 bg-card/70 px-8 py-20 text-center">
          <Building2 className="mb-4 h-14 w-14 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No organization selected</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create or select an organization to manage members, invitations, and access.
          </p>
          <Button className="mt-6" onClick={() => setShowOrgDialog(true)}>
            <Building2 className="mr-2 h-4 w-4" />
            Create organization
          </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Workspace</div>
            <h1 className="text-[2rem] font-semibold tracking-tight">Team</h1>
          </div>

          <Button
            className="h-9 rounded-lg px-4"
            onClick={() => setShowInviteDialog(true)}
            disabled={!canManageMembers || !teamFeaturesUnlocked}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-border/50 bg-card/25 px-3 py-1.5 text-foreground">
              {members.length} members
            </span>
            <span className="rounded-full border border-border/50 bg-card/25 px-3 py-1.5 text-foreground">
              {invites.length} pending
            </span>
            <span className="rounded-full border border-border/50 bg-card/25 px-3 py-1.5 text-foreground capitalize">
              {currentUserRole || 'member'}
            </span>
            <span className="rounded-full border border-border/50 bg-card/25 px-3 py-1.5 text-muted-foreground">
              {teamFeaturesUnlocked ? 'Team plan' : 'Solo plan'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={activeOrgId || ''} onValueChange={(value) => setSelectedOrgId(value || null)}>
              <SelectTrigger className="h-9 min-w-[220px] rounded-lg border-border/60 bg-background sm:w-[232px]">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="h-9 rounded-lg border-border/60 bg-background px-3.5"
              onClick={() => setShowOrgDialog(true)}
            >
              <Building2 className="mr-2 h-4 w-4" />
              New workspace
            </Button>

            {currentUserRole === 'owner' && activeOrgId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteOrgDialog(true)}
                  >
                    Delete workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </section>

        {!teamFeaturesUnlocked && currentUserRole === 'owner' && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/6 px-6 py-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-background/35 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-amber-500/10 p-2 text-amber-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Team collaboration is locked on Solo</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You can review the workspace, but member invites and team controls unlock when this organization upgrades to Team.
                  </p>
                </div>
              </div>
              <Button onClick={() => window.location.assign('/pricing')}>Upgrade to Team</Button>
            </div>
          </div>
        )}

      <div className="overflow-hidden rounded-[22px] border border-border/50 bg-card/25">
        <Tabs defaultValue="members" className="w-full">
          <div className="flex flex-col gap-4 border-b border-border/40 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
          <p className="text-base font-medium">Access and invites</p>
            </div>
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-lg border border-border/60 bg-background/50 p-1 lg:w-[260px]">
          <TabsTrigger value="members" className="rounded-md">
            Members ({members.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="rounded-md">
                    Pending ({invites.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="members" className="m-0 px-5 py-5">
                {members.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/25 px-6 py-14 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="font-medium">No members yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start small, then invite collaborators when this workspace is ready.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {members.map((member) => (
                      <TeamMemberCard
                        key={member.id}
                        member={member}
                        currentUserId={user?.id || ''}
                        canManage={canManageTeamWorkspace}
                        onUpdateRole={updateMemberRole}
                        onRemove={removeMember}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pending" className="m-0 px-5 py-5">
                {invites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/25 px-6 py-14 text-center">
                    <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="font-medium">No pending invitations</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Invitations you send will stay here until someone accepts or expires.
                    </p>
                    {canManageTeamWorkspace && (
                      <Button
                        variant="outline"
                        className="mt-5 rounded-xl border-border/60 bg-background/50"
                        onClick={() => setShowInviteDialog(true)}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite someone
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {invites.map((invite) => (
                      <PendingInviteCard
                        key={invite.id}
                        invite={invite}
                        canManage={canManageTeamWorkspace}
                        onCancel={cancelInvite}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
      </div>

      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={inviteMember}
      />

      <CreateOrganizationDialog
        open={showOrgDialog}
        onOpenChange={setShowOrgDialog}
        onSuccess={async () => {
          await refetch();
          toast.success('Organization created');
        }}
      />

      <AlertDialog open={showDeleteOrgDialog} onOpenChange={setShowDeleteOrgDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the organization and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!activeOrgId) return;
                try {
                  await deleteOrganization(activeOrgId);
                  await refetch();
                  toast.success('Organization deleted');
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Failed to delete organization';
                  toast.error(message);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Team;
