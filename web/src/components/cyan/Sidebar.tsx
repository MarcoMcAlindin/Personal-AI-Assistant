import { Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  Settings, 
  ChevronLeft,
  Zap,
  Brain,
  Newspaper,
  Heart,
  DollarSign,
  Mail,
  Calendar,
  CheckSquare,
  Wifi,
  Briefcase,
  Link as LinkIcon
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Brain, label: "AI", path: "/ai-functions" },
  { icon: Newspaper, label: "News", path: "/news" },
  { icon: Heart, label: "Health", path: "/health" },
  { icon: DollarSign, label: "Money", path: "/money" },
  { icon: Mail, label: "Email", path: "/email" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: CheckSquare, label: "Todo List", path: "/todolist" },
  { icon: Wifi, label: "Internet", path: "/internet-speed" },
  { icon: Briefcase, label: "Jobs", path: "/jobs" },
  { icon: LinkIcon, label: "Integrations", path: "/integrations" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div 
      className={`
        fixed left-0 top-0 h-screen
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-64'}
        bg-[#0A0A0A]/95 backdrop-blur-xl
        border-r border-[#00FFFF]/10
        flex flex-col
        z-50
      `}
      style={{
        boxShadow: '4px 0 24px rgba(0, 255, 255, 0.08)'
      }}
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-[#00FFFF]/10">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FFFF] to-[#0099CC] flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.4)]">
              <Zap className="w-6 h-6 text-[#0A0A0A]" />
            </div>
            <div>
              <div className="font-bold text-[#00FFFF] tracking-wide">SUPER CYAN</div>
              <div className="text-[10px] text-[#00FFFF]/60 uppercase tracking-widest">AI Orchestrator</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FFFF] to-[#0099CC] flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.4)] mx-auto">
            <Zap className="w-6 h-6 text-[#0A0A0A]" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200
                ${isActive 
                  ? 'bg-[#00FFFF]/10 text-[#00FFFF] shadow-[0_0_20px_rgba(0,255,255,0.2)]' 
                  : 'text-[#BBC9CD] hover:bg-[#1A1A1A]/50 hover:text-[#00FFFF]'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
              {!collapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="m-4 p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#00FFFF] transition-colors border border-[#00FFFF]/20 flex items-center justify-center"
      >
        <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}