import { Link } from 'react-router-dom';
import {
  CarFront,
  CalendarCheck,
  ClipboardList,
  IndianRupee,
  Wallet,
  KeyRound,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { formatMoney } from '@dealerflow/contracts';
import { State } from '../components/ui';
import { useApi } from '../lib/api';
import { metrics, scopedLink, type Summary } from './types';
const icons = [CarFront, CalendarCheck, ClipboardList, IndianRupee, Wallet, KeyRound];
export function Kpis({ scope }: { scope: string }) {
  const result = useApi<Summary>(`/analytics/summary?${scope}`);
  return (
    <State query={result}>
      {(summary) => (
        <section
          aria-label="Executive metrics"
          className="grid min-w-0 grid-cols-2 gap-4 xl:grid-cols-6"
        >
          {metrics.map((metric, index) => {
            const Icon = icons[index];
            const value = summary[metric.key];
            const formattedValue =
              typeof value === 'string' ? formatMoney(value) : value.toLocaleString('en-IN');
            const numberSize =
              typeof value === 'string'
                ? formattedValue.length > 16
                  ? 'text-xs @xs:text-sm'
                  : 'text-sm @xs:text-base'
                : formattedValue.length > 8
                  ? 'text-base @xs:text-lg'
                  : 'text-lg @xs:text-xl';
            return (
              <article
                key={metric.key}
                className="@container relative min-w-0 rounded-container border border-border bg-card p-4 shadow-card"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`rounded-control p-2 ${metric.key === 'ready' ? 'bg-success-soft text-success' : 'bg-secondary text-primary'}`}
                  >
                    <Icon size={18} />
                  </span>
                  <ArrowUpRight className="text-muted-foreground" size={14} />
                </div>
                <Link className="block" to={scopedLink(metric.route, scope)}>
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <p
                    className={`mt-2 break-words font-semibold leading-snug tracking-tight tabular-nums ${numberSize} ${metric.key === 'ready' ? 'text-success' : ''}`}
                  >
                    {formattedValue}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{metric.unit}</p>
                </Link>
                <details className="mt-3 text-xs text-muted-foreground">
                  <summary className="inline-flex min-h-6 cursor-pointer items-center gap-1">
                    <Info size={12} />
                    Definition & scope
                  </summary>
                  <p className="mt-2 leading-relaxed">
                    {summary.definitions[metric.key]} As of{' '}
                    {new Date(summary.asOf).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}{' '}
                    IST. Effective branch/model filters apply.
                  </p>
                </details>
              </article>
            );
          })}
        </section>
      )}
    </State>
  );
}
