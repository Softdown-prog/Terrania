/**
 * Avisa o servidor, de forma anônima, que esta aba está jogando agora. Serve só ao contador de
 * pessoas jogando: o jogo é solo e offline e nunca depende desta resposta.
 *
 * O identificador é aleatório, vive só na memória desta aba e não é gravado nem ligado a conta ou IP.
 */
export interface PlayPresenceOptions {
  endpoint: string | null;
  intervalMs?: number;
  /** Injetáveis para teste. */
  send?: (endpoint: string, body: string) => Promise<unknown>;
  isVisible?: () => boolean;
  newId?: () => string;
}

const defaultId = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

/** Começa a enviar o sinal; devolve a função que para tudo. Falhas de rede são ignoradas de propósito. */
export function startPlayPresence(options: PlayPresenceOptions): () => void {
  const { endpoint } = options;
  if (!endpoint) return () => {};
  const interval = options.intervalMs ?? 20_000;
  const id = (options.newId ?? defaultId)();
  const visible = options.isVisible ?? (() => !document.hidden);
  const send = options.send ?? ((url: string, body: string) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, credentials: 'omit', keepalive: true }));
  let stopped = false;
  const beat = (): void => {
    if (stopped || !visible()) return; // aba escondida não está jogando
    void Promise.resolve(send(endpoint, JSON.stringify({ id }))).catch(() => {});
  };
  beat();
  const timer = setInterval(beat, interval);
  const onVisibility = (): void => { if (visible()) beat(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  return () => {
    stopped = true;
    clearInterval(timer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  };
}
