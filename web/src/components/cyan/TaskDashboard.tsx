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
import VoiceTaskInput from "./VoiceTaskInput";
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

// ── Helper functions ────────────────────────────────────────────────────────

const urgencyBorderColor = (urgency: Task['urgency']) => {
  if (urgency === 'high') return '#FF4444';
  if (urgency === 'medium') return '#D97706';
  return '#4499DD';
};

const urgencyBadgeStyle = (urgency: Task['urgency']): React.CSSProperties => {
  const map: Record<Task['urgency'], { color: string; background: string }> = {
    high:   { color: '#FF4444', background: 'rgba(255,68,68,0.12)' },
    medium: { color: '#D97706', background: 'rgba(217,119,6,0.12)' },
    low:    { color: '#4499DD', background: 'rgba(68,153,221,0.12)' },
  };
  return {
    ...map[urgency],
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: '4px',
    padding: '1px 6px',
  };
};

const formatRelativeDate = (dateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  return `${diffDays} days ago`;
};

const sortTasks = (tasks: Task[]): Task[] => {
  const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    const aComplete = a.status === 'completed' ? 1 : 0;
    const bComplete = b.status === 'completed' ? 1 : 0;
    if (aComplete !== bComplete) return aComplete - bComplete;
    const uDiff = (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
    if (uDiff !== 0) return uDiff;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return 0;
  });
};

const resolveDate = (which: 'today' | 'tomorrow'): string => {
  const d = new Date();
  if (which === 'tomorrow') d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

// ── Component ───────────────────────────────────────────────────────────────

export function TaskDashboard() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTime, setFormTime] = useState('');
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDate, setTaskDate] = useState<'today' | 'tomorrow'>('today');
  const [submitting, setSubmitting] = useState(false);

  // Inline-edit state for overdue tasks
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchTasks = async () => {
    try {
      const [todayData, overdueData] = await Promise.all([
        taskService.getTasksForToday(),
        taskService.getOverdueTasks(),
      ]);
      setTasks(sortTasks(todayData));
      setOverdueTasks(overdueData);
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

  const toggleOverdueTask = async (id: string, currentStatus: string) => {
    try {
      setOverdueTasks(prev => prev.map(task =>
        task.id === id ? { ...task, status: currentStatus === 'completed' ? 'pending' as const : 'completed' as const } : task
      ));
      await taskService.toggleTaskStatus(id, currentStatus);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to toggle overdue task:', err);
      fetchTasks();
    }
  };

  const deleteOverdueTask = async (id: string) => {
    try {
      setOverdueTasks(prev => prev.filter(t => t.id !== id));
      await taskService.deleteTask(id);
    } catch (err) {
      console.error('Failed to delete overdue task:', err);
      fetchTasks();
    }
  };

  const startEditOverdue = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
  };

  const saveEditOverdue = async (task: Task) => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    try {
      setOverdueTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, title: trimmed } : t
      ));
      await taskService.updateTask(task.id, { title: trimmed });
    } catch (err) {
      console.error('Failed to update overdue task:', err);
      fetchTasks();
    } finally {
      setEditingTaskId(null);
      setEditTitle('');
    }
  };

  const cancelEditOverdue = () => {
    setEditingTaskId(null);
    setEditTitle('');
  };

  const handleCreateTask = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      await taskService.createTask({
        title: formTitle,
        description: formDescription || null,
        time: formTime || null,
        urgency,
        date: resolveDate(taskDate),
        duration: null,
      });
      setFormTitle('');
      setFormDescription('');
      setFormTime('');
      setUrgency('medium');
      setTaskDate('today');
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Form header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#BBC9CD', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Add Task
                </span>
                <VoiceTaskInput
                  onExtracted={(fields) => {
                    if (fields.title) setFormTitle(fields.title);
                    if (fields.description) setFormDescription(fields.description);
                    if (fields.time) setFormTime(fields.time);
                    if (fields.urgency) setUrgency(fields.urgency);
                  }}
                />
              </div>

              {/* Title */}
              <input
                type="text"
                placeholder="Task title *"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#1A1A1A', border: '1px solid rgba(0,255,255,0.2)', color: '#DAE2FD', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />

              {/* Description */}
              <textarea
                placeholder="Description (optional)"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#1A1A1A', border: '1px solid rgba(0,255,255,0.2)', color: '#DAE2FD', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />

              {/* Time + Today/Tomorrow toggle */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  placeholder="Time (09:00)"
                  style={{ flex: 1, background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#DAE2FD', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
                />
                <div style={{ display: 'flex', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  {(['today', 'tomorrow'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTaskDate(opt)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: taskDate === opt ? 'linear-gradient(135deg, #0099CC, #00FFFF)' : 'transparent',
                        color: taskDate === opt ? '#000' : '#BBC9CD',
                      }}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency selector */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['high', 'medium', 'low'] as const).map(level => {
                  const colors = {
                    high:   { active: 'rgba(255,68,68,0.25)',   border: 'rgba(255,68,68,0.6)',   text: '#FF4444', inactiveBg: 'rgba(255,68,68,0.08)',   inactiveBorder: 'rgba(255,68,68,0.25)' },
                    medium: { active: 'rgba(217,119,6,0.25)',   border: 'rgba(217,119,6,0.6)',   text: '#D97706', inactiveBg: 'rgba(217,119,6,0.08)',   inactiveBorder: 'rgba(217,119,6,0.25)' },
                    low:    { active: 'rgba(68,153,221,0.25)',  border: 'rgba(68,153,221,0.6)',  text: '#4499DD', inactiveBg: 'rgba(68,153,221,0.08)',  inactiveBorder: 'rgba(68,153,221,0.25)' },
                  }[level];
                  const isActive = urgency === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setUrgency(level)}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: `1px solid ${isActive ? colors.border : colors.inactiveBorder}`,
                        background: isActive ? colors.active : colors.inactiveBg,
                        color: colors.text,
                      }}
                    >
                      {level.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-2 rounded-xl text-[#BBC9CD] hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateTask}
                  disabled={submitting || !formTitle.trim()}
                  className="px-6 py-2 rounded-xl bg-[#00FFFF]/20 text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-all"
                >
                  {submitting ? 'Adding...' : 'Save Task'}
                </button>
              </div>
            </div>
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
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* ── Overdue section ─────────────────────────────────── */}
                  {overdueTasks.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                          ⚠ Overdue
                        </span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(245,158,11,0.25)' }} />
                        <span style={{ fontSize: '10px', color: '#BBC9CD' }}>{overdueTasks.length} carried over</span>
                      </div>

                      {overdueTasks.map(task => (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px 14px', background: '#1A1A1A', borderRadius: '10px',
                            borderLeft: '3px solid #F59E0B',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={() => toggleOverdueTask(task.id, task.status)}
                            style={{ accentColor: '#F59E0B', width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {editingTaskId === task.id ? (
                              <input
                                autoFocus
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEditOverdue(task);
                                  if (e.key === 'Escape') cancelEditOverdue();
                                }}
                                style={{
                                  width: '100%', background: '#0D0D0D', border: '1px solid #4499DD',
                                  color: '#DAE2FD', borderRadius: '6px', padding: '4px 8px',
                                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                                }}
                              />
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '14px', color: '#DAE2FD' }}>{task.title}</span>
                                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', borderRadius: '4px', padding: '1px 6px' }}>
                                    overdue
                                  </span>
                                  <span style={urgencyBadgeStyle(task.urgency)}>
                                    {task.urgency.toUpperCase()}
                                  </span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#BBC9CD', marginTop: '3px' }}>
                                  {formatRelativeDate(task.date)}
                                  {task.description && ` · ${task.description}`}
                                </div>
                              </>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            {editingTaskId === task.id ? (
                              <>
                                <button
                                  onClick={() => saveEditOverdue(task)}
                                  style={{ fontSize: '10px', color: '#00FFFF', background: '#0D0D0D', border: '1px solid rgba(0,255,255,0.4)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditOverdue}
                                  style={{ fontSize: '10px', color: '#BBC9CD', background: '#0D0D0D', border: '1px solid #333', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditOverdue(task)}
                                  style={{ fontSize: '10px', color: '#BBC9CD', background: '#0D0D0D', border: '1px solid #333', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteOverdueTask(task.id)}
                                  style={{ fontSize: '10px', color: '#BBC9CD', background: '#0D0D0D', border: '1px solid #333', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Today section ────────────────────────────────────── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#00FFFF', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        Today
                      </span>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(0,255,255,0.15)' }} />
                    </div>

                    {tasks.length === 0 ? (
                      <div className="text-[#BBC9CD] text-center py-8">No tasks for today. Start fresh!</div>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            borderLeft: `3px solid ${task.status === 'completed' ? '#333' : urgencyBorderColor(task.urgency)}`,
                            background: task.status === 'completed' ? '#0F0F0F' : '#1A1A1A',
                            opacity: task.status === 'completed' ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '16px',
                            transition: 'opacity 0.2s',
                          }}
                        >
                          <button
                            onClick={() => toggleTask(task.id, task.status)}
                            style={{ marginTop: '2px', flexShrink: 0 }}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-[#00FFFF] border-[#00FFFF] text-black' : 'border-[#00FFFF]/50 text-transparent hover:border-[#00FFFF]'}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <div className="flex-1">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <h3 className={`font-semibold ${task.status === 'completed' ? 'text-[#BBC9CD] line-through' : 'text-[#DAE2FD]'}`}>
                                {task.title}
                              </h3>
                              <span style={urgencyBadgeStyle(task.urgency)}>
                                {task.urgency.toUpperCase()}
                              </span>
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
                      ))
                    )}
                  </div>

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
