import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload } from 'lucide-react';
import { ProfileLink } from '@/hooks/useProfileEditor';

interface ProfileEditorSidebarProps {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  links: ProfileLink[];
  isPublished: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onDisplayNameChange: (name: string) => void;
  onBioChange: (bio: string) => void;
  onAvatarChange: (url: string | null) => void;
  onLinkChange: (id: string, updates: Partial<ProfileLink>) => void;
  onLinkAdd: () => void;
  onLinkDelete: (id: string) => void;
  onPublishToggle: () => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Left sidebar form for editing profile data
 * Includes: avatar upload, display name, bio, links list with add/remove
 */
export const ProfileEditorSidebar: React.FC<ProfileEditorSidebarProps> = ({
  displayName,
  bio,
  avatarUrl,
  links,
  isPublished,
  isDirty,
  isSaving,
  onDisplayNameChange,
  onBioChange,
  onAvatarChange,
  onLinkChange,
  onLinkAdd,
  onLinkDelete,
  onPublishToggle,
  onAvatarUpload,
}) => {
  const bioLength = bio.length;
  const maxBioLength = 500;
  const maxLinks = 20;

  return (
    <div className="w-full flex flex-col gap-6 md:gap-8 overflow-y-auto p-4 md:p-6 bg-background/50">
      {/* Avatar Section */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Profile Picture</Label>
        
        <div className="flex flex-col items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted border-2 border-primary/20 flex items-center justify-center">
              <span className="text-xs text-muted-foreground text-center">No image</span>
            </div>
          )}
          
          <div className="flex gap-2 w-full">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarUpload}
                disabled={isSaving}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                asChild 
                className="w-full cursor-pointer font-medium"
                disabled={isSaving}
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </span>
              </Button>
            </label>
            {avatarUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAvatarChange(null)}
                disabled={isSaving}
                className="font-medium"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="display-name" className="text-base font-semibold">
          Display Name
        </Label>
        <Input
          id="display-name"
          type="text"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          disabled={isSaving}
          maxLength={100}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {displayName.length} / 100 characters
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-base font-semibold">
          Bio
        </Label>
        <Textarea
          id="bio"
          placeholder="Tell your visitors about yourself..."
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          disabled={isSaving}
          maxLength={maxBioLength}
          className="text-sm resize-none h-24"
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Keep it short and engaging
          </p>
          <p
            className={`text-xs font-medium ${
              bioLength > maxBioLength * 0.9 ? 'text-warning' : 'text-muted-foreground'
            }`}
          >
            {bioLength} / {maxBioLength}
          </p>
        </div>
      </div>

      {/* Links Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Links</Label>
          <Badge variant="secondary" className="text-xs">
            {links.length} / {maxLinks}
          </Badge>
        </div>

        <div className="space-y-3">
          {links.map((link, index) => (
            <div key={link.id} className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  type="text"
                  placeholder="Label (e.g., My Website)"
                  value={link.label}
                  onChange={(e) =>
                    onLinkChange(link.id, { label: e.target.value })
                  }
                  disabled={isSaving}
                  maxLength={50}
                  className="text-sm"
                />
                <Input
                  type="url"
                  placeholder="URL (e.g., https://example.com)"
                  value={link.url}
                  onChange={(e) =>
                    onLinkChange(link.id, { url: e.target.value })
                  }
                  disabled={isSaving}
                  className="text-sm"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLinkDelete(link.id)}
                disabled={isSaving}
                className="self-start mt-1 h-10"
              >
                <X className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {links.length < maxLinks && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLinkAdd}
            disabled={isSaving}
            className="w-full font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Link
          </Button>
        )}

        {links.length === maxLinks && (
          <p className="text-xs text-muted-foreground">
            Maximum links reached ({maxLinks})
          </p>
        )}
      </div>

      {/* Publish Section */}
      <div className="pt-4 md:pt-6 border-t border-border/50 space-y-3">
        <Label className="text-base font-semibold">Publish</Label>
        <Button
          onClick={onPublishToggle}
          disabled={isSaving}
          className="w-full font-medium py-2"
          variant={isPublished ? 'default' : 'outline'}
        >
          {isPublished ? '✓ Published' : 'Publish Profile'}
        </Button>
        {isPublished && (
          <div className="text-xs text-muted-foreground p-3 bg-primary/5 rounded-lg border border-primary/20">
            Your profile is publicly visible at{' '}
            <code className="font-mono text-xs">/profile/[username]</code>
          </div>
        )}
      </div>

      {/* Save Status */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-center gap-2">
        {isDirty && (
          <div className="flex items-center gap-2 text-xs text-warning">
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse"></div>
            Unsaved changes
          </div>
        )}
        {isSaving && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-spin"></div>
            Saving...
          </div>
        )}
      </div>
    </div>
  );
};
