export const INBOX_CHANGED = 'tmx-inbox-changed';

export function notifyInboxChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(INBOX_CHANGED));
}
