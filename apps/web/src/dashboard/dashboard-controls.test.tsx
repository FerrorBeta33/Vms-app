// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { formatMoney, type Employee } from '@dealerflow/contracts';
import { Dashboard } from './dashboard';
import { defaults } from './layout';
import { queryClient } from '../lib/api';
import type { Summary } from './types';

const employee: Employee = {
  id: 'employee-ui',
  name: 'Demo Manager',
  email: 'manager@example.test',
  role: 'manager',
};
const storageKey = 'dealerflow.layout.v1.employee-ui.manager.executive';
const summary: Summary = {
  asOf: '2026-11-20T00:00:00Z',
  available: 1234567,
  active_bookings: 2,
  open_orders: 3,
  payments: '1234567890000',
  outstanding: '123456789',
  ready: 1,
  in_transit: 4,
  reserved: 2,
  sold: 5,
  payment_only: 1,
  document_only: 1,
  combined: 1,
  definitions: {},
};
const page = { items: [], total: 0, page: 1, limit: 20 };
beforeEach(() => {
  localStorage.clear();
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { staleTime: Infinity, retry: false } });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        const wasOpen = this.hasAttribute('open');
        this.removeAttribute('open');
        if (wasOpen) this.dispatchEvent(new Event('close'));
      },
    },
  });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected dashboard refetch')));
  const models = {
    ...page,
    items: [
      {
        id: 'model',
        brand: 'Demo',
        name: 'Urban',
        variant: 'Touring',
        image_key: 'suv',
        base_price_paise: '123456789',
      },
    ],
    total: 1,
  };
  const stock = { distribution: [], branches: [], comparison: [], models };
  for (const [path, data] of [
    ['/analytics/summary?', summary],
    ['/branches', { items: [] }],
    ['/models?limit=100', models],
    ['/analytics/stock?', stock],
    ['/analytics/stock?&limit=100', stock],
    ['/analytics/trends?', { items: [], explanation: 'Insufficient history' }],
    ['/analytics/activity?', { items: [] }],
    ['/analytics/exceptions?&limit=5&page=1&direction=asc', page],
    ['/models?&limit=3&page=1&q=', models],
  ] as const)
    queryClient.setQueryData(['api', path], data);
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard employee={employee} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function customize() {
  const trigger = screen.getByRole('button', { name: 'Customize' });
  trigger.focus();
  fireEvent.click(trigger);
  return screen.getByRole('dialog', { name: 'Customize workspace' });
}
const savedWidgets = () => JSON.parse(localStorage.getItem(storageKey) || 'null')?.widgets;

describe('dashboard customization and responsive metrics', () => {
  it('opens visible controls in a dialog and returns focus after cancelling', () => {
    mount();
    const panel = customize();
    expect(panel.hasAttribute('open')).toBe(true);
    expect(screen.getByRole('button', { name: 'Customize' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(within(panel).getAllByRole('combobox')).toHaveLength(5);
    expect(
      within(panel)
        .getByRole('combobox', { name: 'Stock at a glance width' })
        .querySelector('option[value="small"]')?.textContent,
    ).toBe('Compact');
    fireEvent.change(within(panel).getByRole('combobox', { name: 'Stock at a glance width' }), {
      target: { value: 'large' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Customize' }));
    expect(screen.getByRole('region', { name: 'Stock at a glance' }).className).not.toContain(
      'xl:col-span-3',
    );
    expect(localStorage.getItem(storageKey)).toBeNull();
  });
  it('saves width, visibility and keyboard reorder, then restores them on reload', () => {
    const view = mount();
    const panel = customize();
    fireEvent.change(within(panel).getByRole('combobox', { name: 'Stock at a glance width' }), {
      target: { value: 'large' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Move stock down' }));
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'Recent activity visible' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Save layout' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: 'Stock at a glance' }).className).toContain(
      'xl:col-span-3',
    );
    expect(screen.queryByRole('region', { name: 'Recent activity' })).toBeNull();
    expect(savedWidgets()[0].key).toBe('trends');
    view.unmount();
    mount();
    expect(screen.getByRole('region', { name: 'Stock at a glance' }).className).toContain(
      'xl:col-span-3',
    );
    expect(screen.queryByRole('region', { name: 'Recent activity' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Executive metrics' })).toBeTruthy();
    expect(screen.getByText('Action Center')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps Reset as a cancellable draft until Save layout is chosen', () => {
    mount();
    let panel = customize();
    fireEvent.change(within(panel).getByRole('combobox', { name: 'Stock at a glance width' }), {
      target: { value: 'large' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Save layout' }));
    const persisted = localStorage.getItem(storageKey);
    panel = customize();
    fireEvent.click(within(panel).getByRole('button', { name: 'Reset defaults' }));
    expect(
      (
        within(panel).getByRole('combobox', {
          name: 'Stock at a glance width',
        }) as HTMLSelectElement
      ).value,
    ).toBe('small');
    expect(localStorage.getItem(storageKey)).toBe(persisted);
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('region', { name: 'Stock at a glance' }).className).toContain(
      'xl:col-span-3',
    );
    panel = customize();
    fireEvent.click(within(panel).getByRole('button', { name: 'Reset defaults' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Save layout' }));
    expect(savedWidgets()).toEqual(defaults('executive'));
  });
  it('discards unsaved changes on native dialog close', () => {
    mount();
    const panel = customize();
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'Recent activity visible' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: 'Recent activity' })).toBeTruthy();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });
  it('supports drag handles and drop targets inside the actual editor', () => {
    mount();
    const panel = customize();
    const dataTransfer = { getData: () => 'stock', setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(within(panel).getByRole('button', { name: 'Drag stock widget' }), {
      dataTransfer,
    });
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'stock');
    fireEvent.drop(within(panel).getByText('Across your branches').closest('li')!, {
      dataTransfer,
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Save layout' }));
    expect(savedWidgets().map((widget: { key: string }) => widget.key)).toEqual([
      'trends',
      'models',
      'branches',
      'stock',
      'activity',
    ]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps failed saves visible and clears the failure when cancelling', () => {
    mount();
    const panel = customize();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage denied');
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Save layout' }));
    expect(within(panel).getByRole('alert').textContent).toContain('could not be saved');
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    expect(within(customize()).queryByRole('alert')).toBeNull();
  });
  it('bounds numeral sizes, preserves exact money and uses widget-width layouts', () => {
    mount();
    const metrics = screen.getByRole('region', { name: 'Executive metrics' });
    const amount = within(metrics).getByText(formatMoney(summary.payments));
    expect(amount.className).toContain('text-xs');
    expect(amount.className).not.toContain('text-2xl');
    expect(within(metrics).getByText('12,34,567').className).toContain('text-base');
    expect(within(metrics).getByText('2').className).toContain('text-lg');
    expect(screen.getByRole('region', { name: 'Model spotlight' }).className).toContain(
      '@container',
    );
    expect(
      screen
        .getByRole('region', { name: 'Model spotlight' })
        .querySelector('[class*="@xl:grid-cols-2"]'),
    ).toBeTruthy();
    for (const size of ['small', 'medium', 'large']) {
      const panel = customize();
      fireEvent.change(within(panel).getByRole('combobox', { name: 'Model spotlight width' }), {
        target: { value: size },
      });
      fireEvent.click(within(panel).getByRole('button', { name: 'Save layout' }));
      expect(within(metrics).getByText(formatMoney(summary.payments)).textContent).toBe(
        formatMoney(summary.payments),
      );
      expect(within(metrics).getByText(formatMoney(summary.payments)).className).not.toContain(
        'text-2xl',
      );
    }
  });
});
