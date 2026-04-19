import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Moon, Sun, LogOut } from '@/components/ui/icons';
import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import NotificationDropdown from './NotificationDropdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const DashboardNavbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let dark = false;
    try {
      dark = localStorage.getItem('theme') === 'dark';
    } catch {
      dark = false;
    }
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    try {
      localStorage.setItem('theme', newDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors on restricted browsers/modes
    }
    document.documentElement.classList.toggle('dark', newDark);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const userInitial = (profile?.full_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="app-navbar flex h-11 items-center justify-between gap-4 border-b border-border/70 bg-background/95 px-3 backdrop-blur md:px-4">
      <SidebarTrigger className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground dark:text-white/85 dark:hover:text-white" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground dark:text-white/85 dark:hover:text-white"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} alt={userInitial} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.full_name || 'Account'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/pricing">Pricing</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/docs">Documentation</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default DashboardNavbar;
