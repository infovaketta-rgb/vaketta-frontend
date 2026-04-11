/**
 * Lightweight client-side audit trail for admin actions.
 * Logs to console for now; extend to POST /admin/audit-log when backend is ready.
 */
export function logAdminAction(
  action: string,
  meta?: Record<string, unknown>
): void {
  const entry = { action, meta, time: new Date().toISOString() };
  console.info("[VAKETTA_AUDIT]", entry);
}
