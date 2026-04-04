import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Calendar as DayPickerCalendar } from "../ui/calendar";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";
import { getAuthHeaders } from "../../services/auth";
import { Task } from "../../types/tasks";

const BACKEND_URL = import.meta.env.VITE_CLOUD_GATEWAY_URL || "http://localhost:8000/api/v1";

const urgencyColors: Record<Task["urgency"], string> = {
  high: "#F87171",
  medium: "#FACC15",
  low: "#A855F7",
};

const formatISODate = (date: Date) => date.toISOString().split("T")[0];

const formatClock = (time: string | null) => {
  if (!time) return "Any time";
  const [hr, mn] = time.split(":");
  if (hr === undefined || mn === undefined) return time;
  const clone = new Date();
  clone.setHours(Number(hr), Number(mn));
  return clone.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
};

const formatDuration = (duration: number | null) => {
  if (!duration || Number.isNaN(duration)) return "Flexible";
  if (duration >= 60) {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  }
  return `${duration} min`;
};

export function CalendarView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [agenda, setAgenda] = useState<Task[]>([]);
  const [agendaCache, setAgendaCache] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, Task[]>>(agendaCache);

  useEffect(() => {
    cacheRef.current = agendaCache;
  }, [agendaCache]);

  useEffect(() => {
    const iso = formatISODate(selectedDate);
    const cached = cacheRef.current[iso];
    if (cached) {
      setAgenda(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let canceled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${BACKEND_URL}/tasks?date=${iso}`, { headers });
        if (!response.ok) {
          throw new Error(`Unable to load agenda (${response.status})`);
        }
        const payload: { tasks: Task[] } = await response.json();
        if (canceled) return;
        const items = payload.tasks ?? [];
        setAgenda(items);
        setAgendaCache((previous) => ({ ...previous, [iso]: items }));
      } catch (err) {
        if (canceled) return;
        setError(err instanceof Error ? err.message : "Unable to load agenda");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [selectedDate]);

  const stats = useMemo(() => {
    const total = agenda.length;
    const completed = agenda.filter((task) => task.status === "completed").length;
    const pending = agenda.filter((task) => task.status === "pending").length;
    const urgencies = agenda.reduce(
      (acc, task) => {
        acc[task.urgency] += 1;
        return acc;
      },
      { high: 0, medium: 0, low: 0 },
    );
    return { total, completed, pending, urgencies };
  }, [agenda]);

  const summaryTiles = useMemo(
    () => [
      { label: "Scheduled", value: stats.total, accent: "#00FFFF" },
      { label: "Completed", value: stats.completed, accent: "#22C55E" },
      { label: "Pending", value: stats.pending, accent: "#FACC15" },
      { label: "Urgent", value: stats.urgencies.high, accent: "#F87171" },
    ],
    [stats],
  );

  const cachedDates = useMemo(() => new Set(Object.keys(agendaCache)), [agendaCache]);
  const calendarModifiers = useMemo(
    () => ({
      hasAgenda: (date: Date) => cachedDates.has(formatISODate(date)),
    }),
    [cachedDates],
  );

  const headerDate = selectedDate.toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const progressBase = Math.max(stats.total, 1);
  const dayNumber = selectedDate.getDate().toString().padStart(2, "0");
  const monthLabel = selectedDate.toLocaleDateString("en-GB", { month: "short" });

  return (
    <div className={`${isMobile ? "pt-16 pb-8" : "pl-64"} min-h-screen bg-[#03030b]`}>
      {!isMobile && <Sidebar />}
      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className={`${isMobile ? "space-y-5 p-4" : "space-y-6 p-8"}`}>
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.5em] text-[#BBC9CD]">
              <div className="h-1 w-12 rounded-full bg-gradient-to-r from-[#00FFFF] to-transparent" />
              <span>Calendar</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-[#DAE2FD] md:text-4xl">Daily Rhythm</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#8D99A4]">
              Choose a day, scan what matters first, and keep the agenda readable without the old planner dead-end.
            </p>
          </div>

          {isMobile && (
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#00FFFF]/20 bg-[#111214] text-[#BBC9CD] hover:border-[#00FFFF]/40 hover:text-[#00FFFF]"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
        </header>

        <div className={`${isMobile ? "space-y-5" : "grid grid-cols-[minmax(320px,420px)_minmax(0,1fr)] gap-6 items-start"}`}>
          <GlassCard className="overflow-hidden !rounded-[28px] !border-[#00FFFF]/15 !bg-[#06070b]/95 !p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-[#BBC9CD]">
                  <CalendarIcon className="h-4 w-4 text-[#00FFFF]" />
                  <span>Month View</span>
                </div>
                <p className="mt-2 text-sm text-[#8D99A4]">Select a date to load tasks and keep your week in view.</p>
              </div>
              <div className="rounded-2xl border border-[#00FFFF]/15 bg-[#0a0d12] px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#6E7A86]">{monthLabel}</div>
                <div className="text-2xl font-semibold text-[#DAE2FD]">{dayNumber}</div>
              </div>
            </div>
            <DayPickerCalendar
              mode="single"
              selected={selectedDate}
              onSelect={(day) => day && setSelectedDate(day)}
              weekStartsOn={1}
              className="w-full"
              modifiers={calendarModifiers}
              modifiersClassNames={{
                hasAgenda:
                  "after:absolute after:bottom-2 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-[#00FFFF] after:shadow-[0_0_10px_rgba(0,255,255,0.75)]",
              }}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#00FFFF]/20 bg-[#00FFFF]/10 px-3 py-1 text-[11px] font-medium text-[#BFFBFF]">
                Cyan dot = cached agenda
              </span>
              <span className="rounded-full border border-[#A855F7]/20 bg-[#A855F7]/10 px-3 py-1 text-[11px] font-medium text-[#E7D4FF]">
                Purple = today
              </span>
            </div>
            {error && <p className="mt-4 text-xs text-[#F87171]">{error}</p>}
          </GlassCard>

          <div className="space-y-5">
            <GlassCard className="!rounded-[28px] !border-[#00FFFF]/15 !bg-[#06070b]/95 !p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.38em] text-[#6E7A86]">Selected day</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#DAE2FD] md:text-3xl">{headerDate}</h2>
                  <p className="mt-2 text-sm text-[#8D99A4]">
                    {isToday
                      ? "Today is live. Counts update from the current task list."
                      : "This date is loaded from the same task API and cached locally for faster revisits."}
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-[#00FFFF]/20 bg-[#00FFFF]/8 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-[#BFFBFF]">
                  {isToday ? "Today" : "Selected"}
                </span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {summaryTiles.map((tile) => (
                  <div key={tile.label} className="rounded-2xl border border-white/6 bg-[#0b0e14] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-[#6E7A86]">{tile.label}</p>
                      <span className="h-3 w-3 rounded-full" style={{ background: tile.accent }} />
                    </div>
                    <p className="mt-4 text-3xl font-semibold text-[#F3F7FF]">{tile.value}</p>
                    <div className="mt-2 h-1 w-full rounded-full bg-[#111214]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((tile.value / progressBase) * 100, 100)}%`,
                          background: tile.accent,
                          transition: "width 0.25s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="!rounded-[28px] !border-[#00FFFF]/15 !bg-[#06070b]/95 !p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.38em] text-[#6E7A86]">Daily agenda</p>
                  <h3 className="mt-2 text-xl font-semibold text-[#DAE2FD] md:text-2xl">{headerDate}</h3>
                </div>
                <span className="text-[11px] uppercase tracking-[0.45em] text-[#00FFFF]">Live</span>
              </div>
              <div className="mt-5 space-y-3">
                {loading ? (
                  <p className="text-sm text-[#BBC9CD]">Loading tasks…</p>
                ) : agenda.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#00FFFF]/15 bg-[#090b10] p-5 text-sm text-[#8D99A4]">
                    No items yet. Add tasks from the planner to fill the day.
                  </div>
                ) : (
                  agenda.map((task) => (
                    <div
                      key={task.id}
                      className="group relative overflow-hidden rounded-[22px] border border-white/6 bg-[#0b0e14] p-4 transition hover:border-[#00FFFF]/30"
                    >
                      <div
                        className="absolute inset-y-0 left-0 w-1 rounded-full"
                        style={{ background: urgencyColors[task.urgency] }}
                      />
                      <div className="flex items-start justify-between gap-4">
                        <div className="pl-2">
                          <p className="text-lg font-semibold text-[#DAE2FD]">{task.title}</p>
                          {task.description && <p className="mt-1 text-sm text-[#8D99A4]">{task.description}</p>}
                        </div>
                        <div className="rounded-2xl border border-[#00FFFF]/10 bg-[#06080d] px-3 py-2 text-right text-xs uppercase tracking-[0.3em] text-[#BBC9CD]">
                          <span className="flex items-center justify-end gap-2 text-[11px] text-[#00FFFF]">
                            <Clock className="h-4 w-4" />
                            {formatClock(task.time)}
                          </span>
                          <span className="mt-1 block text-[10px] text-[#71717A]">{formatDuration(task.duration)}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pl-2 text-[11px] uppercase tracking-[0.3em]">
                        <span className={`flex items-center gap-1 font-medium ${task.status === "completed" ? "text-[#22C55E]" : "text-[#FACC15]"}`}>
                          {task.status === "completed" ? "Completed" : "Pending"}
                        </span>
                        <span
                          className="rounded-full border border-white/10 px-2.5 py-1 font-semibold"
                          style={{
                            color: urgencyColors[task.urgency],
                            borderColor: `${urgencyColors[task.urgency]}33`,
                            background: `${urgencyColors[task.urgency]}1f`,
                          }}
                        >
                          {task.urgency}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
