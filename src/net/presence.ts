export interface Presence {
  online: number;
  /** Só os laboratórios Go ainda informam salas; o servidor Node atual não tem salas. */
  rooms?: number;
  updatedAt: string;
  scope: 'server' | 'cluster';
}

/** A missing/failed response is unknown, never a fabricated zero. */
export function parsePresence(value: unknown): Presence | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const rooms = data.rooms;
  if (typeof data.online !== 'number' || !Number.isSafeInteger(data.online) || data.online < 0 ||
      (rooms !== undefined && (typeof rooms !== 'number' || !Number.isSafeInteger(rooms) || rooms < 0)) ||
      typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)) ||
      (data.scope !== 'server' && data.scope !== 'cluster')) return null;
  return { online: data.online, ...(rooms === undefined ? {} : { rooms }), updatedAt: data.updatedAt, scope: data.scope };
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

/** Endereço do sinal de quem está jogando: o mesmo servidor e a mesma regra de segurança da contagem. */
export function heartbeatEndpoint(websocketUrl: string, explicit = ''): string | null {
  const presence = presenceEndpoint(websocketUrl, explicit);
  return presence === null ? null : new URL(presence.replace(/\/$/, '') + '/heartbeat').href;
}
