import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

export interface EditableProfile {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  links: ProfileLink[];
  isPublished: boolean;
  publicUsername: string | null;
}

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAX_LINKS = 20;
const MAX_BIO_LENGTH = 500;
const MAX_NAME_LENGTH = 100;

/**
 * Hook for managing profile editor state and auto-save logic
 * Mirrors useFunnelEditor pattern for consistency
 */
export const useProfileEditor = () => {
  const { profile, user } = useAuth();
  const [localProfile, setLocalProfile] = useState<EditableProfile>({
    displayName: profile?.full_name || '',
    bio: '',
    avatarUrl: profile?.avatar_url || null,
    links: [],
    isPublished: false,
    publicUsername: null,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load profile data on mount
   */
  useEffect(() => {
    if (profile) {
      setLocalProfile((prev) => ({
        ...prev,
        displayName: profile.full_name || '',
        avatarUrl: profile.avatar_url || null,
      }));
    }
  }, [profile]);

  /**
   * Auto-save trigger whenever profile changes
   */
  useEffect(() => {
    if (!isDirty) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      void saveProfile();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, localProfile]);

  /**
   * Save profile to backend (stubbed for now, will integrate with Supabase later)
   */
  const saveProfile = useCallback(async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);

    try {
      // TODO: Implement Supabase save when schema is ready
      // For now, just mark as saved to allow UI to progress
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  /**
   * Update display name
   */
  const updateDisplayName = useCallback((name: string) => {
    const truncated = name.slice(0, MAX_NAME_LENGTH);
    setLocalProfile((prev) => ({ ...prev, displayName: truncated }));
    setIsDirty(true);
  }, []);

  /**
   * Update bio
   */
  const updateBio = useCallback((bio: string) => {
    const truncated = bio.slice(0, MAX_BIO_LENGTH);
    setLocalProfile((prev) => ({ ...prev, bio: truncated }));
    setIsDirty(true);
  }, []);

  /**
   * Update avatar URL
   */
  const updateAvatarUrl = useCallback((url: string | null) => {
    setLocalProfile((prev) => ({ ...prev, avatarUrl: url }));
    setIsDirty(true);
  }, []);

  /**
   * Add a new link
   */
  const addLink = useCallback(() => {
    setLocalProfile((prev) => {
      if (prev.links.length >= MAX_LINKS) {
        setError(`Maximum ${MAX_LINKS} links allowed`);
        return prev;
      }
      return {
        ...prev,
        links: [
          ...prev.links,
          {
            id: `link-${Date.now()}`,
            label: '',
            url: '',
          },
        ],
      };
    });
    setIsDirty(true);
  }, []);

  /**
   * Update a link by ID
   */
  const updateLink = useCallback(
    (id: string, updates: Partial<ProfileLink>) => {
      setLocalProfile((prev) => ({
        ...prev,
        links: prev.links.map((link) =>
          link.id === id ? { ...link, ...updates } : link
        ),
      }));
      setIsDirty(true);
    },
    []
  );

  /**
   * Delete a link by ID
   */
  const deleteLink = useCallback((id: string) => {
    setLocalProfile((prev) => ({
      ...prev,
      links: prev.links.filter((link) => link.id !== id),
    }));
    setIsDirty(true);
  }, []);

  /**
   * Reorder links (move one to a new index)
   */
  const reorderLinks = useCallback((fromIndex: number, toIndex: number) => {
    setLocalProfile((prev) => {
      const newLinks = [...prev.links];
      const [movedLink] = newLinks.splice(fromIndex, 1);
      newLinks.splice(toIndex, 0, movedLink);
      return { ...prev, links: newLinks };
    });
    setIsDirty(true);
  }, []);

  /**
   * Toggle profile publish status
   */
  const togglePublish = useCallback(async () => {
    setLocalProfile((prev) => ({
      ...prev,
      isPublished: !prev.isPublished,
    }));
    setIsDirty(true);
  }, []);

  /**
   * Update public username (slug)
   */
  const updatePublicUsername = useCallback((username: string) => {
    // Simple validation: lowercase, no spaces, alphanumeric + hyphen
    const sanitized = username.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setLocalProfile((prev) => ({
      ...prev,
      publicUsername: sanitized || null,
    }));
    setIsDirty(true);
  }, []);

  /**
   * Manual save trigger (e.g., from Ctrl+S)
   */
  const manualSave = useCallback(async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    await saveProfile();
  }, [saveProfile]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    if (profile) {
      setLocalProfile({
        displayName: profile.full_name || '',
        bio: '',
        avatarUrl: profile.avatar_url || null,
        links: [],
        isPublished: false,
        publicUsername: null,
      });
    }
    setIsDirty(false);
    setError(null);
  }, [profile]);

  return {
    profile: localProfile,
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
    reorderLinks,
    togglePublish,
    updatePublicUsername,
    saveProfile: manualSave,
    reset,
  };
};
