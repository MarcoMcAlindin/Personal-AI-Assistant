import { Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  Bot, 
  BarChart3, 
  Settings 
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Bot, label: "Agents", path: "/agents" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 h-20 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-[#00FFFF]/10 z-50"
      style={{
        boxShadow: '0 -4px 24px rgba(0, 255, 255, 0.08)'
      }}
    >
      <nav className="h-full flex items-center justify-around px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center gap-1 px-4 py-2 rounded-xl
                transition-all duration-200
                ${isActive 
                  ? 'text-[#00FFFF]' 
                  : 'text-[#BBC9CD]'
                }
              `}
            >
              <div className={`
                p-2 rounded-lg
                ${isActive 
                  ? 'bg-[#00FFFF]/10 shadow-[0_0_16px_rgba(0,255,255,0.3)]' 
                  : ''
                }
              `}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
