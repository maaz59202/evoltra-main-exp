import { Link } from 'react-router-dom';

const quickLinks = [
  { label: 'Home', href: '/#home' },
  { label: 'About Us', href: '/#about' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Features', href: '/#features' },
  { label: 'Contact Us', href: '/#contact' },
] as const;

const legalLinks = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Cookie Policy', to: '/cookies' },
  { label: 'Terms and Conditions', to: '/terms' },
] as const;

const Footer = () => {
  return (
    <footer className="border-t border-glass-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <span className="text-lg font-bold text-white">E</span>
              </div>
              <span className="text-xl font-bold gradient-text">Evoltra</span>
            </Link>
            <p className="max-w-sm text-muted-foreground">
              Evoltra keeps projects, clients, billing, funnels, and communication in one calmer workspace for freelancers and lean teams.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-muted-foreground">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Legal</h4>
            <ul className="space-y-2 text-muted-foreground">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-glass-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Evoltra. All rights reserved.</p>
          <a href="mailto:support@evoltra.com" className="text-muted-foreground transition-colors hover:text-foreground">
            support@evoltra.com
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
