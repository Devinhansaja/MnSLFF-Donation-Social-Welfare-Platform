"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const PALETTE = ["#185C44", "#E8B65A", "#172C3B", "#22A06B", "#5B8BA8", "#C47A4A", "#8E6BB0", "#64748B", "#A3B18A", "#DC3545"];

type Cur = { cur: "USD" | "LKR"; rate: number };

function fmt(cents: number, { cur, rate }: Cur, compact = false) {
  const v = cur === "LKR" ? cents / 100 / rate : cents / 100;
  return new Intl.NumberFormat(cur === "LKR" ? "en-LK" : "en-US", {
    style: "currency", currency: cur, maximumFractionDigits: 0, notation: compact ? "compact" : "standard",
  }).format(v);
}

const axis = { fontSize: 11, fill: "#64748B" };
const grid = <CartesianGrid strokeDasharray="3 3" stroke="#e6e2d6" vertical={false} />;

function Box({ children, h = 260 }: { children: React.ReactElement; h?: number }) {
  return (
    <div style={{ width: "100%", height: h }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

export function MoneyArea({ data, keys, money }: { data: Record<string, unknown>[]; keys: { key: string; label: string }[]; money: Cur }) {
  return (
    <Box>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        {grid}
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v), money, true)} width={64} />
        <Tooltip formatter={(v) => fmt(Number(v), money)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k, i) => (
          <Area key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.15} strokeWidth={2} />
        ))}
      </AreaChart>
    </Box>
  );
}

export function MoneyBars({ data, keys, money, horizontal }: { data: Record<string, unknown>[]; keys: { key: string; label: string }[]; money: Cur; horizontal?: boolean }) {
  return (
    <Box h={horizontal ? Math.max(220, data.length * 34) : 260}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: 4, right: 8, top: 8 }}>
        {grid}
        {horizontal ? (
          <>
            <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v), money, true)} />
            <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={120} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
            <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v), money, true)} width={64} />
          </>
        )}
        <Tooltip formatter={(v) => fmt(Number(v), money)} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k, i) => (
          <Bar key={k.key} dataKey={k.key} name={k.label} fill={PALETTE[i]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
        ))}
      </BarChart>
    </Box>
  );
}

export function MoneyPie({ data, money }: { data: { name: string; value: number }[]; money: Cur }) {
  if (!data.length) return <p className="py-16 text-center text-sm text-muted">No data for this period.</p>;
  return (
    <Box>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => fmt(Number(v), money)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </Box>
  );
}

export function CountLine({ data, keys }: { data: Record<string, unknown>[]; keys: { key: string; label: string }[] }) {
  return (
    <Box>
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        {grid}
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k, i) => (
          <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={PALETTE[i]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </Box>
  );
}

export function CountBars({ data, k, label }: { data: Record<string, unknown>[]; k: string; label: string }) {
  return (
    <Box>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        {grid}
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
        <Tooltip />
        <Bar dataKey={k} name={label} fill={PALETTE[0]} radius={[3, 3, 0, 0]} />
      </BarChart>
    </Box>
  );
}
