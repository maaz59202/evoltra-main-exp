import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { ProfilePreview } from '@/components/profile/ProfilePreview';
import { ProfileLink } from '@/hooks/useProfileEditor';

/**
 * PublicProfile Page
 * Displays a published profile by username
 * Public route: /profile/:username (no auth required)
 * Stub implementation - will connect to Supabase later
 */
export const PublicProfile: React.FC = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState<{
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    links: ProfileLink[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // TODO: Replace with Supabase query
        // SELECT * FROM profiles WHERE public_username = username AND profile_published = true
        
        // Stub: Simulate loading and return not found
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // For development: Mock profile data
        if (username === 'demo') {
          setProfile({
            displayName: 'Demo User',
            bio: 'This is a demo profile. Replace with real Supabase data.',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
            links: [
              { id: '1', label: 'My Website', url: 'https://example.com' },
              { id: '2', label: 'Twitter', url: 'https://twitter.com' },
              { id: '3', label: 'LinkedIn', url: 'https://linkedin.com' },
            ],
          });
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Profile not found</p>
          <p className="text-muted-foreground mb-6">
            The profile "<code className="text-xs bg-muted px-2 py-1 rounded">{username}</code>" does not exist or is not published.
          </p>
          <a
            href="/"
            className="text-primary hover:underline text-sm"
          >
            Return to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop view: full width */}
      <div className="hidden md:block h-auto">
        <ProfilePreview
          displayName={profile.displayName}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          links={profile.links}
          isPhone={false}
        />
      </div>

      {/* Mobile view: phone frame */}
      <div className="md:hidden h-screen flex items-center justify-center">
        <ProfilePreview
          displayName={profile.displayName}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          links={profile.links}
          isPhone={true}
        />
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-muted-foreground">
        Powered by Evoltra
      </div>
    </div>
  );
};

export default PublicProfile;
