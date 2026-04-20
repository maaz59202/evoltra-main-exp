import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useProfileEditor } from '@/hooks/useProfileEditor';
import { ProfileEditorSidebar } from '@/components/profile/ProfileEditorSidebar';
import { ProfilePreview } from '@/components/profile/ProfilePreview';
import { ChevronLeft, Save } from 'lucide-react';

/**
 * ProfileEditor Page
 * Layout: Left sidebar (form inputs) + Right panel (live mobile preview)
 * Auto-saves every 30s, mirrors FunnelBuilder UX
 */
export const ProfileEditor: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isClient, setIsClient] = useState(false);

  const {
    profile,
    isDirty,
    isSaving,
    lastSavedAt,
    error,
    updateDisplayName,
    updateBio,
    updateAvatarUrl,
    addLink,
    updateLink,
    deleteLink,
    togglePublish,
    saveProfile,
  } = useProfileEditor();

  // Hydration guard
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveProfile();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [saveProfile]);

  if (!isClient || authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Handle avatar upload (stub for now)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Upload to Supabase Storage
      // For now, create a local data URL for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateAvatarUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Header toolbar */}
      <div className="border-b border-border/60 bg-background/95 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="px-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Profile Editor
              </p>
              <h1 className="text-xl font-semibold">
                {profile.displayName || 'My Profile'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              {isDirty && (
                <div className="flex items-center gap-2 text-xs text-warning">
                  <div className="w-2 h-2 rounded-full bg-warning"></div>
                  Unsaved
                </div>
              )}
              {isSaving && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner className="w-3 h-3" />
                  Saving...
                </div>
              )}
              {!isDirty && lastSavedAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  ✓ Saved at {new Date(lastSavedAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={() => void saveProfile()}
              disabled={!isDirty || isSaving}
              size="sm"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main layout: sidebar + preview */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left sidebar: form inputs */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-border/60 bg-background/70 overflow-y-auto">
          <ProfileEditorSidebar
            displayName={profile.displayName}
            bio={profile.bio}
            avatarUrl={profile.avatarUrl}
            links={profile.links}
            isPublished={profile.isPublished}
            isDirty={isDirty}
            isSaving={isSaving}
            onDisplayNameChange={updateDisplayName}
            onBioChange={updateBio}
            onAvatarChange={updateAvatarUrl}
            onLinkChange={updateLink}
            onLinkAdd={addLink}
            onLinkDelete={deleteLink}
            onPublishToggle={togglePublish}
            onAvatarUpload={handleAvatarUpload}
          />
        </div>

        {/* Right panel: live mobile preview */}
        <div className="flex-1 bg-muted/30 overflow-auto hidden lg:flex lg:items-start lg:justify-center">
          <ProfilePreview
            displayName={profile.displayName}
            bio={profile.bio}
            avatarUrl={profile.avatarUrl}
            links={profile.links}
            isPhone={true}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
