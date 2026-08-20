import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  GraduationCap,
  Home,
  Library,
  Search,
  Users,
  LogOut,
  LogIn,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const researchItems = [
  { title: "Home", url: "/", icon: Home },
{ title: "Research & Connect", url: "/research", icon: Search },
];

const studyItems = [
  { title: "Study Companion", url: "/study-companion", icon: BookOpen },
];

function SidebarNavItem({
  item,
  active,
  collapsed,
}: {
  item: { title: string; url: string; icon: React.ElementType };
  active: boolean;
  collapsed: boolean;
}) {
  const tooltipProps = collapsed ? { tooltip: item.title } : {};

  return (
    <SidebarMenuItem>
    <SidebarMenuButton
    asChild
    isActive={active}
    className={cn(
      "transition-colors",
      active && "bg-sidebar-accent text-sidebar-accent-foreground",
    )}
    {...tooltipProps}
    >
    <Link to={item.url} className="flex items-center gap-2">
    <item.icon className="h-4 w-4 shrink-0" />
    <span>{item.title}</span>
    </Link>
    </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
    <SidebarRail />
    <SidebarHeader>
    <Link
    to="/"
    className="flex items-center gap-3 px-2 py-2 transition-opacity hover:opacity-80"
    >
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
    <GraduationCap className="h-5 w-5" />
    </div>
    {!collapsed && (
      <div className="flex flex-col">
      <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
      Syllabus+
      </span>
      <span className="text-xs text-muted-foreground">
      Academic assistant
      </span>
      </div>
    )}
    </Link>
    </SidebarHeader>

    <SidebarContent>
    <SidebarGroup>
    <SidebarGroupLabel className="flex items-center gap-1.5">
    <Users className="h-3.5 w-3.5" />
    Research & Connect
    </SidebarGroupLabel>
    <SidebarGroupContent>
    <SidebarMenu>
    {researchItems.map((item) => (
      <SidebarNavItem
      key={item.title}
      item={item}
      active={currentPath === item.url}
      collapsed={collapsed}
      />
    ))}
    </SidebarMenu>
    </SidebarGroupContent>
    </SidebarGroup>

    <SidebarGroup>
    <SidebarGroupLabel className="flex items-center gap-1.5">
    <Library className="h-3.5 w-3.5" />
    Study Companion
    </SidebarGroupLabel>
    <SidebarGroupContent>
    <SidebarMenu>
    {studyItems.map((item) => (
      <SidebarNavItem
      key={item.title}
      item={item}
      active={currentPath === item.url}
      collapsed={collapsed}
      />
    ))}
    </SidebarMenu>
    </SidebarGroupContent>
    </SidebarGroup>
    </SidebarContent>

    <SidebarFooter className="mt-auto">
    <div className="flex items-center justify-between px-2 py-2">
    <div className="flex items-center gap-3 overflow-hidden">
    <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-sky flex items-center justify-center text-primary-foreground font-medium text-xs">
    {userEmail ? userEmail.charAt(0).toUpperCase() : "G"}
    </div>
    {!collapsed && (
      <div className="flex flex-col overflow-hidden">
      <span className="truncate text-sm font-medium text-sidebar-foreground">
      {userEmail ? userEmail.split('@')[0] : "Guest User"}
      </span>
      <span className="truncate text-xs text-muted-foreground">
      {userEmail ?? "Not signed in"}
      </span>
      </div>
    )}
    </div>
    {!collapsed && (
      <div>
      {userEmail ? (
        <button
        onClick={handleSignOut}
        title="Sign out"
        className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
        >
        <LogOut className="h-4 w-4" />
        </button>
      ) : (
        <Link
        to="/auth"
        title="Sign in"
        className="text-muted-foreground hover:text-primary p-1 rounded-md transition-colors"
        >
        <LogIn className="h-4 w-4" />
        </Link>
      )}
      </div>
    )}
    </div>
    </SidebarFooter>
    </Sidebar>
  );
}
