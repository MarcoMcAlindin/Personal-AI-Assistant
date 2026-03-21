import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Calendar, Clock, MapPin } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

const events = [
  { id: 1, title: "Team Standup", time: "9:00 AM", duration: "30 min", location: "Virtual", color: "cyan" },
  { id: 2, title: "Product Review", time: "11:00 AM", duration: "1 hour", location: "Conference A", color: "purple" },
  { id: 3, title: "Lunch with Client", time: "1:00 PM", duration: "1 hour", location: "Downtown", color: "green" },
  { id: 4, title: "Sprint Planning", time: "3:00 PM", duration: "2 hours", location: "Virtual", color: "cyan" },
];

export function CalendarView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);

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
                  Calendar
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Today's Schedule
              </h1>
              <p className="text-[#BBC9CD] mt-1">Friday, March 20, 2026</p>
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

        <div className="grid grid-cols-2 gap-4 mb-8">
          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-[#00FFFF]/10 inline-flex mb-3">
              <Calendar className="w-5 h-5 text-[#00FFFF]" />
            </div>
            <div className="text-2xl font-bold text-[#00FFFF] mb-1">4</div>
            <div className="text-sm text-[#BBC9CD]">Events Today</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-[#00FFFF]/10 inline-flex mb-3">
              <Clock className="w-5 h-5 text-[#00FFFF]" />
            </div>
            <div className="text-2xl font-bold text-[#00FFFF] mb-1">4.5h</div>
            <div className="text-sm text-[#BBC9CD]">Total Time</div>
          </GlassCard>
        </div>

        <div className="space-y-3">
          {events.map((event) => (
            <GlassCard key={event.id} className="!p-4 hover:border-[#00FFFF]/40 transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`h-full w-1 rounded-full flex-shrink-0 ${
                  event.color === 'cyan' ? 'bg-[#00FFFF]' :
                  event.color === 'purple' ? 'bg-purple-400' :
                  'bg-green-400'
                }`}></div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#DAE2FD] mb-2">{event.title}</h3>
                  <div className="flex flex-col gap-1 text-sm text-[#BBC9CD]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{event.time} • {event.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
