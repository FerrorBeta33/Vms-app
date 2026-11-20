import request from 'supertest';
import { expect } from 'vitest';
import type { Express } from 'express';
export async function verifyReads(app: Express, token: string, ids: Record<string, string>) {
  const { orderId, vehicleId, modelId, customerId, bookingId } = ids;
  const routes = [
    'branches',
    'employees',
    'models',
    'vehicles',
    'customers',
    'bookings',
    'orders',
    'dashboard',
    'analytics/summary',
    'analytics/stock',
    'analytics/exceptions',
    'analytics/trends',
    'analytics/records?metric=payments',
    'analytics/search?q=Test',
    'analytics/activity',
    `analytics/journeys/${orderId}`,
    `vehicles/${vehicleId}`,
    `models/${modelId}`,
    `customers/${customerId}`,
    `bookings/${bookingId}`,
    `orders/${orderId}/payments`,
    `orders/${orderId}/documents`,
  ];
  for (const route of routes)
    expect(
      (
        await request(app)
          .get(`/api/${route}`)
          .set({ Authorization: `Bearer ${token}` })
      ).status,
      route,
    ).toBe(200);
}
