import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatDistanceToNow } from 'date-fns';
import { 
  BarChart3, 
  CheckCircle2, 
  Layers, 
  ListTodo, 
  Plus,
  ArrowRight,
  Users,
  MessageSquare,
  Zap
} from '@/components/ui/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getPendingInvite } from '@/lib/pendingInvite';

const Dashboard = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSubscription, isTeam } = useSubscription();
  const { stats, activity, loading: dashboardLoading } = useDashboardData();

  // Handle checkout callback from Stripe
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      searchParams.delete('checkout');
      setSearchParams(searchParams, { replace: true });
      toast.loading('Verifying your subscription...', { id: 'sub-sync' });
      checkSubscription().finally(() => {
        toast.info('Payment received. Refresh subscription status manually if it does not update right away.', {
          id: 'sub-sync',
        });
      });
    } else if (checkoutStatus === 'cancelled') {
      toast.info('Checkout was cancelled.');
      searchParams.delete('checkout');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!profile?.onboarding_completed) return;

    const pendingInvite = getPendingInvite();
    if (pendingInvite?.path) {
      navigate(pendingInvite.path, { replace: true });
    }
  }, [navigate, profile?.onboarding_completed]);

  const statCards = [
    { label: 'Active Projects', value: stats.activeProjects, icon: <BarChart3 className="w-5 h-5" />, color: 'text-primary' },
    { label: 'Completed Tasks', value: stats.completedTasks, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-success' },
    { label: 'Published Funnels', value: stats.publishedFunnels, icon: <Layers className="w-5 h-5" />, color: 'text-accent' },
    { label: 'Total Tasks', value: stats.totalTasks, icon: <ListTodo className="w-5 h-5" />, color: 'text-warning' },
  ];

  const quickActions = [
    { label: 'New Project', icon: <Plus className="w-4 h-4" />, href: '/projects' },
    { label: 'Kanban Board', icon: <CheckCircle2 className="w-4 h-4" />, href: '/kanban' },
    { label: 'Build Funnel', icon: <Layers className="w-4 h-4" />, href: '/funnels' },
    { label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, href: '/projects' },
  ];

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}.
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  {dashboardLoading ? (
                    <Skeleton className="h-9 w-12" />
                  ) : (
                    <p className="text-3xl font-bold">{stat.value}</p>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 glass-button"
                  asChild
                >
                  <Link to={action.href}>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {action.icon}
                    </div>
                    <span className="text-sm">{action.label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary" asChild>
              <Link to="/projects">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-2 h-2 rounded-full" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No activity yet. Create a project or funnel to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.map((item) => (
                   <div 
                     key={item.id} 
                     className="flex flex-col gap-1 py-3 border-b border-glass-border last:border-0 sm:flex-row sm:items-center sm:justify-between"
                   >
                     <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full gradient-primary" />
                      <div>
                        <p className="text-sm">
                          {item.action}{' '}
                          <span className="font-medium">{item.subject}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(item.time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Mode Banner */}
      {isTeam && (
        <Card className="glass-card border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Team Mode Active</h3>
                  <p className="text-sm text-muted-foreground">
                    Invite team members to collaborate on {profile.company_name || 'your workspace'}
                  </p>
                </div>
              </div>
              <Button className="gradient-primary text-white w-full sm:w-auto" asChild>
                <Link to="/team">Invite Members</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

