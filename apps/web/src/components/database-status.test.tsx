// @vitest-environment jsdom
import React from 'react';
import { afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/api';
import { DatabaseStatus } from './database-status';
const ready = () =>
  new Response(JSON.stringify({ status: 'ready', database: 'postgresql' }), { status: 200 });
afterEach(() => {
  cleanup();
  queryClient.clear();
  vi.unstubAllGlobals();
});
function mount() {
  return render(
    <QueryClientProvider client={queryClient}>
      <DatabaseStatus />
    </QueryClientProvider>,
  );
}
it('shows checking rather than an invented connected state before readiness returns', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );
  mount();
  expect(screen.getByRole('status').textContent).toBe('PostgreSQL · Checking');
});
it('uses live health results, handles stale failures and permits recovery', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(ready())
    .mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce(ready());
  vi.stubGlobal('fetch', fetcher);
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'PostgreSQL Connected. Check connection' }),
  );
  expect(
    await screen.findByRole('button', { name: 'PostgreSQL Unavailable. Check connection' }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'PostgreSQL Unavailable. Check connection' }));
  expect(
    await screen.findByRole('button', { name: 'PostgreSQL Connected. Check connection' }),
  ).toBeTruthy();
  expect(fetcher.mock.calls[0][0]).toBe('/api/health');
});
it('does not claim PostgreSQL connectivity for an unconfirmed database response', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ status: 'ready', database: 'unknown' }), { status: 200 }),
      ),
  );
  mount();
  expect(
    await screen.findByRole('button', { name: 'PostgreSQL Unavailable. Check connection' }),
  ).toBeTruthy();
});
