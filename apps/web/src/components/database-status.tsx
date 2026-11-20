import { useQuery } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import { api } from '../lib/api';

export function DatabaseStatus() {
  const result = useQuery({
    queryKey: ['api', '/health'],
    queryFn: ({ signal }) => api<{ status: string; database: string }>('/health', { signal }),
    refetchInterval: 30000,
    staleTime: 0,
    retry: false,
  });
  const connected =
    !result.isError && result.data?.status === 'ready' && result.data?.database === 'postgresql';
  const status = result.isFetching ? 'Checking' : connected ? 'Connected' : 'Unavailable';
  const style = result.isFetching
    ? 'bg-muted text-muted-foreground'
    : connected
      ? 'bg-success-soft text-success'
      : 'bg-destructive-soft text-destructive';
  return (
    <button
      type="button"
      disabled={result.isFetching}
      onClick={() => void result.refetch()}
      aria-label={`PostgreSQL ${status}. Check connection`}
      title={
        result.dataUpdatedAt
          ? `Last health response: ${new Date(result.dataUpdatedAt).toLocaleTimeString('en-IN')}. Checked every 30 seconds; click to refresh.`
          : 'Checks API and PostgreSQL readiness every 30 seconds.'
      }
      className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-full px-3 text-xs font-medium ${style}`}
    >
      <Database size={14} aria-hidden />
      <span role="status" aria-live="polite">
        PostgreSQL · {status}
      </span>
    </button>
  );
}
