import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { PLAN_DEFINITIONS } from '@/data/productCopy';
import { 
  Zap, 
  Users, 
  BarChart3, 
  Layers, 
  MessageSquare, 
  CreditCard,
  ArrowRight,
  Check
} from '@/components/ui/icons';

const features = [
  {
    icon: <Layers className="w-6 h-6" />,
    title: 'Funnel Builder',
    description: 'Drag-and-drop landing pages and funnels to capture leads and convert clients.'
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Project Management',
    description: 'Kanban boards, task tracking, and deadlines, all organized for maximum productivity.'
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Client Portal',
    description: 'Invite clients to review progress, send messages, and stay in the loop without extra tools.'
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'In-App Messaging',
    description: 'Communicate with clients directly within projects. No more scattered emails.'
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Billing & Invoices',
    description: 'Create invoices, track payment status, and keep billing tied to the right project and client.'
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Team Collaboration',
    description: 'Invite team members with role-based access across owner, admin, and member roles.'
  }
];

const plans = [
  {
    name: PLAN_DEFINITIONS.solo.name,
    price: PLAN_DEFINITIONS.solo.priceLabel,
    description: PLAN_DEFINITIONS.solo.description,
    features: PLAN_DEFINITIONS.solo.landingFeatures,
    cta: 'Start Free',
    popular: false
  },
  {
    name: PLAN_DEFINITIONS.team.name,
    price: PLAN_DEFINITIONS.team.priceLabel,
    period: PLAN_DEFINITIONS.team.period,
    description: PLAN_DEFINITIONS.team.description,
    features: PLAN_DEFINITIONS.team.landingFeatures,
    cta: 'Start Trial',
    popular: true
  }
];

const customerFaces = [
  'https://i.pravatar.cc/80?img=12',
  'https://i.pravatar.cc/80?img=32',
  'https://i.pravatar.cc/80?img=47',
  'https://i.pravatar.cc/80?img=60',
];

const aboutPoints = [
  'One workspace for projects, clients, funnels, billing, and collaboration.',
  'Built for freelancers and lean teams who need client work to stay organized without extra tools.',
  'Keeps delivery, communication, and invoicing tied to the same project context.',
] as const;

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden pt-32 pb-20">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-hero-pattern opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6 animate-fade-in">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Client work, projects, and billing in one workspace</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Manage clients.{' '}
              <span className="gradient-text">Build funnels.</span>{' '}
              Grow your business.
            </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Evoltra keeps projects, client communication, funnels, and billing in one place so freelancers and small teams can manage work without stitching together separate apps.
              </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button
                size="lg"
                className="group h-12 px-8 text-lg text-white shadow-[0_18px_50px_rgba(92,61,255,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.015] hover:shadow-[0_24px_60px_rgba(92,61,255,0.34)] gradient-primary"
                asChild
              >
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 text-lg" asChild>
                <Link to="/docs">View Documentation</Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex -space-x-2">
                {customerFaces.map((face, index) => (
                  <img
                    key={face}
                    src={face}
                    alt={`Customer ${index + 1}`}
                    className="h-9 w-9 rounded-full border-2 border-background object-cover shadow-sm"
                    loading="lazy"
                  />
                ))}
              </div>
              <span className="ml-2">Used by freelancers and small teams</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
               Core tools for <span className="gradient-text">running client work</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
               From task tracking to invoices and client access, Evoltra keeps the day-to-day parts of running projects in one system.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="glass-card hover:shadow-xl transition-all duration-300 group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                About us
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Evoltra keeps the client-work stack tighter, calmer, and easier to run.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                We are building Evoltra for people who actually have to deliver client work, chase approvals,
                manage tasks, invoice correctly, and keep communication in one place without bloated software.
              </p>
            </div>
            <div className="grid gap-4">
              {aboutPoints.map((point) => (
                <Card key={point} className="border-border/70 bg-background/55 shadow-none">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Check className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">{point}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, transparent <span className="gradient-text">pricing</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you're ready. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative overflow-hidden ${
                  plan.popular 
                    ? 'border-2 border-primary shadow-lg shadow-primary/10' 
                    : 'glass-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 px-4 py-1 gradient-primary text-white text-sm font-medium rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-4">{plan.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-success" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${plan.popular ? 'gradient-primary text-white' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                    asChild
                  >
                    <Link to="/signup">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center glass-card p-12 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 gradient-primary opacity-5" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to get your client work organized?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                 Set up your workspace, invite a client, and start tracking work without juggling multiple tools.
              </p>
              <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                <a href="mailto:support@evoltra.com" className="rounded-full border border-border/70 px-4 py-2 transition-colors hover:border-primary/40 hover:text-foreground">
                  support@evoltra.com
                </a>
                <span className="rounded-full border border-border/70 px-4 py-2">Contact us for demos, sales, or onboarding help</span>
              </div>
              <Button size="lg" className="gradient-primary text-white px-8 h-12 text-lg" asChild>
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;


