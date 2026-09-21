export const ALERT_TYPE_ACTIVE_PORT = Symbol('AlertTypeActivePort');

/** Emitters re-check immediately before a new inbox write (ADR-013 / K5). */
export interface AlertTypeActivePort {
  isActive(code: string): Promise<boolean>;
}

export async function emitIfActive(
  port: AlertTypeActivePort | null | undefined,
  code: string,
  emit: () => Promise<void>,
): Promise<boolean> {
  const active = port ? await port.isActive(code) : true;
  if (!active) {
    return false;
  }
  await emit();
  return true;
}
