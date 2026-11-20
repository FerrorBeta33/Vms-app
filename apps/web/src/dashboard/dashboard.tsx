import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Employee } from '@dealerflow/contracts';
import { useApi } from '../lib/api';
import { Card } from '../components/ui';
import { ContextBar } from './context-bar';
import { Kpis } from './kpis';
import { Journey } from './journey';
import { ActionCenter } from './action-center';
import { StockWidget } from './stock-widget';
import { TrendWidget } from './trend-widget';
import { ModelWidget } from './model-widget';
import { BranchWidget } from './branch-widget';
import { ActivityWidget } from './activity-widget';
import { useLayout, widgetNames } from './layout';
import { CustomizeBar } from './customize';
import type { Summary } from './types';
export function Dashboard({ employee }: { employee: Employee }) {
  const [preset, setPreset] = useState(
    ['admin', 'manager'].includes(employee.role) ? 'executive' : 'operations',
  );
  return (
    <Workspace
      key={`${employee.id}-${preset}`}
      employee={employee}
      preset={preset}
      setPreset={setPreset}
    />
  );
}
function Workspace({
  employee,
  preset,
  setPreset,
}: {
  employee: Employee;
  preset: string;
  setPreset: (preset: string) => void;
}) {
  const [params] = useSearchParams();
  const scope = params.toString();
  const summary = useApi<Summary>(`/analytics/summary?${scope}`);
  const layout = useLayout(employee.id, employee.role, preset);
  return (
    <>
      <ContextBar
        employee={employee}
        preset={preset}
        setPreset={setPreset}
        customize={layout.begin}
        customizing={layout.customizing}
        asOf={summary.data?.asOf}
      />
      {layout.customizing && <CustomizeBar layout={layout} />}
      <Kpis scope={scope} />
      <Journey scope={scope} />
      <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2">
          <ActionCenter scope={scope} employee={employee} />
        </div>
        {layout.widgets
          .filter((widget) => layout.customizing || widget.visible)
          .map((widget) => (
            <section
              key={widget.key}
              aria-label={widgetNames[widget.key]}
              className={`@container min-w-0 ${widget.size === 'large' ? 'md:col-span-2 xl:col-span-3' : widget.size === 'medium' ? 'md:col-span-1 xl:col-span-2' : 'col-span-1'}`}
            >
              <Card
                title={widgetNames[widget.key]}
                aside={
                  <span className="text-xs text-muted-foreground">
                    {widget.key === 'trends' ? 'Selected event period' : 'Current scope'}
                  </span>
                }
              >
                <div className={widget.visible ? '' : 'opacity-40'}>
                  {widget.key === 'stock' ? (
                    <StockWidget scope={scope} />
                  ) : widget.key === 'trends' ? (
                    <TrendWidget scope={scope} />
                  ) : widget.key === 'models' ? (
                    <ModelWidget scope={scope} />
                  ) : widget.key === 'branches' ? (
                    <BranchWidget scope={scope} />
                  ) : (
                    <ActivityWidget scope={scope} />
                  )}
                </div>
              </Card>
            </section>
          ))}
      </div>
      <footer className="flex flex-wrap justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
        <span>DealerFlow · Fictional multi-branch dealership demonstration</span>
        <span>PostgreSQL-backed · INR · Asia/Kolkata</span>
      </footer>
    </>
  );
}
