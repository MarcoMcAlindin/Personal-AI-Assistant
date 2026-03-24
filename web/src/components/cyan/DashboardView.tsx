// web/src/components/cyan/DashboardView.tsx
import React, { useEffect, useState } from 'react';
import { taskService } from '../../services/taskService';
import { emailService } from '../../services/emailService';
import { healthService, HealthMetric } from '../../services/healthService';
import { feedService } from '../../services/feedService';
import { campaignService } from '../../services/campaignService';
import { Task } from '../../types/tasks';
import { Email } from '../../types/email';
import { relativeDate } from '../../utils/relativeDate';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtSleep(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function fmtElapsed(since: Date): string {
  const mins = Math.floor((Date.now() - since.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── style constants ─────────────────────────────────────────────────────────

const PAGE: React.CSSProperties = {
  padding: '24px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  maxWidth: '860px',
};

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
};

function glassCard(border: string, glow: string): React.CSSProperties {
  return {
    background: 'rgba(26,26,26,0.8)',
    backdropFilter: 'blur(24px)',
    borderRadius: '16px',
    padding: '18px',
    border: `1px solid ${border}`,
    boxShadow: `0 4px 24px ${glow}`,
  };
}

const CARD_LABEL: React.CSSProperties = {
  fontSize: '10px',
  color: '#BBC9CD',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '14px',
};

function Skeleton() {
  return <div style={{ height: '20px', width: '60%', background: '#2A2A2A', borderRadius: '4px', marginTop: '8px' }} />;
}

function NoData({ msg = 'No data available' }: { msg?: string }) {
  return <div style={{ fontSize: '10px', color: '#BBC9CD', marginTop: '8px' }}>{msg}</div>;
}

// ─── SVG ring ────────────────────────────────────────────────────────────────
function Ring({ pct, color, gradId }: { pct: number; color: string; gradId?: string }) {
  const C = 151;
  const offset = C * (1 - Math.min(pct, 1));
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ flexShrink: 0 }}>
      <circle cx="30" cy="30" r="24" fill="none" stroke="#2A2A2A" strokeWidth="5" />
      <circle cx="30" cy="30" r="24" fill="none"
        stroke={gradId ? `url(#${gradId})` : color}
        strokeWidth="5"
        strokeDasharray={C}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
      />
      {gradId && (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%">
            <stop offset="0%" stopColor="#0099CC" />
            <stop offset="100%" stopColor="#00FFFF" />
          </linearGradient>
        </defs>
      )}
      <text x="30" y="34" textAnchor="middle" fill={color} fontSize="11" fontWeight="700"
        fontFamily="-apple-system, sans-serif">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

// ─── small ring (r=13, C≈82) for health ──────────────────────────────────────
function SmallRing({ pct, color, label }: { pct: number; color: string; label: string }) {
  const C = 82;
  const offset = C * (1 - Math.min(pct, 1));
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="13" fill="none" stroke="#2A2A2A" strokeWidth="4" />
        <circle cx="18" cy="18" r="13" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 18 18)" />
      </svg>
      <div style={{ fontSize: '9px', color, marginTop: '1px' }}>{label}</div>
    </div>
  );
}

// ─── UrgencyBar ──────────────────────────────────────────────────────────────
function UrgencyBar({ label: lbl, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
      <div style={{ fontSize: '9px', color, width: '26px' }}>{lbl}</div>
      <div style={{ flex: 1, height: '4px', background: '#2A2A2A', borderRadius: '2px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <div style={{ fontSize: '9px', color: '#BBC9CD' }}>{count}</div>
    </div>
  );
}

// ─── TASKS CARD ──────────────────────────────────────────────────────────────
function TasksCard({ tasks, overdue, loading }: { tasks: Task[]; overdue: Task[]; loading: boolean }) {
  const done = tasks.filter(t => t.is_done).length;
  const total = tasks.length;
  const pct = total > 0 ? done / total : 0;
  const high = tasks.filter(t => t.urgency === 'high').length;
  const med = tasks.filter(t => t.urgency === 'medium').length;
  const low = tasks.filter(t => t.urgency === 'low').length;

  return (
    <div style={glassCard('rgba(0,255,255,0.2)', 'rgba(0,255,255,0.05)')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={CARD_LABEL}>Tasks · Today</div>
        {overdue.length > 0 && (
          <span style={{ fontSize: '10px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '2px 7px', borderRadius: '8px' }}>
            {overdue.length} overdue
          </span>
        )}
      </div>
      {loading ? <Skeleton /> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Ring pct={pct} color="#00FFFF" gradId="tg-dash" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: '#BBC9CD', marginBottom: '6px' }}>Urgency split</div>
              <UrgencyBar label="HIGH" count={high} total={total} color="#FF4444" />
              <UrgencyBar label="MED" count={med} total={total} color="#D97706" />
              <UrgencyBar label="LOW" count={low} total={total} color="#4499DD" />
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
            <span style={{ fontSize: '10px', background: '#0D0D0D', color: '#BBC9CD', padding: '2px 7px', borderRadius: '8px' }}>{total} today</span>
            <span style={{ fontSize: '10px', background: '#0D0D0D', color: '#BBC9CD', padding: '2px 7px', borderRadius: '8px' }}>{done} done</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── EMAIL CARD ──────────────────────────────────────────────────────────────
function EmailCard({ emails, loading }: { emails: Email[]; loading: boolean }) {
  const unread = emails.filter(e => e.is_read === false).length;
  const total = emails.length;
  const pct = total > 0 ? Math.round((unread / total) * 100) : 0;
  const latest = emails[0];

  return (
    <div style={glassCard('rgba(0,153,204,0.2)', 'rgba(0,153,204,0.05)')}>
      <div style={CARD_LABEL}>Email · Inbox</div>
      {loading ? <Skeleton /> : total === 0 ? <NoData msg="No emails" /> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#00FFFF', lineHeight: 1 }}>{unread}</div>
              <div style={{ fontSize: '9px', color: '#BBC9CD', marginTop: '2px' }}>unread</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: '26px', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '4px' }}>
                <div style={{ width: `${pct}%`, minWidth: unread > 0 ? '24px' : '0', background: '#0099CC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#000', fontWeight: 700 }}>
                  {unread > 0 ? unread : ''}
                </div>
                <div style={{ flex: 1, background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#BBC9CD' }}>
                  {total - unread} read
                </div>
              </div>
              <div style={{ fontSize: '9px', color: '#BBC9CD' }}>{pct}% unread of {total}</div>
            </div>
          </div>
          {latest && (
            <div style={{ fontSize: '11px', color: '#DAE2FD', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: '#0D0D0D', padding: '6px 10px', borderRadius: '8px' }}>
              📧 {latest.subject || '(no subject)'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── HEALTH CARD ─────────────────────────────────────────────────────────────
function HealthCard({ metric, loading }: { metric: HealthMetric | null; loading: boolean }) {
  const steps = (metric?.raw_watch_data as any)?.step_count ?? 0;
  const stepGoal = 10000;
  const heartRate = metric?.avg_heart_rate ?? 0;
  const sleep = metric?.sleep_duration ?? 0;
  const ai = metric?.ai_analysis ?? '';

  return (
    <div style={glassCard('rgba(76,175,80,0.2)', 'rgba(76,175,80,0.05)')}>
      <div style={CARD_LABEL}>Health · Today</div>
      {loading ? <Skeleton /> : !metric ? <NoData /> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#4CAF50' }}>{steps > 0 ? steps.toLocaleString() : '–'}</div>
              <div style={{ fontSize: '9px', color: '#BBC9CD' }}>steps · goal 10k</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
              <SmallRing pct={heartRate / 180} color="#FF4444" label={`${heartRate} bpm`} />
              <SmallRing pct={steps / stepGoal} color="#4CAF50" label={`${Math.round((steps / stepGoal) * 100)}% goal`} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px', marginBottom: '2px' }}>
            {[0.35, 0.5, 0.55, 0.7, 0.5, 0.75, 1].map((op, i) => (
              <div key={i} style={{ flex: 1, background: i === 6 ? '#00FFFF' : '#4CAF50', opacity: i === 6 ? 1 : op, height: `${[40, 65, 50, 85, 55, 75, 100][i]}%`, borderRadius: '2px 2px 0 0' }} />
            ))}
          </div>
          <div style={{ fontSize: '9px', color: '#BBC9CD', marginBottom: '10px' }}>7-day steps</div>

          <div style={{ height: '1px', background: '#2A2A2A', marginBottom: '10px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#7DD3FC' }}>{sleep > 0 ? fmtSleep(sleep) : '–'}</div>
              <div style={{ fontSize: '9px', color: '#BBC9CD' }}>sleep · goal 8h</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: '4px', background: '#2A2A2A', borderRadius: '2px', marginBottom: '3px' }}>
                <div style={{ width: `${Math.min((sleep / 8) * 100, 100)}%`, height: '100%', background: '#7DD3FC', borderRadius: '2px' }} />
              </div>
              <div style={{ fontSize: '9px', color: '#BBC9CD' }}>{Math.round((sleep / 8) * 100)}% of goal</div>
            </div>
          </div>

          {ai && (
            <div style={{ background: '#0D0D0D', border: '1px solid rgba(0,255,255,0.08)', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ fontSize: '9px', color: '#00FFFF', marginBottom: '3px', letterSpacing: '0.5px' }}>AI ANALYSIS</div>
              <div style={{ fontSize: '10px', color: '#BBC9CD', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                {ai}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── NEWS CARD ───────────────────────────────────────────────────────────────
function NewsCard({ articles, fetchedAt, loading }: { articles: any[]; fetchedAt: Date | null; loading: boolean }) {
  const top3 = articles.slice(0, 3);
  const rest = articles.length - 3;
  const opacities = [1, 0.6, 0.35];

  return (
    <div style={glassCard('rgba(217,119,6,0.2)', 'rgba(217,119,6,0.05)')}>
      <div style={CARD_LABEL}>News · Top Stories</div>
      {loading ? <Skeleton /> : top3.length === 0 ? <NoData /> : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {top3.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ width: '3px', minHeight: '12px', background: '#D97706', borderRadius: '2px', flexShrink: 0, marginTop: '2px', opacity: opacities[i] }} />
                <div style={{ fontSize: '11px', color: i === 0 ? '#DAE2FD' : '#BBC9CD', lineHeight: 1.4, opacity: i === 2 ? 0.7 : 1 }}>
                  {a.title}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '10px', fontSize: '9px', color: '#BBC9CD' }}>
            {rest > 0 ? `+${rest} more` : 'All stories shown'}{fetchedAt ? ` · updated ${fmtElapsed(fetchedAt)}` : ''}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MONEY CARD (placeholder) ─────────────────────────────────────────────────
function MoneyCard() {
  const C = 151;
  const offset = C * 0.35;
  return (
    <div style={glassCard('rgba(167,139,250,0.2)', 'rgba(167,139,250,0.05)')}>
      <div style={CARD_LABEL}>Money · This Month</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <svg width="60" height="60" viewBox="0 0 60 60" style={{ flexShrink: 0 }}>
          <circle cx="30" cy="30" r="24" fill="none" stroke="#2A2A2A" strokeWidth="7" />
          <circle cx="30" cy="30" r="24" fill="none" stroke="#A78BFA" strokeWidth="7"
            strokeDasharray={C} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 30 30)" />
          <text x="30" y="33" textAnchor="middle" fill="#A78BFA" fontSize="11" fontWeight="700"
            fontFamily="-apple-system, sans-serif">—</text>
        </svg>
        <div>
          <div style={{ fontSize: '13px', color: '#A78BFA', fontWeight: 600 }}>Coming soon</div>
          <div style={{ fontSize: '10px', color: '#BBC9CD', marginTop: '4px' }}>Budget tracking not yet connected</div>
        </div>
      </div>
    </div>
  );
}

// ─── JOBS CARD ───────────────────────────────────────────────────────────────
function JobsCard({ applications, loading }: { applications: any[]; loading: boolean }) {
  const applied = applications.filter((a: any) => a.applied_at != null);
  const top3 = applied.slice(0, 3);
  const rest = applied.length - 3;

  function getTitle(a: any): string {
    return a.cover_letter_metadata?.job_snapshot?.job_title ?? a.inbox_items?.job_title ?? 'Unknown Role';
  }
  function getCompany(a: any): string {
    return a.cover_letter_metadata?.job_snapshot?.company_name ?? a.inbox_items?.company_name ?? 'Unknown Company';
  }

  return (
    <div style={glassCard('rgba(255,68,68,0.2)', 'rgba(255,68,68,0.05)')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={CARD_LABEL}>Jobs · Applications</div>
        <span style={{ fontSize: '22px', fontWeight: 700, color: '#FF4444' }}>{applied.length}</span>
      </div>
      {loading ? <Skeleton /> : applied.length === 0 ? <NoData msg="No applications yet" /> : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {top3.map((a: any, i: number) => (
              <React.Fragment key={a.id ?? i}>
                {i > 0 && <div style={{ height: '1px', background: '#2A2A2A' }} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#DAE2FD' }}>{getTitle(a)}</div>
                    <div style={{ fontSize: '9px', color: '#BBC9CD', marginTop: '1px' }}>{getCompany(a)}</div>
                  </div>
                  <div style={{ fontSize: '9px', color: '#BBC9CD', flexShrink: 0, marginLeft: '8px' }}>
                    {a.applied_at ? shortDate(a.applied_at) : '–'}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
          {rest > 0 && (
            <div style={{ marginTop: '10px', fontSize: '9px', color: '#BBC9CD' }}>+{rest} more applications</div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export function DashboardView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [health, setHealth] = useState<HealthMetric | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [newsFetchedAt, setNewsFetchedAt] = useState<Date | null>(null);

  const [loading, setLoading] = useState({
    tasks: true, emails: true, health: true, news: true, jobs: true,
  });

  useEffect(() => {
    Promise.allSettled([
      taskService.getTasksForToday(),
      taskService.getOverdueTasks(),
      emailService.fetchInbox(),
      healthService.getLatestMetrics(),
      feedService.getTechFeeds(),
      campaignService.getApplications(),
    ]).then(([todayRes, overdueRes, emailRes, healthRes, newsRes, jobsRes]) => {
      if (todayRes.status === 'fulfilled') setTasks(todayRes.value);
      if (overdueRes.status === 'fulfilled') setOverdue(overdueRes.value);
      setLoading(l => ({ ...l, tasks: false }));

      if (emailRes.status === 'fulfilled') setEmails(emailRes.value);
      setLoading(l => ({ ...l, emails: false }));

      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      setLoading(l => ({ ...l, health: false }));

      if (newsRes.status === 'fulfilled') {
        setArticles(newsRes.value);
        setNewsFetchedAt(new Date());
      }
      setLoading(l => ({ ...l, news: false }));

      if (jobsRes.status === 'fulfilled') setApplications(jobsRes.value as any[]);
      setLoading(l => ({ ...l, jobs: false }));
    });
  }, []);

  return (
    <div style={PAGE}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: '#BBC9CD', textTransform: 'uppercase', letterSpacing: '2px' }}>Overview</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#DAE2FD', marginTop: '2px' }}>Dashboard</div>
        <div style={{ width: '50px', height: '2px', background: 'linear-gradient(to right, #00FFFF, transparent)', marginTop: '6px' }} />
      </div>

      <div style={GRID}>
        <TasksCard tasks={tasks} overdue={overdue} loading={loading.tasks} />
        <EmailCard emails={emails} loading={loading.emails} />
        <HealthCard metric={health} loading={loading.health} />
        <NewsCard articles={articles} fetchedAt={newsFetchedAt} loading={loading.news} />
        <MoneyCard />
        <JobsCard applications={applications} loading={loading.jobs} />
      </div>
    </div>
  );
}
