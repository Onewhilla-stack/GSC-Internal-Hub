import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Briefcase, 
  ReceiptText, 
  Users, 
  LineChart, 
  Settings, 
  LogOut,
  Wallet,
  ClipboardList,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

const directorNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Job Tracker", icon: Briefcase },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/receipts", label: "Receipts", icon: ReceiptText },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/activity-log", label: "Activity Log", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

const workerNavItems = [
  { href: "/dashboard", label: "My Jobs", icon: Briefcase },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/receipts", label: "Receipts", icon: ReceiptText },
  { href: "/quotations", label: "Quotations", icon: FileText },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isDirector } = useAuth();
  const queryClient = useQueryClient();
  
  const navItems = isDirector ? directorNavItems : workerNavItems;

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    }
  });

  return (
    <div className="min-h-screen flex bg-gray-50 flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-black text-white min-h-screen border-r border-gray-800">
        <div className="p-6">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <span className="text-primary">GSC</span>
            <span className="text-secondary">SYSTEM</span>
          </div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{user?.username}</div>
          <Badge className={cn("mt-1 text-[10px] px-1.5 py-0", isDirector ? "bg-secondary text-black" : "bg-primary text-white")}>
            {isDirector ? "Director" : "Associate"}
          </Badge>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-gray-900 text-secondary border-l-2 border-secondary" 
                    : "text-gray-400 hover:text-white hover:bg-gray-900 border-l-2 border-transparent"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-900"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-5 w-5" />}
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh] pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-black text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="font-bold text-xl tracking-tighter">
              <span className="text-primary">GSC</span>
              <span className="text-secondary">SYSTEM</span>
            </div>
            <Badge className={cn("text-[10px] px-1.5 py-0", isDirector ? "bg-secondary text-black" : "bg-primary text-white")}>
              {isDirector ? "Director" : "Associate"}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-5 w-5 text-gray-400" />
          </Button>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black text-gray-400 border-t border-gray-800 flex items-center justify-around p-2 z-50">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center p-2 text-[10px] font-medium transition-colors",
                isActive ? "text-secondary" : "hover:text-white"
              )}
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="truncate w-16 text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
