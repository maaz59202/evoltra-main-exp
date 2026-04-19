import { Spinner } from '@/components/ui/spinner';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {  Plus, Trash2 } from '@/components/ui/icons';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import type { Project, ProjectMilestone, ProjectResourceLink } from '@/hooks/useProjects';

interface EditProjectDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSave: (
    updates: Partial<Pick<Project, 'description' | 'due_date' | 'priority' | 'assigned_user_id' | 'milestones' | 'resources'>>,
  ) => Promise<void>;
}

const EditProjectDetailsDialog = ({
  open,
  onOpenChange,
  project,
  onSave,
}: EditProjectDetailsDialogProps) => {
  const descriptionLimit = 320;
  const [description, setDescription] = useState(project.description || '');
  const [dueDate, setDueDate] = useState(project.due_date || '');
  const [priority, setPriority] = useState<Project['priority']>(project.priority || 'medium');
  const [assignedUserId, setAssignedUserId] = useState<string>(project.assigned_user_id || 'unassigned');
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(project.milestones || []);
  const [resources, setResources] = useState<ProjectResourceLink[]>(project.resources || []);
  const [isSaving, setIsSaving] = useState(false);
  const { members } = useOrganizationMembers(project.organization_id);

  useEffect(() => {
    if (!open) return;
    setDescription(project.description || '');
    setDueDate(project.due_date || '');
    setPriority(project.priority || 'medium');
    setAssignedUserId(project.assigned_user_id || 'unassigned');
    setMilestones(project.milestones || []);
    setResources(project.resources || []);
  }, [open, project]);

  const completedMilestones = useMemo(
    () => milestones.filter((milestone) => milestone.completed).length,
    [milestones],
  );

  const addMilestone = () => {
    setMilestones((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: '',
        completed: false,
      },
    ]);
  };

  const updateMilestone = (id: string, updates: Partial<ProjectMilestone>) => {
    setMilestones((current) =>
      current.map((milestone) => (milestone.id === id ? { ...milestone, ...updates } : milestone)),
    );
  };

  const removeMilestone = (id: string) => {
    setMilestones((current) => current.filter((milestone) => milestone.id !== id));
  };

  const addResource = () => {
    setResources((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: '',
        url: '',
      },
    ]);
  };

  const updateResource = (id: string, updates: Partial<ProjectResourceLink>) => {
    setResources((current) =>
      current.map((resource) => (resource.id === id ? { ...resource, ...updates } : resource)),
    );
  };

  const removeResource = (id: string) => {
    setResources((current) => current.filter((resource) => resource.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        description: description.trim() || null,
        due_date: dueDate || null,
        priority: priority || null,
        assigned_user_id: assignedUserId === 'unassigned' ? null : assignedUserId,
        milestones: milestones
          .filter((milestone) => milestone.title.trim())
          .map((milestone) => ({
            ...milestone,
            title: milestone.title.trim(),
          })),
        resources: resources
          .filter((resource) => resource.label.trim() && resource.url.trim())
          .map((resource) => ({
            ...resource,
            label: resource.label.trim(),
            url: resource.url.trim(),
          })),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(960px,calc(100vw-1.5rem))] max-w-none overflow-hidden p-0">
        <DialogHeader className="border-b border-border/40 px-6 pb-4 pt-6">
          <DialogTitle>Edit project details</DialogTitle>
          <DialogDescription>
            Set the project summary, due date, priority, and milestone checklist.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[min(72vh,760px)] gap-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="project-description">Description</Label>
              <span className="text-xs text-muted-foreground">
                {description.length}/{descriptionLimit}
              </span>
            </div>
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, descriptionLimit))}
              placeholder="Add a short summary of the project, scope, or current focus."
              className="min-h-[120px]"
              maxLength={descriptionLimit}
            />
            <p className="text-xs text-muted-foreground">
              Keep this concise so the project summary stays readable across the workspace and client views.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-priority">Priority</Label>
              <Select value={priority || 'medium'} onValueChange={(value) => setPriority(value as Project['priority'])}>
                <SelectTrigger id="project-priority">
                  <SelectValue placeholder="Set priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-due-date">Due date</Label>
              <Input
                id="project-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-assigned-user">Assigned</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger id="project-assigned-user">
                <SelectValue placeholder="Choose an assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name || member.profile?.email || 'Unknown member'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Milestones</Label>
                <p className="text-sm text-muted-foreground">
                  {completedMilestones}/{milestones.length} completed
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                <Plus className="mr-2 h-4 w-4" />
                Add milestone
              </Button>
            </div>

            <div className="space-y-2">
              {milestones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
                  No milestones yet. Add a few checkpoints to make project progress visible.
                </div>
              ) : (
                milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-3"
                  >
                    <Checkbox
                      checked={milestone.completed}
                      onCheckedChange={(checked) =>
                        updateMilestone(milestone.id, { completed: checked === true })
                      }
                    />
                    <Input
                      value={milestone.title}
                      onChange={(event) => updateMilestone(milestone.id, { title: event.target.value })}
                      placeholder="Define a concrete milestone"
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => removeMilestone(milestone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Resources</Label>
                <p className="text-sm text-muted-foreground">
                  Add useful links, docs, references, or external resources.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addResource}>
                <Plus className="mr-2 h-4 w-4" />
                Add link
              </Button>
            </div>

            <div className="space-y-2">
              {resources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
                  No resources yet. Add links for docs, assets, references, or briefs.
                </div>
              ) : (
                resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="grid gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_40px]"
                  >
                    <Input
                      value={resource.label}
                      onChange={(event) => updateResource(resource.id, { label: event.target.value })}
                      placeholder="Link label"
                      className="h-9"
                    />
                    <Input
                      value={resource.url}
                      onChange={(event) => updateResource(resource.id, { url: event.target.value })}
                      placeholder="https://..."
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => removeResource(resource.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/40 bg-background px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save details'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectDetailsDialog;
