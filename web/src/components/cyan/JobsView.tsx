import { useState } from "react";
import { useOutletContext } from "react-router";
import { 
  Menu, 
  Briefcase, 
  Search, 
  MapPin, 
  DollarSign, 
  Building2,
  Clock,
  ExternalLink,
  Sparkles,
  Plus,
  X,
  Send,
  Inbox
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

interface JobListing {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  postedTime: string;
  type: string;
  description: string;
  matchScore: number;
}

const mockJobListings: JobListing[] = [
  {
    id: 1,
    title: "Senior Product Manager",
    company: "TechCorp Industries",
    location: "San Francisco, CA",
    salary: "$140k - $180k",
    postedTime: "2 hours ago",
    type: "Full-time",
    description: "Lead product strategy and development for enterprise software solutions.",
    matchScore: 95
  },
  {
    id: 2,
    title: "Engineering Manager",
    company: "Innovation Labs",
    location: "Remote",
    salary: "$160k - $200k",
    postedTime: "5 hours ago",
    type: "Full-time",
    description: "Manage team of 8-12 engineers building cloud infrastructure.",
    matchScore: 88
  },
  {
    id: 3,
    title: "Director of Engineering",
    company: "Future Systems",
    location: "New York, NY",
    salary: "$180k - $220k",
    postedTime: "1 day ago",
    type: "Full-time",
    description: "Strategic technical leadership role for growing startup.",
    matchScore: 82
  },
  {
    id: 4,
    title: "VP of Product",
    company: "Growth Dynamics",
    location: "Austin, TX",
    salary: "$200k - $250k",
    postedTime: "2 days ago",
    type: "Full-time",
    description: "Shape product vision and strategy for B2B SaaS platform.",
    matchScore: 78
  },
];

interface Campaign {
  id: number;
  name: string;
  keywords: string;
  location: string;
  salary: string;
  status: "active" | "paused";
  results: number;
}

const mockCampaigns: Campaign[] = [
  {
    id: 1,
    name: "Senior PM Roles",
    keywords: "Product Manager, Director",
    location: "Remote, CA",
    salary: "$140k+",
    status: "active",
    results: 12
  },
];

export function JobsView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [jobListings] = useState<JobListing[]>(mockJobListings);
  
  // New campaign form state
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    keywords: "",
    location: "",
    salary: ""
  });

  const handleCreateCampaign = () => {
    if (newCampaign.name && newCampaign.keywords) {
      const campaign: Campaign = {
        id: campaigns.length + 1,
        name: newCampaign.name,
        keywords: newCampaign.keywords,
        location: newCampaign.location || "Any",
        salary: newCampaign.salary || "Any",
        status: "active",
        results: 0
      };
      setCampaigns([...campaigns, campaign]);
      setNewCampaign({ name: "", keywords: "", location: "", salary: "" });
      setShowNewCampaign(false);
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const totalResults = jobListings.length;

  return (
    <div className={`${isMobile ? 'pt-16 pb-8' : 'pl-64'} min-h-screen`}>
      {!isMobile && <Sidebar />}
      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
                <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                  Job Search
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Career Opportunities
              </h1>
              <p className="text-[#BBC9CD] mt-1">AI-powered job search campaigns</p>
            </div>

            {isMobile && (
              <button
                onClick={() => setMenuOpen(true)}
                className="p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors border border-[#00FFFF]/20"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-[#00FFFF]/10 inline-flex mb-3">
              <Search className="w-5 h-5 text-[#00FFFF]" />
            </div>
            <div className="text-2xl font-bold text-[#00FFFF] mb-1">{activeCampaigns}</div>
            <div className="text-sm text-[#BBC9CD]">Active Campaigns</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-green-500/10 inline-flex mb-3">
              <Inbox className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 mb-1">{totalResults}</div>
            <div className="text-sm text-[#BBC9CD]">New Results</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-yellow-500/10 inline-flex mb-3">
              <Send className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-yellow-400 mb-1">24</div>
            <div className="text-sm text-[#BBC9CD]">Applications</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-purple-500/10 inline-flex mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 mb-1">87%</div>
            <div className="text-sm text-[#BBC9CD]">Match Score</div>
          </GlassCard>
        </div>

        {/* Active Campaigns Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
              <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                Your Campaigns
              </span>
            </div>
            <button
              onClick={() => setShowNewCampaign(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] font-semibold transition-all border border-[#00FFFF]/40 hover:border-[#00FFFF]/60 shadow-[0_0_20px_rgba(0,255,255,0.2)]"
            >
              <Plus className="w-4 h-4" />
              {!isMobile && "New Campaign"}
            </button>
          </div>

          {/* New Campaign Form */}
          {showNewCampaign && (
            <GlassCard className="!p-6 mb-4 border-[#00FFFF]/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#DAE2FD] text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#00FFFF]" />
                  Create New Job Campaign
                </h3>
                <button
                  onClick={() => setShowNewCampaign(false)}
                  className="p-2 rounded-lg hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="e.g., Senior Executive Roles"
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder-[#BBC9CD]/50 focus:border-[#00FFFF]/40 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Job Keywords</label>
                  <input
                    type="text"
                    value={newCampaign.keywords}
                    onChange={(e) => setNewCampaign({ ...newCampaign, keywords: e.target.value })}
                    placeholder="e.g., Director, VP, Chief, Executive"
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder-[#BBC9CD]/50 focus:border-[#00FFFF]/40 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Location</label>
                    <input
                      type="text"
                      value={newCampaign.location}
                      onChange={(e) => setNewCampaign({ ...newCampaign, location: e.target.value })}
                      placeholder="e.g., Remote, San Francisco"
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder-[#BBC9CD]/50 focus:border-[#00FFFF]/40 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Minimum Salary</label>
                    <input
                      type="text"
                      value={newCampaign.salary}
                      onChange={(e) => setNewCampaign({ ...newCampaign, salary: e.target.value })}
                      placeholder="e.g., $150k+"
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder-[#BBC9CD]/50 focus:border-[#00FFFF]/40 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateCampaign}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] font-semibold transition-all border border-[#00FFFF]/40 hover:border-[#00FFFF]/60 shadow-[0_0_20px_rgba(0,255,255,0.2)]"
                >
                  <Sparkles className="w-5 h-5" />
                  Start AI Agent
                </button>
              </div>
            </GlassCard>
          )}

          {/* Campaign List */}
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <GlassCard key={campaign.id} className="!p-4 hover:border-[#00FFFF]/40 transition-all">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-[#DAE2FD] text-lg">{campaign.name}</h3>
                      {campaign.status === "active" && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-xs text-green-400 font-semibold">Active</span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-[#BBC9CD]">
                        <Search className="w-4 h-4 text-[#00FFFF]" />
                        {campaign.keywords}
                      </div>
                      <div className="flex items-center gap-2 text-[#BBC9CD]">
                        <MapPin className="w-4 h-4 text-[#00FFFF]" />
                        {campaign.location}
                      </div>
                      <div className="flex items-center gap-2 text-[#BBC9CD]">
                        <DollarSign className="w-4 h-4 text-[#00FFFF]" />
                        {campaign.salary}
                      </div>
                      <div className="flex items-center gap-2 text-[#BBC9CD]">
                        <Inbox className="w-4 h-4 text-[#00FFFF]" />
                        {campaign.results} results
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Job Results Inbox */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
            <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
              Search Results
            </span>
          </div>

          <div className="space-y-3">
            {jobListings.map((job) => (
              <GlassCard key={job.id} className="!p-6 hover:border-[#00FFFF]/40 transition-all group">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Company Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#00FFFF]/20 to-[#0099CC]/20 border border-[#00FFFF]/30 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-[#00FFFF]" />
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-[#DAE2FD] text-lg mb-1">{job.title}</h3>
                        <div className="flex items-center gap-2 text-[#BBC9CD] mb-2">
                          <span className="font-semibold">{job.company}</span>
                          <span>•</span>
                          <span>{job.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                        <Sparkles className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-bold text-green-400">{job.matchScore}% Match</span>
                      </div>
                    </div>

                    <p className="text-sm text-[#BBC9CD] mb-4">{job.description}</p>

                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-[#00FFFF]" />
                        <span className="text-[#BBC9CD]">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-[#00FFFF]" />
                        <span className="text-[#BBC9CD]">{job.salary}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-[#00FFFF]" />
                        <span className="text-[#BBC9CD]">{job.postedTime}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] font-semibold transition-all border border-[#00FFFF]/40">
                        <ExternalLink className="w-4 h-4" />
                        View Job
                      </button>
                      <button className="px-4 py-2 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] font-semibold transition-colors border border-[#00FFFF]/20">
                        Save for Later
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
