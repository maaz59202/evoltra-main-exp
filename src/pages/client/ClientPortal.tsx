import { Spinner } from '@/components/ui/spinner';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FolderOpen,  LogOut, ReceiptText, TrendingUp, ArrowRight, CircleDot, Bell, Palette, Building2, Moon, Sun } from '@/components/ui/icons';

import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyAmount, type SupportedCurrencyCode } from '@/lib/currency';
import {
  CLIENT_PORTAL_PALETTES,
  applyClientPortalTheme,
  getClientPortalPaletteTheme,
  getStoredClientPortalPalette,
  getStoredClientPortalTheme,
  setStoredClientPortalPalette,
  setStoredClientPortalTheme,
  type ClientPortalPaletteKey,
  type ClientPortalTheme,
} from '@/lib/client-portal-theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Project {
  id: string;
  name: string;
  status: string | null;
  created_at: string | null;
  organization?: {
    id: string;
    name: string;
  } | null;
  progress: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    backlogTasks: number;
    progressPercent: number;
  };
  invoiceCount: number;
}

interface ClientInvoice {
  id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  total: number;
  due_date: string | null;
  created_at: string;
  currency: SupportedCurrencyCode;
  project?: {
    id: string;
    name: string;
  } | null;
}

const getClientFacingInvoiceStatus = (status: ClientInvoice['status']) => {
  if (status === 'paid') {
    return { label: 'paid', classes: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200' };
  }

  if (status === 'cancelled') {
    return { label: 'cancelled', classes: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300' };
  }

  return { label: 'unpaid', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' };
};

const ClientPortal = () => {
  const navigate = useNavigate();
  const { client, loading: authLoading, logout } = useClientAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState<ClientPortalPaletteKey>(() => getStoredClientPortalPalette());
  const [theme, setTheme] = useState<ClientPortalTheme>(() => getStoredClientPortalTheme());
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);

  useEffect(() => {
    applyClientPortalTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!authLoading && !client) {
      navigate('/client/login');
      return;
    }

    if (client) {
      void fetchPortalData();
    }
  }, [client, authLoading, navigate]);

  useEffect(() => {
    if (!client) return;

    try {
      const stored = window.localStorage.getItem(`evoltra_client_portal_alert_reads:${client.id}`);
      setReadAlertIds(stored ? JSON.parse(stored) : []);
    } catch {
      setReadAlertIds([]);
    }
  }, [client]);

  const fetchPortalData = async () => {
    try {
      const [{ data: projectsData, error: projectsError }, { data: invoicesData, error: invoicesError }] =
        await Promise.all([
          supabase.functions.invoke('client-projects', {
            body: { action: 'list' },
            headers: { 'x-client-id': client?.id || '' },
          }),
          supabase.functions.invoke('client-invoices', {
            body: { action: 'list' },
            headers: { 'x-client-id': client?.id || '' },
          }),
        ]);

      if (projectsError) {
        console.error('Error fetching client projects:', projectsError);
      } else if (projectsData.success) {
        setProjects(projectsData.projects || []);
      }

      if (invoicesError) {
        console.error('Error fetching client invoices:', invoicesError);
      } else if (invoicesData.success) {
        setInvoices(invoicesData.invoices || []);
      }
    } catch (err) {
      console.error('Failed to fetch client portal data:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/client/login');
  };

  const handlePaletteChange = (nextPalette: ClientPortalPaletteKey) => {
    setPalette(nextPalette);
    setStoredClientPortalPalette(nextPalette);
  };

  const handleThemeToggle = () => {
    const nextTheme: ClientPortalTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setStoredClientPortalTheme(nextTheme);
  };

  const getProjectStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200 border-green-200/60 dark:border-green-900/60';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200 border-blue-200/60 dark:border-blue-900/60';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-200 border-yellow-200/60 dark:border-yellow-900/60';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-border';
    }
  };

  const totalTaskCount = projects.reduce((sum, project) => sum + project.progress.totalTasks, 0);
  const completedTaskCount = projects.reduce((sum, project) => sum + project.progress.completedTasks, 0);
  const activeInvoiceCount = invoices.filter((invoice) => invoice.status === 'sent' || invoice.status === 'overdue').length;
  const portalAlerts = useMemo(() => {
    const overdueInvoices = invoices
      .filter((invoice) => invoice.status === 'overdue')
      .map((invoice) => ({
        id: `invoice-overdue-${invoice.id}`,
        label: `${invoice.invoice_number} is overdue`,
        detail: invoice.project?.name || 'Invoice payment is overdue',
        onClick: () => navigate(`/client/invoice/${invoice.id}`),
      }));

    const unpaidInvoices = invoices
      .filter((invoice) => invoice.status === 'sent')
      .map((invoice) => ({
        id: `invoice-unpaid-${invoice.id}`,
        label: `${invoice.invoice_number} is unpaid`,
        detail: invoice.due_date ? `Due ${format(new Date(invoice.due_date), 'MMM d, yyyy')}` : 'Awaiting payment',
        onClick: () => navigate(`/client/invoice/${invoice.id}`),
      }));

    const activeProjects = projects
      .filter((project) => project.progress.inProgressTasks > 0)
      .map((project) => ({
        id: `project-progress-${project.id}`,
        label: `${project.name} has work in progress`,
        detail: `${project.progress.inProgressTasks} task${project.progress.inProgressTasks === 1 ? '' : 's'} currently moving`,
        onClick: () => navigate(`/client/project/${project.id}`),
      }));

    return [...overdueInvoices, ...unpaidInvoices, ...activeProjects].slice(0, 8);
  }, [invoices, navigate, projects]);

  useEffect(() => {
    if (!client || loading) return;

    const activeIds = new Set(portalAlerts.map((alert) => alert.id));
    const nextReadAlertIds = readAlertIds.filter((id) => activeIds.has(id));

    if (nextReadAlertIds.length !== readAlertIds.length) {
      setReadAlertIds(nextReadAlertIds);
      try {
        window.localStorage.setItem(
          `evoltra_client_portal_alert_reads:${client.id}`,
          JSON.stringify(nextReadAlertIds),
        );
      } catch {
        // Ignore storage issues.
      }
    }
  }, [client, portalAlerts, readAlertIds, loading]);

  const unreadAlerts = useMemo(
    () => portalAlerts.filter((alert) => !readAlertIds.includes(alert.id)),
    [portalAlerts, readAlertIds],
  );

  const markAlertAsRead = (alertId: string) => {
    if (!client || readAlertIds.includes(alertId)) return;

    const nextReadAlertIds = [...readAlertIds, alertId];
    setReadAlertIds(nextReadAlertIds);

    try {
      window.localStorage.setItem(
        `evoltra_client_portal_alert_reads:${client.id}`,
        JSON.stringify(nextReadAlertIds),
      );
    } catch {
      // Ignore storage issues.
    }
  };

  const markAllAlertsAsRead = () => {
    if (!client || portalAlerts.length === 0) return;

    const nextReadAlertIds = portalAlerts.map(alert => alert.id);
    setReadAlertIds(nextReadAlertIds);

    try {
      window.localStorage.setItem(
        `evoltra_client_portal_alert_reads:${client.id}`,
        JSON.stringify(nextReadAlertIds),
      );
    } catch {
      // Ignore storage issues.
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={getClientPortalPaletteTheme(palette)}>
      <header className="border-b border-border/70 bg-card/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-[0_12px_40px_-18px_rgba(0,0,0,0.32)]"
              style={{ backgroundColor: 'var(--client-accent)' }}
            >
              <span className="text-xl font-bold" style={{ color: 'var(--client-accent-foreground)' }}>E</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Client Portal</p>
              <p className="text-xs text-muted-foreground">{client?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                  <Bell className="h-4 w-4" />
                  {unreadAlerts.length > 0 && (
                    <span
                      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                      style={{ backgroundColor: 'var(--client-accent)', color: 'var(--client-accent-foreground)' }}
                    >
                      {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[22rem] max-w-[calc(100vw-1rem)]">
                <div className="flex items-center justify-between px-3">
                  <DropdownMenuLabel className="px-0">Alerts and updates</DropdownMenuLabel>
                  {unreadAlerts.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="px-2 h-auto py-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllAlertsAsRead();
                      }}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="max-h-72">
                  {portalAlerts.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No alerts right now.
                    </div>
                  ) : (
                    portalAlerts.map((alert) => (
                      <DropdownMenuItem
                        key={alert.id}
                        className="flex cursor-pointer flex-col items-start gap-1 whitespace-normal px-3 py-3"
                        onClick={() => {
                          markAlertAsRead(alert.id);
                          alert.onClick();
                        }}
                      >
                        <span className="font-medium text-foreground">
                          {!readAlertIds.includes(alert.id) ? '\u2022 ' : ''}
                          {alert.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{alert.detail}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Portal palette</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(CLIENT_PORTAL_PALETTES).map(([key, value]) => (
                  <DropdownMenuItem key={key} onClick={() => handlePaletteChange(key as ClientPortalPaletteKey)}>
                    <span
                      className="mr-2 inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: value.accent }}
                    />
                    {value.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleThemeToggle} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-full px-4">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <section className="rounded-[30px] border border-border/70 bg-card/55 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">Your Workspace</p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Track progress without the noise</h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                Review project movement, open invoices securely, and stay aligned with your team from one calm workspace.
              </p>
            </div>

            <div className="grid min-w-[280px] gap-3 sm:grid-cols-3 lg:w-[430px]">
              <MetricCard label="Projects" value={projects.length} icon={<FolderOpen className="h-4 w-4" />} />
              <MetricCard
                label="Completed"
                value={`${completedTaskCount}/${totalTaskCount || 0}`}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <MetricCard label="Unpaid invoices" value={activeInvoiceCount} icon={<ReceiptText className="h-4 w-4" />} />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.92fr]">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Projects</h2>
              <p className="text-sm text-muted-foreground">A cleaner view of what is moving, what is done, and what still needs attention.</p>
            </div>

            {projects.length === 0 ? (
              <Card className="rounded-[28px] border-border/70 bg-card/50">
                <CardContent className="py-14 text-center">
                  <FolderOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-medium">No projects yet</h3>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    Your active projects will appear here once the invite is connected to your client account.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer rounded-[28px] border-border/70 bg-card/55 transition-all hover:border-primary/40 hover:bg-card/80"
                    onClick={() => navigate(`/client/project/${project.id}`)}
                  >
                    <CardContent className="p-5 md:p-6">
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CircleDot className="h-3.5 w-3.5 text-primary" />
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Project</p>
                            </div>
                          <div>
                              <h3 className="text-xl font-semibold tracking-tight">{project.name}</h3>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                {project.organization?.name && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Organization: {project.organization.name}
                                  </span>
                                )}
                                <span>
                                  Created {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'recently'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge className={`${getProjectStatusColor(project.status)} rounded-full border px-3 py-1`}>
                            {project.status || 'active'}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Overall progress</span>
                            <span className="font-medium">{project.progress.progressPercent}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                backgroundColor: 'var(--client-accent)',
                                width: `${project.progress.progressPercent}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <MiniStat label="Completed" value={project.progress.completedTasks} />
                          <MiniStat label="In progress" value={project.progress.inProgressTasks} />
                          <MiniStat label="Invoices" value={project.invoiceCount} />
                        </div>

                        <div className="flex justify-end">
                          <Button variant="ghost" className="h-9 rounded-full px-4 text-sm">
                            Open project
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Invoices</h2>
              <p className="text-sm text-muted-foreground">Securely view your invoices and save them.</p>
            </div>

            <Card className="rounded-[28px] border-border/70 bg-card/55">
              <CardContent className="space-y-3 p-4">
                {invoices.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <ReceiptText className="mx-auto mb-3 h-9 w-9" />
                    <p className="font-medium text-foreground">No invoices yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">When an invoice is issued, it will appear here.</p>
                  </div>
                ) : (
                  invoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-[22px] border border-border/70 bg-background/25 p-4 text-left transition hover:border-primary/40 hover:bg-background/40"
                      onClick={() => navigate(`/client/invoice/${invoice.id}`)}
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">{invoice.project?.name || 'General invoice'}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.due_date
                            ? `Due ${format(new Date(invoice.due_date), 'MMM d, yyyy')}`
                            : `Created ${format(new Date(invoice.created_at), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                      <div className="space-y-2 text-right">
                        <InvoiceBadge status={invoice.status} />
                        <p className="text-sm font-semibold">
                          {formatCurrencyAmount(Number(invoice.total), invoice.currency)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
};

const MetricCard = ({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) => (
  <div className="rounded-[22px] border border-border/70 bg-background/35 px-4 py-4">
    <div className="mb-3 flex items-center justify-between text-muted-foreground">
      <span className="text-xs uppercase tracking-[0.18em]">{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-semibold tracking-tight">{value}</div>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-[20px] border border-border/70 bg-background/25 px-4 py-3">
    <div className="text-lg font-semibold tracking-tight">{value}</div>
    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
  </div>
);

const InvoiceBadge = ({ status }: { status: ClientInvoice['status'] }) => {
  const badge = getClientFacingInvoiceStatus(status);
  return <Badge className={`${badge.classes} rounded-full px-2.5 py-1`}>{badge.label}</Badge>;
};

export default ClientPortal;
