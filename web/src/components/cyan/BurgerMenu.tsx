import { Link, useLocation } from "react-router";
import { X, LayoutDashboard, Brain, Newspaper, Heart, DollarSign, Mail, Calendar, CheckSquare, Wifi, Briefcase, Link as LinkIcon } from "lucide-react";

interface BurgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/ai-functions", label: "AI", icon: Brain },
  { path: "/news", label: "News", icon: Newspaper },
  { path: "/health", label: "Health", icon: Heart },
  { path: "/money", label: "Money", icon: DollarSign },
  { path: "/email", label: "Email", icon: Mail },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/todolist", label: "Todo List", icon: CheckSquare },
  { path: "/internet-speed", label: "Internet Speed", icon: Wifi },
  { path: "/jobs", label: "Jobs", icon: Briefcase },
  { path: "/integrations", label: "Integrations", icon: LinkIcon },
];

export function BurgerMenu({ isOpen, onClose }: BurgerMenuProps) {
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0A0A0A] via-[#0D0D12] to-[#10101A]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#00FFFF]/20">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
            <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
              Navigation
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#DAE2FD]">Super Cyan</h2>
        </div>
        <button
          onClick={onClose}
          className="p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors border border-[#00FFFF]/20"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Menu Items */}
      <div className="p-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`
                flex items-center gap-4 p-4 rounded-xl transition-all
                ${isActive
                  ? "bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 border border-[#00FFFF]/40 shadow-[0_0_20px_rgba(0,255,255,0.2)]"
                  : "bg-[#1A1A1A]/50 border border-[#00FFFF]/20 hover:border-[#00FFFF]/40"
                }
              `}
            >
              <div className={`p-3 rounded-lg ${isActive ? "bg-[#00FFFF]/20" : "bg-[#0D0D12]"}`}>
                <Icon className={`w-6 h-6 ${isActive ? "text-[#00FFFF]" : "text-[#BBC9CD]"}`} />
              </div>
              <span className={`text-lg font-semibold ${isActive ? "text-[#00FFFF]" : "text-[#DAE2FD]"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="p-4 rounded-xl bg-[#1A1A1A]/50 border border-[#00FFFF]/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm font-semibold text-[#DAE2FD]">System Online</span>
          </div>
          <p className="text-xs text-[#BBC9CD]">All services operational</p>
        </div>
      </div>
    </div>
  );
}