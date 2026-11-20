import { rupeesToPaise, type Row } from '@dealerflow/contracts';

export function sampleDetails(resource: string): Record<string, string> {
  if (resource === 'models')
    return {
      brand: 'Demo Motors',
      name: 'Urban',
      variant: 'Touring',
      fuel: 'Petrol',
      transmission: 'Automatic',
      base_price: '1299000.00',
      image_key: 'suv',
    };
  if (resource === 'inventory')
    return {
      vin: `DEMO-${crypto.randomUUID().replaceAll('-', '').slice(0, 17).toUpperCase()}`,
      color: 'Pearl White',
      status: 'available',
    };
  if (resource === 'customers')
    return {
      name: 'Demo Buyer',
      phone: '9000000001',
      email: 'demo.buyer@example.test',
      address: '12 Fictional Avenue, Demo City',
    };
  return {};
}

export function recordPayload(resource: string, values: Record<string, string>, initial: Row) {
  const body: Record<string, unknown> = { ...values };
  if (resource === 'models') {
    body.base_price_paise = rupeesToPaise(values.base_price);
    delete body.base_price;
    body.active = initial.active ?? true;
  }
  if (resource === 'bookings') {
    if (values.booked_at)
      body.booked_at = new Date(`${values.booked_at}T12:00:00+05:30`).toISOString();
    else delete body.booked_at;
  }
  return body;
}

export const displayField = (key: string, value: unknown) =>
  value !== null &&
  !['id', 'image_key', 'active'].includes(key) &&
  !key.endsWith('_id') &&
  typeof value !== 'object';
