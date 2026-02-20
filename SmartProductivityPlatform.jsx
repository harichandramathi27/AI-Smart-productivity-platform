import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
// CONSTANTS & UTILITIES
// ============================================================
const STORAGE_KEY = "smart_productivity_tasks";
const SETTINGS_KEY = "smart_productivity_settings";

const PRIORITY_COLORS = {
  critical: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40", dot: "bg-red-500" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40", dot: "bg-orange-500" },
  medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40", dot: "bg-yellow-500" },
  low: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/40", dot: "bg-green-500" },
};

const STATUS_COLORS = {
  pending: { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/40" },
  "in-progress": { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40" },
  completed: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/40" },
  overdue: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40" },
};

const SAMPLE_TASKS = [
  { id: "1", title: "Design System Architecture", description: "Plan microservices structure and API gateway patterns for the new platform", deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 16), priority: "critical", status: "in-progress", category: "Engineering", estimatedHours: 4, createdAt: new Date().toISOString() },
  { id: "2", title: "Q4 Marketing Report", description: "Compile analytics data and write executive summary for board presentation", deadline: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16), priority: "high", status: "pending", category: "Marketing", estimatedHours: 3, createdAt: new Date().toISOString() },
  { id: "3", title: "Team 1-on-1 Meetings", description: "Schedule and conduct weekly performance check-ins with all direct reports", deadline: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16), priority: "medium", status: "pending", category: "Management", estimatedHours: 2, createdAt: new Date().toISOString() },
  { id: "4", title: "Code Review: Auth Module", description: "Review pull requests for authentication refactor and security improvements", deadline: new Date(Date.now() - 86400000).toISOString().slice(0, 16), priority: "high", status: "overdue", category: "Engineering", estimatedHours: 2, createdAt: new Date().toISOString() },
  { id: "5", title: "Documentation Update", description: "Update API documentation with new endpoints and deprecation notices", deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), priority: "low", status: "completed", category: "Engineering", estimatedHours: 1.5, createdAt: new Date().toISOString() },
  { id: "6", title: "Budget Planning FY2025", description: "Prepare departmental budget proposals and resource allocation analysis", deadline: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16), priority: "critical", status: "pending", category: "Finance", estimatedHours: 6, createdAt: new Date().toISOString() },
];

const generateId = () => `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const formatDeadline = (dateStr) => {
  if (!dateStr) return "No deadline";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (diff < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return hours > 0 ? `${hours}h left` : "Due soon";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `${days}d left`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getTaskUrgency = (task) => {
  if (!task.deadline) return 0;
  const diff = new Date(task.deadline) - new Date();
  const hours = diff / 3600000;
  const priorityScore = { critical: 100, high: 75, medium: 50, low: 25 }[task.priority] || 0;
  const urgencyScore = hours < 0 ? 200 : hours < 24 ? 150 : hours < 72 ? 100 : hours < 168 ? 50 : 0;
  return priorityScore + urgencyScore;
};

// ============================================================
// AI SERVICE (Simulated — swap with real API call)
// ============================================================
const AIService = {
  async analyzePriorities(tasks) {
    await new Promise(r => setTimeout(r, 1400));
    const sorted = [...tasks].filter(t => t.status !== "completed").sort((a, b) => getTaskUrgency(b) - getTaskUrgency(a));
    return {
      recommendations: sorted.slice(0, 3).map((task, i) => ({
        taskId: task.id, taskTitle: task.title, rank: i + 1,
        reason: i === 0 ? `🔥 Highest urgency: ${task.priority} priority with deadline ${formatDeadline(task.deadline)}. Start immediately.`
          : i === 1 ? `⚡ Second priority: Potential blocker. Complete after task #1 to maintain momentum.`
          : `📋 Third priority: Schedule for this afternoon to stay on track.`,
        suggestedTime: ["9:00 AM – 11:00 AM", "11:30 AM – 1:00 PM", "2:00 PM – 4:00 PM"][i],
      })),
      insight: `Your workload shows ${sorted.filter(t => t.priority === "critical").length} critical tasks needing immediate attention. Estimated ${sorted.reduce((s, t) => s + (t.estimatedHours || 2), 0).toFixed(1)}h of focused work today.`,
    };
  },
  async generateDailyPlan(tasks) {
    await new Promise(r => setTimeout(r, 1600));
    const active = tasks.filter(t => t.status !== "completed").sort((a, b) => getTaskUrgency(b) - getTaskUrgency(a));
    const blocks = [
      { label: "Deep Work Block", emoji: "🧠", color: "from-purple-500/20 to-blue-500/20", border: "border-purple-500/30", tip: "Silence notifications. Use 90-min focus sprints." },
      { label: "Collaborative Focus", emoji: "🤝", color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30", tip: "Schedule syncs at block start. Async updates after." },
      { label: "Creative Session", emoji: "✨", color: "from-orange-500/20 to-yellow-500/20", border: "border-orange-500/30", tip: "Start with a 5-min braindump. Don't self-edit early." },
      { label: "Review & Polish", emoji: "🔍", color: "from-green-500/20 to-teal-500/20", border: "border-green-500/30", tip: "Check off subtasks. Document your progress." },
    ];
    let hour = 9;
    const timeBlocks = active.slice(0, 4).map((task, i) => {
      const dur = task.estimatedHours || 2;
      const b = { startTime: `${hour}:00`, endTime: `${Math.floor(hour + dur)}:${(dur % 1 === 0.5) ? "30" : "00"}`, task: task.title, taskId: task.id, ...blocks[i % 4] };
      hour += Math.ceil(dur) + (i === 1 ? 1 : 0);
      return b;
    });
    return {
      timeBlocks,
      totalFocusHours: active.slice(0, 4).reduce((s, t) => s + (t.estimatedHours || 2), 0),
      productivityTips: [
        "🌅 Your peak cognitive hours are 9–11 AM. Front-load your hardest task.",
        "⏰ 2-minute rule: if it takes <2 min, do it now instead of scheduling.",
        "🎯 Limit your MIT (Most Important Tasks) to 3 per day for clarity.",
        "🔋 Schedule a 15-min walk at 3 PM to beat the afternoon energy slump.",
        "📵 Batch Slack/email to 10 AM, 1 PM, 4 PM — protect your focus blocks.",
      ],
    };
  },
  async getSuggestion(title, desc) {
    await new Promise(r => setTimeout(r, 900));
    const text = (title + " " + desc).toLowerCase();
    if (text.includes("finance") || text.includes("budget") || text.includes("report")) return { priority: "critical", estimatedHours: 4, tip: "Gather all data sources first. Block 2-hour uninterrupted windows." };
    if (text.includes("engineer") || text.includes("code") || text.includes("design")) return { priority: "high", estimatedHours: 3, tip: "Break into subtasks. Time-box at 90-minute intervals." };
    if (text.includes("market") || text.includes("content") || text.includes("campaign")) return { priority: "medium", estimatedHours: 2.5, tip: "Batch similar tasks. Review goals before starting." };
    return { priority: "medium", estimatedHours: 2, tip: "Define success criteria before starting. Schedule a checkpoint midway." };
  },
};

// ============================================================
// CUSTOM HOOKS
// ============================================================
function useTasks() {
  const [tasks, setTasks] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : SAMPLE_TASKS; } catch { return SAMPLE_TASKS; }
  });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
    const alerts = tasks.filter(t => {
      if (t.status === "completed") return false;
      const diff = new Date(t.deadline) - new Date();
      return diff < 0 || (diff < 86400000 && t.priority !== "low");
    }).map(t => ({
      id: t.id, type: new Date(t.deadline) < new Date() ? "overdue" : "urgent",
      message: new Date(t.deadline) < new Date() ? `"${t.title}" is overdue!` : `"${t.title}" is due ${formatDeadline(t.deadline)}`,
    }));
    setNotifications(alerts);
  }, [tasks]);

  const addTask = useCallback((task) => setTasks(prev => [{ ...task, id: generateId(), createdAt: new Date().toISOString() }, ...prev]), []);
  const updateTask = useCallback((id, updates) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)), []);
  const deleteTask = useCallback((id) => setTasks(prev => prev.filter(t => t.id !== id)), []);
  const stats = useMemo(() => {
    const total = tasks.length, completed = tasks.filter(t => t.status === "completed").length;
    const pending = tasks.filter(t => t.status === "pending").length, inProgress = tasks.filter(t => t.status === "in-progress").length;
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== "completed").length;
    return { total, completed, pending, inProgress, overdue, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tasks]);

  return { tasks, addTask, updateTask, deleteTask, stats, notifications };
}

// ============================================================
// COMPONENTS
// ============================================================
function Badge({ label, colors }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
      {colors.dot && <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />}
      {label}
    </span>
  );
}

function Spinner({ size = "md" }) {
  const s = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return <div className={`${s} border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin`} />;
}

function ProgressRing({ percent, size = 90 }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#grad)" strokeWidth="7"
        strokeDasharray={`${(percent/100)*circ} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#a855f7"/><stop offset="100%" stopColor="#3b82f6"/></linearGradient></defs>
    </svg>
  );
}

function StatCard({ icon, label, value, sub, accent }) {
  const styles = {
    purple: { grad: "from-purple-900/30 to-slate-900/50", border: "border-purple-800/40", icon: "bg-purple-500/20 text-purple-400" },
    blue: { grad: "from-blue-900/30 to-slate-900/50", border: "border-blue-800/40", icon: "bg-blue-500/20 text-blue-400" },
    green: { grad: "from-green-900/30 to-slate-900/50", border: "border-green-800/40", icon: "bg-green-500/20 text-green-400" },
    red: { grad: "from-red-900/30 to-slate-900/50", border: "border-red-800/40", icon: "bg-red-500/20 text-red-400" },
  };
  const s = styles[accent] || styles.purple;
  return (
    <div className={`bg-gradient-to-br ${s.grad} border ${s.border} rounded-2xl p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl ${s.icon} flex items-center justify-center text-2xl shrink-0`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "completed";
  const effectiveStatus = isOverdue ? "overdue" : task.status;
  return (
    <div className={`group bg-slate-900/80 border rounded-2xl p-4 hover:border-purple-500/50 transition-all duration-200 ${isOverdue ? "border-red-700/50 shadow-red-900/20 shadow-lg" : "border-slate-800/80"}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm ${task.status === "completed" ? "line-through text-slate-500" : "text-white"}`}
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.title}</h3>
          {task.description && <p className="text-xs text-slate-500 mt-1" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.description}</p>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(task)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors text-sm">✏️</button>
          {confirmDelete
            ? <div className="flex gap-1">
                <button onClick={() => onDelete(task.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded-lg">No</button>
              </div>
            : <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm">🗑️</button>
          }
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge label={task.priority} colors={PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium} />
        <Badge label={effectiveStatus.replace("-", " ")} colors={STATUS_COLORS[effectiveStatus] || STATUS_COLORS.pending} />
        {task.category && <span className="text-xs text-slate-600 bg-slate-800/80 px-2 py-0.5 rounded-full">{task.category}</span>}
        <span className={`text-xs ml-auto font-medium ${isOverdue ? "text-red-400" : "text-slate-600"}`}>{formatDeadline(task.deadline)}</span>
      </div>
      {task.status !== "completed" && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex gap-2">
          {task.status === "pending" && <button onClick={() => onStatusChange(task.id, "in-progress")} className="flex-1 text-xs py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors">▶ Start</button>}
          <button onClick={() => onStatusChange(task.id, "completed")} className="flex-1 text-xs py-1.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors">✓ Done</button>
        </div>
      )}
    </div>
  );
}

function TaskModal({ task, onSave, onClose, aiSuggest }) {
  const [form, setForm] = useState(task || { title: "", description: "", deadline: "", priority: "medium", status: "pending", category: "", estimatedHours: 2 });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTip, setAiTip] = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleAI = async () => { if (!form.title) return; setAiLoading(true); try { const s = await aiSuggest(form.title, form.description); setForm(p => ({ ...p, priority: s.priority, estimatedHours: s.estimatedHours })); setAiTip(s.tip); } finally { setAiLoading(false); } };
  const handleSubmit = () => { if (!form.title.trim()) return; onSave(form); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl w-full shadow-2xl" style={{ maxWidth: 520 }}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80">
          <h2 className="text-base font-bold text-white">{task ? "✏️ Edit Task" : "✨ New Task"}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors text-xl">×</button>
        </div>
        <div className="p-5 space-y-4" style={{ maxHeight: "65vh", overflowY: "auto" }}>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="What needs to be done?"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Add context, acceptance criteria..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Deadline</label>
              <input type="datetime-local" value={form.deadline} onChange={e => set("deadline", e.target.value)} className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Est. Hours</label>
              <input type="number" min="0.5" max="24" step="0.5" value={form.estimatedHours} onChange={e => set("estimatedHours", parseFloat(e.target.value))} className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Priority</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors">
                {["critical","high","medium","low"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors">
                {["pending","in-progress","completed"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Category</label>
            <input value={form.category} onChange={e => set("category", e.target.value)} placeholder="Engineering, Marketing, Finance..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors" />
          </div>
          <button onClick={handleAI} disabled={!form.title || aiLoading}
            className="w-full py-2.5 bg-purple-600/10 text-purple-400 border border-purple-500/30 rounded-xl text-sm font-medium hover:bg-purple-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
            {aiLoading ? <><Spinner size="sm" /> Analyzing with AI...</> : "🤖 AI Auto-Suggest Priority & Time Estimate"}
          </button>
          {aiTip && <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-300">💡 {aiTip}</div>}
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-800/80">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-400 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!form.title.trim()} className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40">
            {task ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGES
// ============================================================
function DashboardPage({ tasks, stats, notifications, onAdd }) {
  const top = useMemo(() => [...tasks].filter(t => t.status !== "completed").sort((a, b) => getTaskUrgency(b) - getTaskUrgency(a)).slice(0, 4), [tasks]);
  const cats = useMemo(() => { const m = {}; tasks.forEach(t => t.category && (m[t.category] = (m[t.category]||0)+1)); return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5); }, [tasks]);
  const total = cats.reduce((s,[,v]) => s+v, 0);
  const catColors = ["bg-purple-500","bg-blue-500","bg-cyan-500","bg-green-500","bg-orange-500"];
  return (
    <div className="space-y-6">
      {notifications.slice(0,2).map(n => (
        <div key={n.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${n.type==="overdue" ? "bg-red-900/20 border-red-700/40 text-red-400" : "bg-orange-900/20 border-orange-700/40 text-orange-400"}`}>
          {n.type==="overdue" ? "🔴" : "⚠️"} {n.message}
        </div>
      ))}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📋" label="Total Tasks" value={stats.total} sub="Across all projects" accent="purple" />
        <StatCard icon="✅" label="Completed" value={stats.completed} sub={`${stats.progress}% progress`} accent="green" />
        <StatCard icon="⚡" label="In Progress" value={stats.inProgress} sub="Active right now" accent="blue" />
        <StatCard icon="🔴" label="Overdue" value={stats.overdue} sub="Need attention" accent="red" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-5">Overall Completion</h3>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <ProgressRing percent={stats.progress} size={100} />
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span className="text-xl font-bold text-white">{stats.progress}%</span>
              </div>
            </div>
            <div className="space-y-2.5 flex-1">
              {[["Completed", stats.completed, "bg-green-500"], ["In Progress", stats.inProgress, "bg-blue-500"], ["Pending", stats.pending, "bg-yellow-500"], ["Overdue", stats.overdue, "bg-red-500"]].map(([l,v,c]) => (
                <div key={l} className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${c} shrink-0`} />
                  <span className="text-xs text-slate-500 flex-1">{l}</span>
                  <span className="text-sm font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-5">Category Breakdown</h3>
          {cats.length === 0 ? <p className="text-sm text-slate-600 text-center mt-6">No categories yet — add tasks with categories!</p> :
            <div className="space-y-3">
              {cats.map(([cat, count], i) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{cat}</span><span className="text-slate-600">{count}</span></div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${catColors[i]} rounded-full transition-all duration-700`} style={{ width: `${(count/total)*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300">⚡ Top Priority Tasks</h3>
          <button onClick={onAdd} className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors">+ Add Task</button>
        </div>
        {top.length === 0 ? (
          <div className="text-center py-10"><div className="text-5xl mb-3">🎉</div><p className="text-slate-400 font-medium">All caught up!</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {top.map((task, i) => (
              <div key={task.id} className={`flex items-center gap-3 rounded-xl p-3 border ${i===0?"bg-red-900/10 border-red-800/30":i===1?"bg-orange-900/10 border-orange-800/30":"bg-slate-800/50 border-slate-700/50"}`}>
                <span className={`text-base font-black ${i===0?"text-red-400":i===1?"text-orange-400":"text-yellow-400"}`}>#{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                  <p className="text-xs text-slate-500">{task.category || "No category"} · {formatDeadline(task.deadline)}</p>
                </div>
                <Badge label={task.priority} colors={PRIORITY_COLORS[task.priority]} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TasksPage({ tasks, onAdd, onEdit, onDelete, onStatusChange }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("urgency");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    let t = tasks.filter(task => {
      const s = !search || task.title.toLowerCase().includes(search.toLowerCase()) || (task.description||"").toLowerCase().includes(search.toLowerCase());
      const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "completed";
      const f = filter === "all" || task.status === filter || (filter === "overdue" && isOverdue);
      return s && f;
    });
    if (sort === "urgency") return [...t].sort((a,b) => getTaskUrgency(b)-getTaskUrgency(a));
    if (sort === "deadline") return [...t].sort((a,b) => new Date(a.deadline||"9999")-new Date(b.deadline||"9999"));
    if (sort === "priority") return [...t].sort((a,b) => ({critical:4,high:3,medium:2,low:1}[b.priority]||0)-({critical:4,high:3,medium:2,low:1}[a.priority]||0));
    return t;
  }, [tasks, filter, sort, search]);
  const counts = { all: tasks.length, pending: tasks.filter(t=>t.status==="pending").length, "in-progress": tasks.filter(t=>t.status==="in-progress").length, completed: tasks.filter(t=>t.status==="completed").length };
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search tasks..."
          className="w-full sm:w-72 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors" />
        <div className="flex gap-2 items-center shrink-0">
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-400 focus:outline-none focus:border-purple-500">
            <option value="urgency">Urgency</option><option value="deadline">Deadline</option><option value="priority">Priority</option>
          </select>
          <button onClick={onAdd} className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5">
            + New Task
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all","pending","in-progress","completed"].map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filter===tab?"bg-purple-600 text-white":"bg-slate-800 text-slate-500 hover:text-white border border-slate-700"}`}>
            {tab.charAt(0).toUpperCase()+tab.slice(1).replace("-"," ")} <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter===tab?"bg-purple-500":"bg-slate-700"}`}>{counts[tab]??0}</span>
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <div className="text-center py-20"><div className="text-5xl mb-3">📭</div><p className="text-slate-400 font-medium">No tasks found</p><p className="text-sm text-slate-600 mt-1">Adjust filters or create a new task</p></div>
        : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(task => <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />)}
          </div>
      }
    </div>
  );
}

function AIPage({ tasks }) {
  const [tab, setTab] = useState("priorities");
  const [priorities, setPriorities] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState({});
  const load = async (key, fn, setter) => {
    setLoading(p => ({ ...p, [key]: true }));
    try { setter(await fn(tasks)); } finally { setLoading(p => ({ ...p, [key]: false })); }
  };
  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-700/30 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl shrink-0">🤖</div>
        <div>
          <h2 className="text-base font-bold text-white">AI Productivity Assistant</h2>
          <p className="text-sm text-slate-400 mt-0.5">Intelligent analysis of your {tasks.filter(t=>t.status!=="completed").length} active tasks</p>
          <p className="text-xs text-slate-500 mt-1">Powered by contextual task analysis · Connect your API key in Settings for live AI</p>
        </div>
      </div>
      <div className="flex gap-2">
        {[["priorities","🎯 Priority Analysis"],["planner","📅 Daily Planner"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab===id?"bg-purple-600 text-white":"bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"}`}>{label}</button>
        ))}
      </div>
      {tab === "priorities" && (
        <div className="space-y-4">
          <button onClick={() => load("priorities", AIService.analyzePriorities, setPriorities)} disabled={loading.priorities}
            className="w-full py-3 bg-purple-600/10 text-purple-400 border border-purple-500/30 rounded-xl text-sm font-semibold hover:bg-purple-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading.priorities ? <><Spinner />Analyzing your workload...</> : "🎯 Run Priority Intelligence Analysis"}
          </button>
          {priorities && <>
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 text-sm text-blue-300 flex gap-2"><span>💡</span><span>{priorities.insight}</span></div>
            {priorities.recommendations.map((r,i) => (
              <div key={r.taskId} className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-black shrink-0 ${i===0?"bg-red-500/20 text-red-400":i===1?"bg-orange-500/20 text-orange-400":"bg-yellow-500/20 text-yellow-400"}`}>#{r.rank}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm">{r.taskTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">{r.reason}</p>
                  <span className="inline-block mt-2 text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">⏰ {r.suggestedTime}</span>
                </div>
              </div>
            ))}
          </>}
        </div>
      )}
      {tab === "planner" && (
        <div className="space-y-4">
          <button onClick={() => load("plan", AIService.generateDailyPlan, setPlan)} disabled={loading.plan}
            className="w-full py-3 bg-blue-600/10 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-semibold hover:bg-blue-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading.plan ? <><Spinner />Generating your plan...</> : "📅 Build My Smart Daily Plan"}
          </button>
          {plan && <>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">⏱️</span><p className="text-sm text-slate-300">Focus time planned: <span className="text-white font-bold">{plan.totalFocusHours}h</span></p>
            </div>
            <div className="space-y-3">
              {plan.timeBlocks.map((b, i) => (
                <div key={i} className={`bg-gradient-to-r ${b.color} border ${b.border} rounded-2xl p-4`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-400">{b.startTime} – {b.endTime}</span>
                    <span className="text-xs bg-slate-900/50 px-2 py-0.5 rounded-full text-slate-400">{b.emoji} {b.label}</span>
                  </div>
                  <p className="text-sm font-bold text-white">{b.task}</p>
                  <p className="text-xs text-slate-400 mt-1.5">💡 {b.tip}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-white mb-3">🚀 Your Productivity Playbook</h4>
              <div className="space-y-2.5">{plan.productivityTips.map((tip,i) => <p key={i} className="text-xs text-slate-400 leading-relaxed">{tip}</p>)}</div>
            </div>
          </>}
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  const [cfg, setCfg] = useState(() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY))||{apiKey:"",model:"gpt-4o",backendUrl:"http://localhost:8000"}; } catch { return {apiKey:"",model:"gpt-4o",backendUrl:"http://localhost:8000"}; }});
  const [saved, setSaved] = useState(false);
  const save = () => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg)); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  return (
    <div className="space-y-5 max-w-lg">
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">🔑 AI API Configuration</h3>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">API Key (OpenAI / Gemini)</label>
          <input type="password" value={cfg.apiKey} onChange={e=>setCfg(p=>({...p,apiKey:e.target.value}))} placeholder="sk-... or AIza..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-purple-500 font-mono transition-colors" />
          <p className="text-xs text-slate-600 mt-1">Stored in localStorage only. Never transmitted externally.</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Model</label>
          <select value={cfg.model} onChange={e=>setCfg(p=>({...p,model:e.target.value}))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors">
            {["gpt-4o","gpt-4","gpt-3.5-turbo","gemini-1.5-pro","gemini-pro"].map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">FastAPI Backend URL</label>
          <input value={cfg.backendUrl} onChange={e=>setCfg(p=>({...p,backendUrl:e.target.value}))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-purple-500 font-mono transition-colors" />
        </div>
        <button onClick={save} className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${saved?"bg-green-600 text-white":"bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"}`}>
          {saved ? "✓ Configuration Saved!" : "Save Configuration"}
        </button>
      </div>
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">🚀 FastAPI Backend Setup</h3>
        <div className="space-y-4">
          {[
            { n:"1", title:"Install Python dependencies", cmd:"pip install fastapi uvicorn openai pydantic python-dotenv" },
            { n:"2", title:"Create .env file", cmd:"OPENAI_API_KEY=sk-your-key-here" },
            { n:"3", title:"Start backend server", cmd:"uvicorn main:app --reload --port 8000" },
            { n:"4", title:"Access Swagger docs", cmd:"http://localhost:8000/docs" },
          ].map(s => (
            <div key={s.n} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.n}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-300 mb-1">{s.title}</p>
                <code className="text-xs text-purple-400 font-mono bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 block break-all">{s.cmd}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/30 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-2">📁 Backend API Endpoints</h3>
        <div className="space-y-2">
          {[
            ["GET","    /api/tasks","List all tasks"],
            ["POST","   /api/tasks","Create new task"],
            ["PUT","    /api/tasks/{id}","Update a task"],
            ["DELETE"," /api/tasks/{id}","Delete a task"],
            ["POST","   /api/ai/priorities","AI priority analysis"],
            ["POST","   /api/ai/daily-plan","Generate daily plan"],
            ["POST","   /api/ai/suggest","AI task suggestion"],
          ].map(([method,path,desc]) => (
            <div key={path} className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${method==="GET"?"text-green-400 bg-green-500/10":method==="POST"?"text-blue-400 bg-blue-500/10":method==="PUT"?"text-yellow-400 bg-yellow-500/10":"text-red-400 bg-red-500/10"}`}>{method}</span>
              <span className="text-slate-400">{path}</span>
              <span className="text-slate-600 ml-auto hidden sm:block">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================
export default function App() {
  const { tasks, addTask, updateTask, deleteTask, stats, notifications } = useTasks();
  const [page, setPage] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "tasks", icon: "📋", label: "Tasks" },
    { id: "ai", icon: "🤖", label: "AI Assistant" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const handleSave = (data) => { data.id ? updateTask(data.id, data) : addTask(data); setModal(null); };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white", display: "flex", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.3); }
        .sidebar { transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .page-content { animation: fadeIn 0.2s ease; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {sidebarOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 30 }} onClick={() => setSidebarOpen(false)} className="lg:hidden" />}

      {/* Sidebar */}
      <aside className="sidebar" style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 220, background: "#0f172a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", zIndex: 40, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={{ padding: "1.25rem", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #9333ea, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", boxShadow: "0 4px 15px rgba(147,51,234,0.3)" }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "white" }}>ProductivityAI</div>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Smart Task Manager</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "0.75rem", overflowY: "auto" }}>
          {nav.map(item => (
            <button key={item.id} onClick={() => { setPage(item.id); setSidebarOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", borderRadius: 12, fontSize: "0.8rem", fontWeight: 500, border: "none", cursor: "pointer", marginBottom: 4, transition: "all 0.15s",
                background: page===item.id ? "rgba(147,51,234,0.15)" : "transparent",
                color: page===item.id ? "#c084fc" : "#94a3b8",
                borderWidth: 1, borderStyle: "solid", borderColor: page===item.id ? "rgba(147,51,234,0.3)" : "transparent" }}>
              <span style={{ fontSize: "0.95rem" }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "tasks" && notifications.length > 0 && (
                <span style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: "#ef4444", color: "white", fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{notifications.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: "1rem", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: "0.6rem", color: "#334155", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Quick Stats</div>
          {[["✅","Done",stats.completed],["⚡","Active",stats.inProgress],["🔴","Overdue",stats.overdue]].map(([e,l,v]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><span>{e}</span>{l}</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "white" }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#475569", marginBottom: 6 }}>
              <span>Progress</span><span style={{ color: "white", fontWeight: 700 }}>{stats.progress}%</span>
            </div>
            <div style={{ height: 4, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #9333ea, #3b82f6)", borderRadius: 4, width: `${stats.progress}%`, transition: "width 0.8s ease" }} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", marginLeft: 0, minWidth: 0, overflow: "hidden" }}>
        {/* Header */}
        <header style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1e293b", padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: "0.5rem", background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", borderRadius: 10, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>☰</button>
            <div>
              <h1 style={{ fontSize: "0.9rem", fontWeight: 700, color: "white" }}>{{ dashboard: "📊 Dashboard", tasks: "📋 Task Manager", ai: "🤖 AI Assistant", settings: "⚙️ Settings" }[page]}</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {notifications.length > 0 && (
              <div style={{ position: "relative" }}>
                <button style={{ padding: "0.5rem", background: "#1e293b", border: "none", borderRadius: 10, cursor: "pointer", fontSize: "0.9rem" }}>🔔</button>
                <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "white", fontSize: "0.55rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{notifications.length}</span>
              </div>
            )}
            <button onClick={() => setModal("new")} style={{ padding: "0.5rem 1rem", background: "linear-gradient(135deg, #9333ea, #3b82f6)", border: "none", borderRadius: 12, color: "white", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <span>+</span> New Task
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="page-content" style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {page === "dashboard" && <DashboardPage tasks={tasks} stats={stats} notifications={notifications} onAdd={() => setModal("new")} />}
          {page === "tasks" && <TasksPage tasks={tasks} onAdd={() => setModal("new")} onEdit={setModal} onDelete={deleteTask} onStatusChange={(id,s) => updateTask(id,{status:s})} />}
          {page === "ai" && <AIPage tasks={tasks} />}
          {page === "settings" && <SettingsPage />}
        </main>
      </div>

      {modal && <TaskModal task={typeof modal === "object" ? modal : null} onSave={handleSave} onClose={() => setModal(null)} aiSuggest={AIService.getSuggestion} />}
    </div>
  );
}
