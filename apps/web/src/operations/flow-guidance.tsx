import { Link } from 'react-router-dom';
import { can, type Employee } from '@dealerflow/contracts';
import { useApi, type List } from '../lib/api';
import { Info, ArrowUpRight } from 'lucide-react';

const actionClass =
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring sm:min-h-8';

type Prerequisite = {
  endpoint: string;
  label: string;
  route: string;
  privilege: 'catalog' | 'sales';
  explanation: string;
};
const model: Prerequisite = {
  endpoint: '/models?limit=1',
  label: 'Add a model first',
  route: '/models/new',
  privilege: 'catalog',
  explanation: 'Inventory needs a model from the catalog before a VIN can be added.',
};
const customer: Prerequisite = {
  endpoint: '/customers?limit=1',
  label: 'Add a customer first',
  route: '/customers/new',
  privilege: 'sales',
  explanation: 'A booking must be linked to a saved customer.',
};
const vehicle: Prerequisite = {
  endpoint: '/vehicles?limit=1&status=available',
  label: 'Add available inventory first',
  route: '/inventory/new',
  privilege: 'catalog',
  explanation:
    'A booking needs an available VIN. In-transit, reserved and sold VINs cannot be booked.',
};
function PrerequisiteNotice({ item, employee }: { item: Prerequisite; employee: Employee }) {
  const result = useApi<List>(item.endpoint);
  if (result.isPending)
    return (
      <p role="status" className="text-xs text-muted-foreground">
        Checking {item.label.toLowerCase()}…
      </p>
    );
  if (result.isError)
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-destructive"
      >
        Prerequisites could not be checked.
        <button type="button" className={actionClass} onClick={() => void result.refetch()}>
          Retry prerequisites
        </button>
      </div>
    );
  if (result.data.total > 0) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-border/70 pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 leading-relaxed text-muted-foreground">{item.explanation}</p>
      {can(employee.role, item.privilege) ? (
        <Link to={item.route} className={actionClass}>
          {item.label}
          <ArrowUpRight size={14} aria-hidden />
        </Link>
      ) : (
        <p className="text-muted-foreground">
          Ask {item.privilege === 'catalog' ? 'Inventory or Admin' : 'Sales or Admin'} to complete
          this step.
        </p>
      )}
    </div>
  );
}
export function FlowGuidance({ resource, employee }: { resource: string; employee: Employee }) {
  if (!['inventory', 'bookings'].includes(resource)) return null;
  const inventory = resource === 'inventory';
  return (
    <section
      aria-label="Setup guidance"
      className="space-y-3 rounded-container border border-border/70 bg-muted/30 px-4 py-3"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
            <Info size={16} aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className="text-sm font-medium text-foreground">
              {inventory ? 'Inventory essentials' : 'Booking essentials'}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {inventory
                ? 'Start with a catalog model, then add a VIN and branch.'
                : 'Choose a saved customer and an available VIN to reserve.'}
            </p>
          </div>
        </div>
        <nav aria-label="Related setup steps" className="flex shrink-0 flex-wrap gap-2">
          <Link className={actionClass} to={inventory ? '/models' : '/customers'}>
            {inventory ? 'Open model catalog' : 'Open customers'}
            <ArrowUpRight size={14} aria-hidden />
          </Link>
          {!inventory && (
            <Link className={actionClass} to="/inventory">
              Open inventory
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          )}
        </nav>
      </div>
      {(inventory ? [model] : [customer, vehicle]).map((item) => (
        <PrerequisiteNotice key={item.endpoint} item={item} employee={employee} />
      ))}
    </section>
  );
}
