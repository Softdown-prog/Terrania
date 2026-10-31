export interface Presence {
  online: number;
  rooms: number;
  updatedAt: string;
  scope: 'server' | 'cluster';
}

/** A missing/failed response is unknown, never a fabricated zero. */
export function parsePresence(value: unknown): Presence | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (typeof data.online !== 'number' || !Number.isSafeInteger(data.online) || data.online < 0 ||
      typeof data.rooms !== 'number' || !Number.isSafeInteger(data.rooms) || data.rooms < 0 ||
      typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)) ||
      (data.scope !== 'server' && data.scope !== 'cluster')) return null;
  return { online: data.online, rooms: data.rooms, updatedAt: data.updatedAt, scope: data.scope };
}

export function presenceEndpoint(websocketUrl: string, explicit = ''): string | null {
  try {
    const url = new URL(explicit || websocketUrl);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (url.username || url.password ||
        !(explicit ? ['https:', ...(local ? ['http:'] : [])] : ['wss:', ...(local ? ['ws:'] : [])]).includes(url.protocol)) return null;
    if (!explicit) {
      url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
      url.pathname = '/presence';
      url.search = '';
      url.hash = '';
    }
    return url.href;
  } catch { return null; }
}
