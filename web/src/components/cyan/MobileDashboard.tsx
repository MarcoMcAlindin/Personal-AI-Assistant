import { Link } from "react-router";
import { GlassCard } from "./GlassCard";
import { 
  Brain, 
  Newspaper, 
  Heart,
  DollarSign,
  Mail, 
  Calendar, 
  CheckSquare, 
  Wifi, 
  Briefcase,
  TrendingUp,
  Activity,
  Zap,
  AlertCircle,
  Link as LinkIcon
} from "lucide-react";

const dashboardCards = [
  { 
    path: "/ai-functions", 
    label: "AI Assistant", 
    icon: Brain,
    summary: "8 agents active",
    change: "+2",
    color: "cyan"
  },
  { 
    path: "/news", 
    label: "News Feed", 
    icon: Newspaper,
    summary: "24 unread",
    change: "+12",
    color: "cyan"
  },
  { 
    path: "/health", 
    label: "Health Hub", 
    icon: Heart,
    summary: "92% wellness",
    change: "+5%",
    color: "green"
  },
  { 
    path: "/money", 
    label: "Money Hub", 
    icon: DollarSign,
    summary: "$39,009.82",
    change: "+2.4%",
    color: "green"
  },
  { 
    path: "/email", 
    label: "Email", 
    icon: Mail,
    summary: "16 unread",
    change: "+4",
    color: "cyan"
  },
  { 
    path: "/calendar", 
    label: "Calendar", 
    icon: Calendar,
    summary: "3 meetings",
    change: "Today",
    color: "cyan"
  },
  { 
    path: "/todolist", 
    label: "Todo List", 
    icon: CheckSquare,
    summary: "12 tasks",
    change: "8 left",
    color: "cyan"
  },
  { 
    path: "/internet-speed", 
    label: "Internet", 
    icon: Wifi,
    summary: "450 Mbps",
    change: "Fast",
    color: "green"
  },
  { 
    path: "/jobs", 
    label: "Jobs", 
    icon: Briefcase,
    summary: "4 new results",
    change: "+4",
    color: "cyan"
  },
  { 
    path: "/integrations", 
    label: "Integrations", 
    icon: LinkIcon,
    summary: "0 connected",
    change: "New",
    color: "cyan"
  },
];

const quickStats = [
  { label: "System Load", value: "42%", icon: Activity, color: "cyan" },
  { label: "Active Tasks", value: "12", icon: Zap, color: "cyan" },
  { label: "Performance", value: "94%", icon: TrendingUp, color: "green" },
  { label: "Alerts", value: "3", icon: AlertCircle, color: "yellow" },
];

export function MobileDashboard() {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="!p-4">
              <div className={`p-2 rounded-lg inline-flex mb-3 ${
                stat.color === 'cyan' 
                  ? 'bg-[#00FFFF]/10 text-[#00FFFF]' 
                  : stat.color === 'green'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-[#DAE2FD] mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-[#BBC9CD]">{stat.label}</div>
            </GlassCard>
          );
        })}
      </div>

      {/* Section Label */}
      <div className="flex items-center gap-2">
        <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
        <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
          Your Workspace
        </span>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 gap-4">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.path} to={card.path}>
              <GlassCard className="!p-4 hover:border-[#00FFFF]/40 transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.2)]">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${
                    card.color === 'cyan' 
                      ? 'bg-[#00FFFF]/10' 
                      : 'bg-green-500/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      card.color === 'cyan' 
                        ? 'text-[#00FFFF]' 
                        : 'text-green-400'
                    }`} />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-md ${
                    card.change.startsWith('+') || card.change === 'Fast'
                      ? 'bg-green-500/10 text-green-400' 
                      : 'bg-[#00FFFF]/10 text-[#00FFFF]'
                  }`}>
                    {card.change}
                  </span>
                </div>
                <h3 className="font-bold text-[#DAE2FD] mb-1">{card.label}</h3>
                <p className="text-sm text-[#BBC9CD]">{card.summary}</p>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}