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

  constructor() {
    const visibility = () => {
      clearTimeout(this.timer);
      if (document.hidden) {
        this.request?.abort();
        this.value.set(null);
        if (this.endpoint) this.state.set('loading');
      } else void this.refresh();
    };
    document.addEventListener('visibilitychange', visibility);
    inject(DestroyRef).onDestroy(() => {
      this.stopped = true;
      clearTimeout(this.timer);
      this.request?.abort();
      document.removeEventListener('visibilitychange', visibility);
    });
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.endpoint) { this.state.set('unconfigured'); return; }
    if (this.stopped || document.hidden || this.request) return;
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
      if (!this.stopped && !document.hidden) {
        this.value.set(data);
        this.state.set('live');
      }
    } catch {
      if (!this.stopped) {
        this.value.set(null);
        this.state.set(document.hidden ? 'loading' : 'unavailable');
      }
    } finally {
      clearTimeout(timeout);
      this.request = undefined;
      if (!this.stopped && !document.hidden) this.timer = setTimeout(() => void this.refresh(), 5000);
    }
  }
}
