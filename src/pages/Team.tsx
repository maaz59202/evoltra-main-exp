import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { TEAM_ROLES } from '@/data/productCopy';
import { 
  Users, 
  UserPlus, 
  Building2, 
  Loader2, 
  Shield, 
  ShieldCheck, 
  Crown,
  Mail
} from 'lucide-react';

const Team = () => {
  const { user } = useAuth();
  const { organizations, loading: orgsLoading } = useProjects();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Auto-select first organization
  const activeOrgId = selectedOrgId || organizations[0]?.id || null;
  const selectedOrg = organizations.find(o => o.id === activeOrgId);
  const {
    members,
    invites,
    loading,
    currentUserRole,
    canManageMembers,
    inviteMember,
    cancelInvite,
    updateMemberRole,
    removeMember,
  } = useTeamManagement(activeOrgId, selectedOrg?.name);
  const roleIconMap = {
    owner: <Crown className="w-4 h-4 text-warning mt-0.5" />,
    admin: <ShieldCheck className="w-4 h-4 text-primary mt-0.5" />,
    member: <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />,
  } as const;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization members and permissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={activeOrgId || ''}
            onValueChange={(value) => setSelectedOrgId(value || null)}
          >
            <SelectTrigger className="w-full md:w-[220px]">
              <Building2 className="w-4 h-4 mr-2" />
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

          {canManageMembers && (
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          )}
        </div>
      </div>

      {orgsLoading || loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !activeOrgId ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Organization Selected</h3>
            <p className="text-muted-foreground">
              Create or select an organization to manage team members.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Role Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Role Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {TEAM_ROLES.map((role) => (
                  <div key={role.role} className="flex items-start gap-2">
                    {roleIconMap[role.role]}
                    <div>
                      <p className="font-medium">{role.title}</p>
                      <p className="text-muted-foreground text-xs">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Members Tabs */}
          <Tabs defaultValue="members" className="space-y-4">
            <TabsList>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members ({members.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Pending ({invites.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-3">
              {members.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No team members yet</p>
                  </CardContent>
                </Card>
              ) : (
                members.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    currentUserId={user?.id || ''}
                    canManage={canManageMembers}
                    onUpdateRole={updateMemberRole}
                    onRemove={removeMember}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3">
              {invites.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Mail className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No pending invitations</p>
                    {canManageMembers && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setShowInviteDialog(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Someone
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                invites.map((invite) => (
                  <PendingInviteCard
                    key={invite.id}
                    invite={invite}
                    canManage={canManageMembers}
                    onCancel={cancelInvite}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={inviteMember}
      />
    </div>
  );
};

export default Team;
