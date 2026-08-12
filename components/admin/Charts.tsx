'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingUp, PieChart as PieIcon } from 'lucide-react';
import type { ChartData, StatusComposition } from '@/types';

interface ChartsProps {
  monthlyData: ChartData[];
  statusData: StatusComposition[];
}

export function Charts({ monthlyData, statusData }: ChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="glass rounded-2xl border border-border/50 p-5 soft-shadow lg:col-span-3 h-[320px] flex items-center justify-center">
          <span className="text-xs text-slate-400">Memuat grafik...</span>
        </Card>
        <Card className="glass rounded-2xl border border-border/50 p-5 soft-shadow lg:col-span-2 h-[320px] flex items-center justify-center">
          <span className="text-xs text-slate-400">Memuat grafik...</span>
        </Card>
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Line Chart */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 soft-shadow lg:col-span-3">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-full bg-blue-100 dark:bg-blue-950 p-2">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Tren Pengajuan Bulanan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">6 bulan terakhir</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              }}
            />
            <Line type="monotone" dataKey="pengajuan" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} name="Pengajuan" />
            <Line type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} name="Approved" />
            <Line type="monotone" dataKey="rejected" stroke="#E11D48" strokeWidth={2.5} dot={{ r: 4 }} name="Rejected" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Donut Chart */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 soft-shadow lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-full bg-amber-100 dark:bg-amber-950 p-2">
            <PieIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Komposisi Status</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Distribusi pengajuan</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
