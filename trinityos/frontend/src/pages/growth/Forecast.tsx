import { useMemo, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { calculateRevenue } from "../../lib/calculations";
import { formatCurrency } from "../../lib/format";

export default function Forecast() {
  const { revenue, company } = useStore();
  const [growthAssumption, setGrowthAssumption] = useState(8); // % monthly growth, expected case

  const currentMonthly = calculateRevenue(revenue);
  const hasData = revenue.length > 0;

  const scenarios = useMemo(() => {
    const rates = {
      Conservative: Math.max(0, growthAssumption - 5) / 100,
      Expected: growthAssumption / 100,
      Aggressive: (growthAssumption + 7) / 100,
    };
    return (Object.keys(rates) as (keyof typeof rates)[]).map((label) => {
      const rate = rates[label];
      let value = currentMonthly || 50000; // neutral seed if no revenue yet, clearly labeled as an estimate below
      const months = [];
      for (let i = 0; i < 6; i++) {
        value = i === 0 ? value : value * (1 + rate);
        months.push(Math.round(value));
      }
      return { label, rate, months, total: months.reduce((a, b) => a + b, 0) };
    });
  }, [currentMonthly, growthAssumption]);

  return (
    <AppShell>
      <PageHeader title="Forecast" subtitle="Conservative / Expected / Aggressive projections — always shown with their assumptions." />

      {!hasData ? (
        <Card>
          <EmptyState icon="insights" title="Not enough revenue history yet" description="Record at least one month of revenue on the Finance page to generate a grounded forecast." />
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-4">
            <Icon name="tune" className="text-on-surface-variant" />
            <Field label="Assumed monthly growth rate (Expected case)">
              <TextInput type="number" value={growthAssumption} onChange={(e) => setGrowthAssumption(Number(e.target.value))} className="w-32" />
            </Field>
            <p className="text-xs text-on-surface-variant max-w-sm">
              Conservative = {Math.max(0, growthAssumption - 5)}%/mo, Aggressive = {growthAssumption + 7}%/mo. These are explicit assumptions you control, not a guarantee.
            </p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {scenarios.map((s) => (
              <Card key={s.label}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-headline-md text-headline-md">{s.label}</h3>
                  <span className="text-xs font-bold text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-full">{(s.rate * 100).toFixed(0)}%/mo</span>
                </div>
                <p className="font-metric-md text-metric-md text-on-surface mb-1">{formatCurrency(s.total, company.currency)}</p>
                <p className="text-xs text-on-surface-variant mb-4">Projected revenue, next 6 months</p>
                <div className="flex items-end gap-1 h-16">
                  {s.months.map((m, i) => (
                    <div key={i} className="flex-1 bg-primary/80 rounded-t" style={{ height: `${Math.max(6, (m / Math.max(...s.months)) * 100)}%` }} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
