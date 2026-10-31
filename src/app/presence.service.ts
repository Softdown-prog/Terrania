import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { parsePresence, presenceEndpoint, type Presence } from '../net/presence.ts';
import { runtimeConfig } from './runtime-config.ts';

@Injectable({ providedIn: 'root' })
export class PresenceService {
  readonly value = signal<Presence | null>(null);
  readonly state = signal<'loading' | 'live' | 'unavailable' | 'unconfigured'>('loading');
  private readonly endpoint = presenceEndpoint(runtimeConfig.multiplayerUrl, runtimeConfig.presenceUrl);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private request: AbortController | undefined;
  private stopped = false;
  private watchers = 0;

  constructor() {
    const visibility = () => {
      this.suspend();
      if (!document.hidden) void this.refresh();
    };
    document.addEventListener('visibilitychange', visibility);
    inject(DestroyRef).onDestroy(() => {
      this.stopped = true;
      this.suspend();
      document.removeEventListener('visibilitychange', visibility);
    });
  }

  /** Mounted panels share one poller; detached routes own no network activity. */
  watch(): () => void {
    if (this.stopped) return () => {};
    if (++this.watchers === 1) void this.refresh();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--this.watchers === 0) this.suspend();
    };
  }

  private suspend(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const request = this.request;
    this.request = undefined;
    request?.abort();
    this.value.set(null);
    this.state.set(this.endpoint ? 'loading' : 'unconfigured');
  }

  async refresh(): Promise<void> {
    if (this.stopped || this.watchers === 0 || document.hidden || this.request) return;
    if (!this.endpoint) { this.state.set('unconfigured'); return; }
    clearTimeout(this.timer);
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(this.endpoint, { signal: controller.signal, cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error('Presence unavailable');
      const data = parsePresence(await response.json());
      if (!data || Date.now() - Date.parse(data.updatedAt) > 15_000 || Date.parse(data.updatedAt) - Date.now() > 60_000)
        throw new Error('Invalid or stale presence');
      if (this.request === controller && !controller.signal.aborted && !this.stopped && !document.hidden) {
        this.value.set(data);
        this.state.set('live');
      }
    } catch {
      if (this.request === controller && !this.stopped) {
        this.value.set(null);
        this.state.set(document.hidden ? 'loading' : 'unavailable');
      }
    } finally {
      clearTimeout(timeout);
      // A canceled request may finish after another panel has already reattached.
      // It must not clear the new request or schedule a second polling loop.
      if (this.request === controller) {
        this.request = undefined;
        if (!this.stopped && this.watchers > 0 && !document.hidden)
          this.timer = setTimeout(() => void this.refresh(), 5000);
      }
    }
  }
}
