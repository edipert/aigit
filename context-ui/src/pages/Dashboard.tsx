import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Activity, Brain, Database, CheckCircle2 } from 'lucide-react';

interface StatsData {
  totalMemories: number;
  totalDecisions: number;
  totalTasks: number;
  memoryAgents: { agentName: string; _count: { agentName: number } }[];
  decisionAgents: { agentName: string; _count: { agentName: number } }[];
  currentBranch: string;
}

const COLORS = ['var(--brand-primary)', 'var(--brand-secondary)', 'var(--success)', 'var(--warning)'];

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-muted">Loading pulse...</div>;
  }

  if (!stats) return <div className="text-danger">Failed to load platform stats.</div>;

  const memChartData = stats.memoryAgents.filter(a => a.agentName).map(a => ({
    name: a.agentName,
    count: a._count.agentName
  }));

  const decChartData = stats.decisionAgents.filter(a => a.agentName).map(a => ({
    name: a.agentName,
    count: a._count.agentName
  }));

  return (
    <div className="animate-fade-in">
      <header className="glass-header">
        <div>
          <h2>Platform Knowledge</h2>
          <p className="text-muted">Currently active on branch <code className="text-gradient font-bold">{stats.currentBranch}</code></p>
        </div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <Activity size={16} /> Refresh Telemetry
        </button>
      </header>

      <div className="stats-grid stagger-1">
        <motion.div className="glass-card" whileHover={{ y: -4 }}>
          <div className="flex gap-4 items-center mb-4">
            <div className="p-3 rounded-full" style={{ background: 'var(--brand-primary-glow)' }}>
              <Database size={24} color="var(--brand-primary)" />
            </div>
            <h3 className="text-muted">Total Memories</h3>
          </div>
          <div className="metric-value">{stats.totalMemories}</div>
        </motion.div>

        <motion.div className="glass-card stagger-2" whileHover={{ y: -4 }}>
          <div className="flex gap-4 items-center mb-4">
            <div className="p-3 rounded-full" style={{ background: 'hsla(190, 85%, 55%, 0.2)' }}>
              <Brain size={24} color="var(--brand-secondary)" />
            </div>
            <h3 className="text-muted">Architectural Decisions</h3>
          </div>
          <div className="metric-value">{stats.totalDecisions}</div>
        </motion.div>

        <motion.div className="glass-card stagger-3" whileHover={{ y: -4 }}>
          <div className="flex gap-4 items-center mb-4">
            <div className="p-3 rounded-full" style={{ background: 'hsla(150, 70%, 45%, 0.2)' }}>
              <CheckCircle2 size={24} color="var(--success)" />
            </div>
            <h3 className="text-muted">Tasks Orchestrated</h3>
          </div>
          <div className="metric-value">{stats.totalTasks}</div>
        </motion.div>
      </div>

      <div className="chart-grid stagger-3">
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Agent Memory Contributions</h3>
          <div style={{ height: 300 }}>
            {memChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-surface-elevated)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-dim)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {memChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
                <div className="text-muted" style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    No agent memories tracked yet.
                </div>
            )}
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Agent Decision Contributions</h3>
          <div style={{ height: 300 }}>
             {decChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-surface-elevated)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-dim)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {decChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
             ) : (
              <div className="text-muted" style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                   No agent decisions tracked yet.
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
