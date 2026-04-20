import React from 'react';
import { ProfileLink } from '@/hooks/useProfileEditor';

interface ProfilePreviewProps {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  links: ProfileLink[];
  isPhone?: boolean;
}

/**
 * Live mobile preview of the Linktree-style profile page
 * Shows real-time updates as the form changes
 */
export const ProfilePreview: React.FC<ProfilePreviewProps> = ({
  displayName,
  bio,
  avatarUrl,
  links,
  isPhone = true,
}) => {
  const containerWidth = isPhone ? 'w-[375px]' : 'w-full';
  const bgClass = isPhone ? 'bg-background shadow-lg rounded-2xl' : 'bg-background';

  return (
    <div className="flex items-start justify-center p-4 md:p-6 bg-muted/30 overflow-auto h-full">
      <div className={`${containerWidth} flex flex-col`}>
        {/* Phone frame (if mobile preview) */}
        {isPhone && (
          <div className={`${bgClass} flex flex-col overflow-hidden`}>
            {/* Profile content */}
            <div className="flex-1 flex flex-col items-center justify-start p-8 overflow-auto">
              {/* Avatar */}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || 'Profile'}
                  className="w-24 h-24 rounded-full object-cover mb-6 border-2 border-primary/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-primary/20 mb-6 flex items-center justify-center">
                  <span className="text-muted-foreground text-xs text-center px-2">No image</span>
                </div>
              )}

              {/* Display name */}
              <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
                {displayName || 'Your Name'}
              </h1>

              {/* Bio */}
              {bio && (
                <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
                  {bio}
                </p>
              )}

              {/* Links list */}
              <div className="w-full space-y-3 flex-1">
                {links.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <p>Add links to your profile</p>
                    <p className="text-xs mt-2">They'll appear here</p>
                  </div>
                ) : (
                  links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 text-center text-primary font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                      onClick={(e) => {
                        if (!link.url) e.preventDefault();
                      }}
                    >
                      {link.label || 'Link'}
                    </a>
                  ))
                )}
              </div>

              {/* Footer spacing */}
              <div className="h-8"></div>
            </div>
          </div>
        )}

        {/* Desktop/tablet view (no phone frame) */}
        {!isPhone && (
          <div className="flex flex-col items-center justify-start p-12">
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || 'Profile'}
                className="w-32 h-32 rounded-full object-cover mb-8 border-4 border-primary/20"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-muted border-4 border-primary/20 mb-8 flex items-center justify-center">
                <span className="text-muted-foreground text-sm text-center px-4">No image</span>
              </div>
            )}

            {/* Display name */}
            <h1 className="text-4xl font-bold text-foreground mb-4 text-center">
              {displayName || 'Your Name'}
            </h1>

            {/* Bio */}
            {bio && (
              <p className="text-base text-muted-foreground text-center mb-12 leading-relaxed max-w-md">
                {bio}
              </p>
            )}

            {/* Links list */}
            <div className="w-full max-w-md space-y-3">
              {links.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p>Add links to your profile</p>
                  <p className="text-sm mt-2">They'll appear here</p>
                </div>
              ) : (
                links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-6 py-4 rounded-xl bg-primary/10 border border-primary/30 text-center text-primary font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                    onClick={(e) => {
                      if (!link.url) e.preventDefault();
                    }}
                  >
                    {link.label || 'Link'}
                  </a>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
