import { useOutletContext } from "react-router";
import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { MobileHeader } from "./MobileHeader";
import { MobileDashboard } from "./MobileDashboard";
import { BurgerMenu } from "./BurgerMenu";
import { GlassCard } from "./GlassCard";
import { taskService } from "../../services/taskService";
import { Task } from "../../types/tasks";
import { 
  Search, 
  Bell, 
  User,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Activity,
  TrendingUp,
  Cpu,
  Database,
  Menu,
  Plus,
  Trash2
} from "lucide-react";

export function TaskDashboard() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      const data = await taskService.getTasksForToday();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTask = async (id: string, currentStatus: string) => {
    try {
      setTasks(prev => prev.map(task =>
        task.id === id ? { ...task, status: currentStatus === 'completed' ? 'pending' as const : 'completed' as const } : task
      ));
      await taskService.toggleTaskStatus(id, currentStatus);
    } catch (err) {
      console.error('Failed to toggle task:', err);
      fetchTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await taskService.createTask({
        date: today,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        time: formTime || null,
        duration: formDuration ? parseInt(formDuration, 10) : null,
      });
      setFormTitle('');
      setFormDescription('');
      setFormTime('');
      setFormDuration('');
      setShowAddForm(false);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      if (confirm('Delete all tasks for today? This cannot be undone.')) {
        await Promise.all(tasks.map(t => taskService.deleteTask(t.id)));
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to delete tasks:', err);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${ampm}`;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const stats = [
    { label: "Total Tasks", value: tasks.length.toString(), change: "+2", icon: Cpu, color: "cyan" },
    { label: "Completed", value: completedCount.toString(), change: "+4", icon: Activity, color: "cyan" },
    { label: "Completion Rate", value: `${progressPercent}%`, change: "+3%", icon: TrendingUp, color: "green" },
  ];

  if (isMobile) {
    return (
      <div className="pt-16 pb-8 min-h-screen">
        <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="p-4">
          <header className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
                  <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                    Planner
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-[#DAE2FD] tracking-tight">
                  Dashboard
                </h1>
              </div>
              <button
                onClick={() => setMenuOpen(true)}
                className="p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors border border-[#00FFFF]/20"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </header>
          <MobileDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'pb-24 pt-16' : 'pl-64'} min-h-screen`}>
      {!isMobile && <Sidebar />}

      <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
                <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                  Personal Planner
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Daily Tasks
              </h1>
              <p className="text-[#BBC9CD] mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • Auto-archives at midnight</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 p-3 font-semibold rounded-xl bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all">
                <Plus className="w-5 h-5" />
                Add Task
              </button>
              <button onClick={handleDeleteAll} className="p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 text-[#BBC9CD] transition-colors border border-[#00FFFF]/20">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {showAddForm && (
          <GlassCard className="mb-8">
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Task title *"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                  className="col-span-2 w-full px-4 py-3 rounded-xl bg-[#1A1A1A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] focus:outline-none focus:border-[#00FFFF]/40"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="col-span-2 w-full px-4 py-3 rounded-xl bg-[#1A1A1A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] focus:outline-none focus:border-[#00FFFF]/40"
                />
                <input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Duration (mins)"
                  value={formDuration}
                  onChange={e => setFormDuration(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-2 rounded-xl text-[#BBC9CD] hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !formTitle.trim()} className="px-6 py-2 rounded-xl bg-[#00FFFF]/20 text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-all">
                  {submitting ? 'Adding...' : 'Save Task'}
                </button>
              </div>
            </form>
          </GlassCard>
        )}

        <div className={`grid grid-cols-3 gap-4 mb-8`}>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <GlassCard key={stat.label}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${stat.color === 'cyan' ? 'bg-[#00FFFF]/10 text-[#00FFFF]' : 'bg-green-500/10 text-green-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className={`text-3xl font-bold text-[#DAE2FD] mb-1`}>{stat.value}</div>
                <div className="text-sm text-[#BBC9CD]">{stat.label}</div>
              </GlassCard>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#DAE2FD]">Active Tasks</h2>
              </div>
              {loading ? (
                <div className="text-[#BBC9CD] text-center py-8">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="text-[#BBC9CD] text-center py-8">No tasks for today. Start fresh!</div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-4 rounded-xl bg-[#0D0D12]/50 border border-[#00FFFF]/10 hover:border-[#00FFFF]/30 transition-all flex items-start gap-4">
                      <button onClick={() => toggleTask(task.id, task.status)} className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-[#00FFFF] border-[#00FFFF] text-black' : 'border-[#00FFFF]/50 text-transparent hover:border-[#00FFFF]'}`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${task.status === 'completed' ? 'text-[#BBC9CD] line-through' : 'text-[#DAE2FD]'}`}>{task.title}</h3>
                        </div>
                        {task.description && <p className="text-sm text-[#BBC9CD] mb-2">{task.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-[#BBC9CD]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(task.time)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            <span>{formatDuration(task.duration)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
          
          <div className="space-y-6">
             {/* Progress side-card */}
             <GlassCard>
               <h3 className="font-bold text-[#DAE2FD] mb-4">Daily Progress</h3>
               <div className="flex justify-between text-sm mb-2 text-[#BBC9CD]">
                 <span>Completion</span>
                 <span>{progressPercent}%</span>
               </div>
               <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-[#00FFFF] to-[#0099CC] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
               </div>
             </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}