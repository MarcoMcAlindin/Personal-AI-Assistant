import React, { useState, useEffect } from 'react';
import { taskService } from '../../services/taskService';
import { Task } from '../../types/tasks';
import './Planner.css';

const PlannerHub = (): JSX.Element => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

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
      await Promise.all(tasks.map(t => taskService.deleteTask(t.id)));
      setShowDeleteConfirm(false);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to delete tasks:', err);
    }
  };

  const resetAddForm = () => {
    setShowAddForm(false);
    setFormTitle('');
    setFormDescription('');
    setFormTime('');
    setFormDuration('');
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
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hr`;
  };

  const getTodayDisplayDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <div className="planner-container">
      <header className="planner-header">
        <div className="planner-title-group">
          <div className="planner-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="planner-info">
            <h1>Daily Planner</h1>
            <span className="planner-subtitle">{getTodayDisplayDate()} • Auto-archives at midnight</span>
          </div>
        </div>

        <div className="planner-controls">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
          </div>
          <button
            className="icon-btn"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete all tasks for today"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
          <button className="add-task-btn" onClick={() => setShowAddForm(v => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Task
          </button>
        </div>
      </header>

      {showAddForm && (
        <form className="add-task-form" onSubmit={handleCreateTask}>
          <div className="form-row">
            <input
              className="form-input"
              type="text"
              placeholder="Task title *"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-row">
            <textarea
              className="form-input form-textarea"
              placeholder="Description (optional)"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-row form-row-split">
            <input
              className="form-input"
              type="time"
              value={formTime}
              onChange={e => setFormTime(e.target.value)}
            />
            <input
              className="form-input"
              type="number"
              placeholder="Duration (mins)"
              value={formDuration}
              onChange={e => setFormDuration(e.target.value)}
              min={1}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="form-cancel-btn" onClick={resetAddForm}>
              Cancel
            </button>
            <button type="submit" className="form-submit-btn" disabled={submitting || !formTitle.trim()}>
              {submitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      )}

      {showDeleteConfirm && (
        <div className="confirm-dialog">
          <p>Delete all tasks for today? This cannot be undone.</p>
          <div className="confirm-actions">
            <button className="form-cancel-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            <button className="confirm-delete-btn" onClick={handleDeleteAll}>Delete All</button>
          </div>
        </div>
      )}

      <div className="progress-section">
        <div className="progress-header">
          <span>Progress</span>
          <span>{completedCount}/{tasks.length} complete</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      <div className={`task-list ${viewMode === 'grid' ? 'task-grid' : ''}`}>
        {loading ? (
          <div className="loading-state" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tasks for today. Start fresh!
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
              <div className="task-checkbox-wrapper">
                <div className="custom-checkbox" onClick={() => toggleTask(task.id, task.status)}>
                  <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <div className="task-content">
                <h3 className="task-title">{task.title}</h3>
                <p className="task-description">{task.description}</p>
                <div className="task-meta">
                  <div className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {formatTime(task.time)}
                  </div>
                  <div className="meta-item">{formatDuration(task.duration)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="planner-footer">
        <button className="archive-link" onClick={() => console.log('[Planner] View Archive clicked — route pending')}>
          View Archive
        </button>
      </div>
    </div>
  );
};

export default PlannerHub;
