import { Link } from 'react-router-dom';
import { can, type Employee, type Row } from '@dealerflow/contracts';
import { str } from '../lib/api';
import { Button } from '../components/ui';

export function RecordActions({
  resource,
  data,
  employee,
  onConvert,
  onCancel,
  search = '',
}: {
  resource: string;
  data: Row;
  employee: Employee;
  onConvert: () => void;
  onCancel: () => void;
  search?: string;
}) {
  let label = '';
  let route = '';
  if (resource === 'models' && can(employee.role, 'catalog')) {
    label = 'Add vehicle for this model';
    route = `/inventory/new?model_id=${str(data.id)}`;
  } else if (resource === 'customers' && can(employee.role, 'sales')) {
    label = 'Create booking for this customer';
    route = `/bookings/new?customer_id=${str(data.id)}`;
  } else if (
    resource === 'inventory' &&
    data.status === 'available' &&
    can(employee.role, 'sales')
  ) {
    label = 'Create booking for this VIN';
    route = `/bookings/new?vehicle_id=${str(data.id)}`;
  } else if (
    resource === 'bookings' &&
    data.status === 'confirmed' &&
    can(employee.role, 'sales')
  ) {
    return (
      <>
        <Button onClick={onConvert}>Convert to sales order</Button>
        <Button secondary onClick={onCancel}>
          Cancel booking
        </Button>
      </>
    );
  } else if (resource === 'bookings' && data.order_id) {
    label = 'Open sales order';
    route = `/orders/${str(data.order_id)}${search ? `?${search}` : ''}`;
  }
  if (route)
    return (
      <Link
        to={route}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary"
      >
        {label} →
      </Link>
    );
  return (
    <p className="text-sm text-muted-foreground">
      {resource === 'models'
        ? 'Inventory or Admin can add a vehicle for this model.'
        : resource === 'customers'
          ? 'Sales or Admin can create a booking for this customer.'
          : 'This record has no pending action for your role.'}
    </p>
  );
}
