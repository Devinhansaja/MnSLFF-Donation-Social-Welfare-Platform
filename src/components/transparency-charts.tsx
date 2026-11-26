"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(c / 100);

const PALETTE = ["#185C44", "#E8B65A", "#172C3B", "#22A06B", "#64748B", "#9CC3B0"];

export function AllocationDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid items-center gap-6 sm:grid-cols-2">
      <div className="relative h-60">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #e6e2d6" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted">Net received</span>
          <span className="font-num text-xl font-bold text-navy">{fmt(total)}</span>
        </div>
      </div>
      <ul className="space-y-3">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              {d.name}
            </span>
            <span className="font-num font-semibold">{fmt(d.value)} <span className="font-normal text-muted">({total ? ((d.value / total) * 100).toFixed(0) : 0}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RequiredVsCollected({ data }: { data: { name: string; required: number; collected: number }[] }) {
  return (
    <div className="h-80">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#e6e2d6" />
          <XAxis type="number" tickFormatter={(v) => fmt(v)} fontSize={11} stroke="#64748B" />
          <YAxis type="category" dataKey="name" width={130} fontSize={11} stroke="#64748B" />
          <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #e6e2d6" }} />
          <Bar dataKey="required" name="Required" fill="#d6e8de" radius={[0, 6, 6, 0]} />
          <Bar dataKey="collected" name="Collected" fill="#185C44" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
