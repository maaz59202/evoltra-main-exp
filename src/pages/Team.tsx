import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { TEAM_ROLES } from '@/data/productCopy';
import { toast } from 'sonner';
import {
  Building2,
  Crown,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';

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
  const ownerCount = members.filter((member) => member.role === 'owner').length;
  const adminCount = members.filter((member) => member.role === 'admin').length;
  const memberCount = members.filter((member) => member.role === 'member').length;

  const roleIconMap = useMemo(
    () => ({
      owner: <Crown className="h-4 w-4 text-amber-400" />,
      admin: <ShieldCheck className="h-4 w-4 text-primary" />,
      member: <Shield className="h-4 w-4 text-muted-foreground" />,
    }),
    []
  );

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <Card className="mx-auto max-w-3xl border-border/60 bg-card/80">
        <CardContent className="flex flex-col items-center py-20 text-center">
          <Building2 className="mb-4 h-14 w-14 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No organization selected</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create or select an organization to manage members, invitations, and access.
          </p>
          <Button className="mt-6" onClick={() => setShowOrgDialog(true)}>
            <Building2 className="mr-2 h-4 w-4" />
            Create organization
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1360px] space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-border/60 bg-card/80 shadow-[0_24px_72px_rgba(2,6,23,0.22)]">
        <div className="border-b border-border/50 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.48),rgba(15,23,42,0.18))] px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
                    Workspace access
                  </div>
                  <div className="space-y-1.5">
                    <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                      Manage who belongs to the workspace, what they can do, and which invitations are still in flight.
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-[560px] rounded-[24px] border border-border/60 bg-background/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <Select value={activeOrgId || ''} onValueChange={(value) => setSelectedOrgId(value || null)}>
                    <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background">
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
                    className="h-11 rounded-xl border-border/60 bg-background px-4 justify-center"
                    onClick={() => setShowOrgDialog(true)}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    New workspace
                  </Button>

                  <Button
                    className="h-11 rounded-xl px-4 shadow-none justify-center"
                    onClick={() => setShowInviteDialog(true)}
                    disabled={!canManageMembers || !teamFeaturesUnlocked}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite member
                  </Button>
                </div>

                {currentUserRole === 'owner' && activeOrgId && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      className="h-10 rounded-xl px-3 text-destructive hover:bg-destructive/8 hover:text-destructive"
                      onClick={() => setShowDeleteOrgDialog(true)}
                    >
                      Delete workspace
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Members</p>
                <p className="mt-2 text-2xl font-semibold">{members.length}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Pending invites</p>
                <p className="mt-2 text-2xl font-semibold">{invites.length}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Your role</p>
                <p className="mt-2 text-2xl font-semibold capitalize">{currentUserRole || 'member'}</p>
              </div>
            </div>
          </div>
        </div>

        {!teamFeaturesUnlocked && currentUserRole === 'owner' && (
          <div className="border-b border-amber-500/20 bg-amber-500/6 px-6 py-4 sm:px-8">
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

        <div className="grid gap-6 px-6 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="overflow-hidden rounded-[26px] border border-border/60 bg-background/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <Tabs defaultValue="members" className="w-full">
              <div className="flex flex-col gap-4 border-b border-border/50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">People</p>
                  <h2 className="text-2xl font-semibold tracking-tight">Access and invites</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage the current team and any open invitations from one calm workspace.
                  </p>
                </div>
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl border border-border/60 bg-background/50 p-1 lg:w-[280px]">
                  <TabsTrigger value="members" className="rounded-lg">
                    Members ({members.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="rounded-lg">
                    Pending ({invites.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="members" className="m-0 px-6 py-5">
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

              <TabsContent value="pending" className="m-0 px-6 py-5">
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

          <div className="space-y-4">
            <Card className="rounded-[24px] border-border/60 bg-card/72 shadow-[0_14px_44px_rgba(2,6,23,0.12)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Workspace summary</CardTitle>
                <CardDescription>A quick pulse on who has access.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Owners</p>
                    <p className="mt-2 text-xl font-semibold">{ownerCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Admins</p>
                    <p className="mt-2 text-xl font-semibold">{adminCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Members</p>
                    <p className="mt-2 text-xl font-semibold">{memberCount}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Plan access</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold capitalize">{organizationPlan}</p>
                    <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
                      {teamFeaturesUnlocked ? 'Invites unlocked' : 'Solo limits active'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-border/60 bg-card/72 shadow-[0_14px_44px_rgba(2,6,23,0.12)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Roles and responsibilities</CardTitle>
                <CardDescription>Role clarity without sending people hunting for permissions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {TEAM_ROLES.map((role) => (
                  <div key={role.role} className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-5 w-5 items-center justify-center">{roleIconMap[role.role]}</div>
                      <div className="space-y-1">
                        <p className="font-medium">{role.title}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
