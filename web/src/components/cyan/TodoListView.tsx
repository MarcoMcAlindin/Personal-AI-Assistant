import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, CheckSquare, Circle, CheckCircle2 } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

const todos = [
  { id: 1, title: "Review AI agent performance metrics", completed: true, priority: "high" },
  { id: 2, title: "Update system documentation", completed: false, priority: "medium" },
  { id: 3, title: "Schedule team meeting for next sprint", completed: false, priority: "high" },
  { id: 4, title: "Optimize database queries", completed: true, priority: "low" },
  { id: 5, title: "Review security audit report", completed: false, priority: "high" },
  { id: 6, title: "Update dependencies in package.json", completed: false, priority: "medium" },
];

export function TodoListView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

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
                  Todo List
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                My Tasks
              </h1>
              <p className="text-[#BBC9CD] mt-1">Manage your daily tasks</p>
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

        <div className="grid grid-cols-3 gap-4 mb-8">
          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">Total</div>
            <div className="text-2xl font-bold text-[#00FFFF]">{totalCount}</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-400">{completedCount}</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">Remaining</div>
            <div className="text-2xl font-bold text-[#00FFFF]">{totalCount - completedCount}</div>
          </GlassCard>
        </div>

        <GlassCard className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#BBC9CD]">Progress</span>
            <span className="text-sm font-semibold text-[#00FFFF]">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00FFFF] to-[#0099CC] rounded-full"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            ></div>
          </div>
        </GlassCard>

        <div className="space-y-3">
          {todos.map((todo) => (
            <GlassCard key={todo.id} className="!p-4 hover:border-[#00FFFF]/40 transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                {todo.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-[#BBC9CD] flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${todo.completed ? 'text-[#BBC9CD] line-through' : 'text-[#DAE2FD]'}`}>
                    {todo.title}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-md inline-block mt-2 ${
                    todo.priority === 'high' 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : todo.priority === 'medium'
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {todo.priority}
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
