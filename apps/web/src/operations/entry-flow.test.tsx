// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  modelSchema,
  customerSchema,
  vehicleSchema,
  bookingSchema,
  type Employee,
  type Row,
} from '@dealerflow/contracts';
import { queryClient } from '../lib/api';
import { ResourceForm } from './resource-form';
import { ResourceDetail } from './resource-detail';
import { FlowGuidance } from './flow-guidance';
import { RecordActions } from './record-actions';
import { sampleDetails, recordPayload } from '../lib/record';

const modelId = '11111111-1111-4111-8111-111111111111';
const vehicleId = '22222222-2222-4222-8222-222222222222';
const customerId = '33333333-3333-4333-8333-333333333333';
const branchId = '44444444-4444-4444-8444-444444444444';
const bookingId = '55555555-5555-4555-8555-555555555555';
const employee: Employee = {
  id: customerId,
  name: 'Demo Admin',
  email: 'admin@example.test',
  role: 'admin',
};
let model: Row;
let vehicle: Row;
let customer: Row;
let booking: Row;
let missing = false;
let failed = false;
const saved: { resource: string; body: Row }[] = [];
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 30000 } });
  missing = false;
  failed = false;
  saved.length = 0;
  model = {
    ...modelSchema.parse(recordPayload('models', sampleDetails('models'), {})),
    id: modelId,
  };
  vehicle = {
    id: vehicleId,
    vin: 'DEMO-AVAILABLE-VIN',
    model_id: modelId,
    branch_id: branchId,
    color: 'White',
    status: 'available',
    model_name: 'Urban',
    branch_name: 'Demo branch',
  };
  customer = { id: customerId, name: 'Demo Buyer', phone: '9000000001' };
  booking = {
    id: bookingId,
    customer_id: customerId,
    vehicle_id: vehicleId,
    customer_name: 'Demo Buyer',
    vin: vehicle.vin,
    status: 'confirmed',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = new URL(String(input), 'http://test');
      const path = url.pathname.replace('/api', '');
      if (options?.method === 'POST') {
        const body = JSON.parse(String(options.body));
        saved.push({ resource: path, body });
        if (path === '/models') {
          model = { ...modelSchema.parse(body), id: modelId };
          return json(model, 201);
        }
        if (path === '/vehicles') {
          vehicle = { ...vehicle, ...vehicleSchema.parse(body) };
          return json(vehicle, 201);
        }
        if (path === '/customers') {
          customer = { ...customerSchema.parse(body), id: customerId };
          return json(customer, 201);
        }
        if (path === '/bookings') {
          booking = { ...booking, ...bookingSchema.parse(body) };
          return json(booking, 201);
        }
      }
      if (failed && path === '/models')
        return json({ error: { message: 'Catalog unavailable' } }, 503);
      const details: Record<string, Row> = {
        [`/models/${modelId}`]: model,
        [`/vehicles/${vehicleId}`]: vehicle,
        [`/customers/${customerId}`]: customer,
        [`/bookings/${bookingId}`]: booking,
      };
      if (details[path]) return json(details[path]);
      if (path === '/branches') return json({ items: [{ id: branchId, name: 'Demo branch' }] });
      const lists: Record<string, Row[]> = {
        '/models': [model],
        '/vehicles': [vehicle],
        '/customers': [customer],
      };
      if (lists[path]) {
        const items = missing ? [] : lists[path];
        return json({ items, total: items.length, page: 1, limit: 20 });
      }
      return json({ error: { message: 'Unexpected test endpoint' } }, 404);
    }),
  );
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  vi.unstubAllGlobals();
});
function workspace(path: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {['models', 'inventory', 'customers', 'bookings'].map((resource) => (
            <React.Fragment key={resource}>
              <Route
                path={`/${resource}/new`}
                element={<ResourceForm resource={resource} employee={employee} />}
              />
              <Route
                path={`/${resource}/:id`}
                element={<ResourceDetail resource={resource} employee={employee} />}
              />
            </React.Fragment>
          ))}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('connected operational entry', () => {
  it('creates a sample model and carries its identity into a new VIN', async () => {
    workspace('/models/new');
    fireEvent.click(screen.getByRole('button', { name: 'Fill sample details' }));
    expect(saved).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Create record' }));
    fireEvent.click(await screen.findByRole('link', { name: /Add vehicle for this model/ }));
    const modelSelect = await screen.findByRole('combobox', { name: 'Select Model' });
    expect((modelSelect as HTMLSelectElement).value).toBe(modelId);
    expect(screen.getByRole('option', { name: 'Demo Motors Urban · Touring' })).toBeTruthy();
    fireEvent.change(await screen.findByRole('combobox', { name: 'Select Branch' }), {
      target: { value: branchId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fill sample details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create record' }));
    const next = await screen.findByRole('link', { name: /Create booking for this VIN/ });
    expect(next.getAttribute('href')).toBe(`/bookings/new?vehicle_id=${vehicleId}`);
    expect(saved.map((item) => item.resource)).toEqual(['/models', '/vehicles']);
    expect(saved[0].body.base_price_paise).toBe('129900000');
    expect(saved[1].body.model_id).toBe(modelId);
    expect(saved[1].body.branch_id).toBe(branchId);
  });
  it('creates a customer, prefills the booking and reserves a selected available VIN', async () => {
    workspace('/customers/new');
    fireEvent.click(screen.getByRole('button', { name: 'Fill sample details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create record' }));
    fireEvent.click(await screen.findByRole('link', { name: /Create booking for this customer/ }));
    const customerSelect = await screen.findByRole('combobox', { name: 'Select Customer' });
    expect((customerSelect as HTMLSelectElement).value).toBe(customerId);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Select Available VIN' }), {
      target: { value: vehicleId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reserve VIN' }));
    expect(await screen.findByRole('button', { name: 'Convert to sales order' })).toBeTruthy();
    expect(saved.map((item) => item.resource)).toEqual(['/customers', '/bookings']);
    expect(saved[1].body).toMatchObject({ customer_id: customerId, vehicle_id: vehicleId });
  });
  it('prefills the selected VIN when arriving directly from inventory', async () => {
    workspace(`/bookings/new?vehicle_id=${vehicleId}`);
    const picker = await screen.findByRole('combobox', { name: 'Select Available VIN' });
    expect((picker as HTMLSelectElement).value).toBe(vehicleId);
    expect((picker as HTMLSelectElement).required).toBe(true);
    expect(screen.getByRole('option', { name: /DEMO-AVAILABLE-VIN/ })).toBeTruthy();
    expect(saved).toHaveLength(0);
  });
  it('guides empty inventory to model creation and keeps selections required', async () => {
    missing = true;
    workspace('/inventory/new');
    expect(
      (await screen.findByRole('link', { name: /Add a model first/ })).getAttribute('href'),
    ).toBe('/models/new');
    const picker = await screen.findByRole('combobox', { name: 'Select Model' });
    expect((picker as HTMLSelectElement).required).toBe(true);
    expect((picker as HTMLSelectElement).value).toBe('');
    expect(saved).toHaveLength(0);
  });
  it('does not broaden Sales privileges when booking prerequisites are missing', async () => {
    missing = true;
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FlowGuidance resource="bookings" employee={{ ...employee, role: 'sales' }} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('link', { name: /Add a customer first/ })).toBeTruthy();
    expect(await screen.findByText('Ask Inventory or Admin to complete this step.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Add available inventory first/ })).toBeNull();
  });
  it('does not show missing-data guidance on failed prerequisite queries and allows retry', async () => {
    failed = true;
    workspace('/inventory/new');
    expect(await screen.findByText('Prerequisites could not be checked.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Add a model first/ })).toBeNull();
    failed = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry prerequisites' }));
    await waitFor(() =>
      expect(screen.queryByText('Prerequisites could not be checked.')).toBeNull(),
    );
  });
  it('ignores malformed URL selections and hides unauthorized model mutations', async () => {
    const view = workspace('/inventory/new?model_id=not-a-uuid&role=admin');
    expect(
      ((await screen.findByRole('combobox', { name: 'Select Model' })) as HTMLSelectElement).value,
    ).toBe('');
    view.unmount();
    render(
      <MemoryRouter>
        <RecordActions
          resource="models"
          data={model}
          employee={{ ...employee, role: 'sales' }}
          onConvert={() => {}}
          onCancel={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Add vehicle/ })).toBeNull();
    expect(screen.getByText('Inventory or Admin can add a vehicle for this model.')).toBeTruthy();
  });
});
