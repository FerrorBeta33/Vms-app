import { Link, useParams, useSearchParams } from 'react-router-dom';
import { can, id as identifier, type Employee, type Row } from '@dealerflow/contracts';
import { useApi } from '../lib/api';
import { State } from '../components/ui';
import { RecordForm } from './record-form';
import { FlowGuidance } from './flow-guidance';
export function ResourceForm({ resource, employee }: { resource: string; employee: Employee }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const selected: Row = {};
  const selectionKeys =
    resource === 'inventory'
      ? ['model_id', 'branch_id']
      : resource === 'bookings'
        ? ['customer_id', 'vehicle_id']
        : [];
  for (const key of selectionKeys) {
    const parsed = identifier.safeParse(params.get(key));
    if (parsed.success) selected[key] = parsed.data;
  }
  const endpoint = resource === 'inventory' ? 'vehicles' : resource;
  const result = useApi(`/${endpoint}/${id}`, !!id);
  if (!can(employee.role, ['models', 'inventory'].includes(resource) ? 'catalog' : 'sales'))
    return <p role="alert">Your role cannot change these records.</p>;
  return (
    <>
      <Link to={`/${resource}`} className="text-sm text-primary">
        ← Back to {resource}
      </Link>
      <h1 className="text-2xl font-semibold">
        {id ? 'Edit' : 'Add'}{' '}
        {resource === 'inventory'
          ? 'vehicle'
          : resource === 'models'
            ? 'model'
            : resource === 'customers'
              ? 'customer'
              : 'booking'}
      </h1>
      {!id && <FlowGuidance resource={resource} employee={employee} />}
      {id ? (
        <State query={result}>
          {(data) => <RecordForm key={id} resource={resource} initial={data} employee={employee} />}
        </State>
      ) : (
        <RecordForm
          key={`${resource}-${params}`}
          resource={resource}
          initial={selected}
          employee={employee}
        />
      )}
    </>
  );
}
