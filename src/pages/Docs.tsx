import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Search, BookOpen, Zap, Users, Layers, CreditCard, Settings, MessageSquare } from 'lucide-react';
import { PLAN_DEFINITIONS, TEAM_ROLES } from '@/data/productCopy';

const Docs = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    {
      title: 'Getting Started',
      icon: <Zap className="w-5 h-5" />,
      items: [
        {
          question: 'What is Evoltra?',
          answer: 'Evoltra is a multi-tenant SaaS platform designed for freelancers and agencies. It provides project management, client portals, funnel building, and team collaboration tools in one unified platform.'
        },
        {
          question: 'How do I create an account?',
          answer: 'Click "Get Started" on the homepage, enter your email and password, then complete the onboarding process to set up your workspace.'
        },
        {
          question: 'What happens during onboarding?',
          answer: 'During onboarding, you\'ll select your mode (Solo or Team), enter your business name, and choose your primary goals. This helps us customize your experience.'
        },
      ]
    },
    {
      title: 'Projects & Tasks',
      icon: <Layers className="w-5 h-5" />,
      items: [
        {
          question: 'How do I create a project?',
          answer: 'Navigate to the Projects page from your dashboard, click "New Project", enter the project name, and optionally assign a client.'
        },
        {
          question: 'How does the Kanban board work?',
          answer: 'The Kanban board has four columns: Backlog, Todo, In Progress, and Done. Drag and drop tasks between columns to update their status.'
        },
        {
          question: 'Can I assign tasks to team members?',
          answer: 'Yes! In Team mode, you can assign tasks to any team member. The assignee will be visible on the task card.'
        },
      ]
    },
    {
      title: 'Client Portal',
      icon: <Users className="w-5 h-5" />,
      items: [
        {
          question: 'How do clients access their portal?',
          answer: 'Clients receive an email invitation with a secure project-specific link. First-time access requires password setup.'
        },
        {
          question: 'What can clients see?',
          answer: 'Clients can only access their assigned projects. They can view project details and send/receive messages but cannot access billing or other projects.'
        },
        {
          question: 'How does project messaging work?',
          answer: 'Each project has a dedicated Messages tab. Both clients and freelancers can send messages, which are stored and threaded per project.'
        },
      ]
    },
    {
      title: 'Funnel Builder',
      icon: <BookOpen className="w-5 h-5" />,
      items: [
        {
          question: 'What is the Funnel Builder?',
          answer: 'The Funnel Builder is a visual drag-and-drop editor for creating landing pages and marketing funnels. It includes widgets like text, images, buttons, forms, and more.'
        },
        {
          question: 'How many funnels can I create?',
          answer: `Solo (${PLAN_DEFINITIONS.solo.priceLabel}) allows 1 funnel. Team (${PLAN_DEFINITIONS.team.priceLabel}${PLAN_DEFINITIONS.team.period}) includes unlimited funnels.`
        },
        {
          question: 'Can I publish my funnels?',
          answer: 'Yes! Once you\'re happy with your funnel, click Publish to generate a shareable public URL. You can unpublish at any time.'
        },
      ]
    },
    {
      title: 'Billing & Subscriptions',
      icon: <CreditCard className="w-5 h-5" />,
      items: [
        {
          question: 'What plans are available?',
          answer: `We offer ${PLAN_DEFINITIONS.solo.name} (${PLAN_DEFINITIONS.solo.priceLabel}) and ${PLAN_DEFINITIONS.team.name} (${PLAN_DEFINITIONS.team.priceLabel}${PLAN_DEFINITIONS.team.period}) plans. ${PLAN_DEFINITIONS.solo.name} includes unlimited projects and 1 funnel. ${PLAN_DEFINITIONS.team.name} includes unlimited projects, unlimited funnels, and unlimited team members.`
        },
        {
          question: 'How do I upgrade to Team?',
          answer: 'Go to the Pricing page and click "Upgrade Now" on the Team plan. You\'ll be redirected to Stripe for secure checkout.'
        },
        {
          question: 'Can I cancel my subscription?',
          answer: 'Yes, you can cancel anytime from your billing settings. You\'ll retain access until the end of your billing period.'
        },
      ]
    },
    {
      title: 'Team Management',
      icon: <Settings className="w-5 h-5" />,
      items: [
        {
          question: 'How do I invite team members?',
          answer: `In Team mode, go to Team Management and click "Invite". Enter their email and assign a role: ${TEAM_ROLES.map((r) => r.title).join(', ')}.`
        },
        {
          question: 'What are the different roles?',
          answer: TEAM_ROLES.map((r) => `${r.title}: ${r.description}`).join(' ')
        },
        {
          question: 'Can I change someone\'s role?',
          answer: 'Yes, Admins can modify team member roles at any time from the Team Management page.'
        },
      ]
    },
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(
      item =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="gradient-text">Documentation</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Everything you need to know about using Evoltra
            </p>
            
            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search documentation..."
                className="pl-12 h-12 glass-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Documentation Sections */}
          <div className="max-w-4xl mx-auto space-y-8">
            {filteredSections.map((section, index) => (
              <Card key={index} className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-white">
                      {section.icon}
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {section.items.map((item, itemIndex) => (
                      <AccordionItem key={itemIndex} value={`item-${index}-${itemIndex}`}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          <span className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                            {item.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pl-6">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}

            {filteredSections.length === 0 && (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No results found for "{searchQuery}". Try a different search term.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact */}
          <div className="text-center mt-12">
            <p className="text-muted-foreground">
              Can't find what you're looking for?{' '}
              <a href="mailto:support@evoltra.com" className="text-primary hover:underline">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Docs;
