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
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
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

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="app-sidebar border-r border-border">
      <SidebarContent className="pt-2">
        <SidebarMenu className="px-2">
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
                className={cn(
                  'h-10 rounded-xl transition-colors',
                  collapsed ? 'mx-auto !size-10 !justify-center !p-0' : 'w-full',
                )}
              >
                <NavLink
                  to={item.url}
                  className={cn(
                    'flex items-center rounded-xl transition-colors',
                    collapsed ? 'h-10 w-10 justify-center p-0' : 'w-full gap-3 px-3 py-2',
                  )}
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
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
