import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Kanban,
  Layers,
  Users,
  Receipt,
  UserCircle,
  Settings,
} from '@/components/ui/icons';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useOrganizationPermissions } from '@/hooks/useOrganizationPermissions';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Projects', url: '/projects', icon: FolderOpen },
  { title: 'Kanban', url: '/kanban', icon: Kanban },
  { title: 'Funnels', url: '/funnels', icon: Layers },
  { title: 'Leads', url: '/leads', icon: UserCircle },
  { title: 'Billing', url: '/billing', icon: Receipt },
  { title: 'Team', url: '/team', icon: Users },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { permissions } = useOrganizationPermissions();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const visibleItems = mainNavItems.filter((item) => {
    if (item.url === '/billing') return permissions.viewBilling;
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="app-sidebar border-r border-border/70 bg-background/95">
      <SidebarContent className="pt-3">
        <SidebarMenu className="px-2.5">
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
                className={cn(
                  'h-9 rounded-lg text-[13px] transition-colors',
                  collapsed ? 'mx-auto !size-9 !justify-center !p-0' : 'w-full',
                )}
              >
                <NavLink
                  to={item.url}
                  className={cn(
                    'flex items-center rounded-lg text-[13px] text-muted-foreground transition-colors hover:text-foreground dark:text-white/88 dark:hover:text-white',
                    collapsed ? 'h-9 w-9 justify-center p-0' : 'w-full gap-2.5 px-2.5 py-2',
                  )}
                  activeClassName="bg-accent text-foreground dark:bg-white/10 dark:text-white font-medium"
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0 text-current" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
