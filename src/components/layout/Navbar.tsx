import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Moon, Sun, Menu, X } from '@/components/ui/icons';
import { useState, useEffect } from 'react';
import NotificationDropdown from './NotificationDropdown';

const marketingLinks = [
  { label: 'Home', href: '/#home' },
  { label: 'About Us', href: '/#about' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Features', href: '/#features' },
  { label: 'Contact Us', href: '/#contact' },
] as const;

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-bold gradient-text">Evoltra</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {marketingLinks.map((item) => (
              <a key={item.label} href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </a>
            ))}
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <Button variant="ghost" asChild>
                  <Link to="/dashboard">Open Workspace</Link>
                </Button>
                <NotificationDropdown />
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" asChild>
                  <Link to="/login">Log In</Link>
                </Button>
                <Button className="gradient-primary text-white" asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-glass-border">
            <div className="flex flex-col gap-3">
              {marketingLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>

              <div className="border-t border-glass-border pt-3 mt-2 px-4">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" asChild className="justify-start">
                      <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Open Workspace</Link>
                    </Button>
                    <Button variant="outline" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" asChild className="justify-start">
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
                    </Button>
                    <Button className="gradient-primary text-white" asChild>
                      <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
