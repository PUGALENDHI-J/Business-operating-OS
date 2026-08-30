import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  label: string;
  primary: number;
  secondary?: number;
}

interface TrendChartProps {
  data: TrendPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  valueFormatter?: (v: number) => string;
  height?: number;
}

export function TrendChart({ data, primaryLabel, secondaryLabel, valueFormatter, height = 260 }: TrendChartProps) {
  const fmt = valueFormatter ?? ((v: number) => `${v}`);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="secondaryFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6A2B" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#FF6A2B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#45464D" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#45464D" }} axisLine={false} tickLine={false} tickFormatter={fmt} width={56} />
        <Tooltip
          formatter={((value: unknown, key: unknown) => [fmt(Number(value)), key === "primary" ? primaryLabel : secondaryLabel]) as never}
          contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "Manrope" }}
        />
        {secondaryLabel && (
          <Area type="monotone" dataKey="secondary" stroke="#FF6A2B" strokeWidth={2} strokeDasharray="5 4" fill="url(#secondaryFill)" name={secondaryLabel} />
        )}
        <Line type="monotone" dataKey="primary" stroke="#0F172A" strokeWidth={2.5} dot={false} name={primaryLabel} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
