/**
 * Typed EventEmitter for ConnectionManager events
 *
 * Provides a type-safe wrapper around Node.js EventEmitter
 * for connection manager events.
 */

import { EventEmitter } from 'events';
import type { ConnectionManagerEvents } from './types.js';

/**
 * Type-safe event emitter for connection manager events.
 * Wraps Node.js EventEmitter with typed event signatures.
 */
export class TypedEventEmitter {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
  }

  /**
   * Subscribe to a connection manager event.
   */
  on<K extends keyof ConnectionManagerEvents>(
    event: K,
    handler: (payload: ConnectionManagerEvents[K]) => void
  ): void {
    this.emitter.on(event, handler);
  }

  /**
   * Subscribe to a connection manager event once.
   */
  once<K extends keyof ConnectionManagerEvents>(
    event: K,
    handler: (payload: ConnectionManagerEvents[K]) => void
  ): void {
    this.emitter.once(event, handler);
  }

  /**
   * Unsubscribe from a connection manager event.
   */
  off<K extends keyof ConnectionManagerEvents>(
    event: K,
    handler: (payload: ConnectionManagerEvents[K]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  /**
   * Emit a connection manager event.
   */
  emit<K extends keyof ConnectionManagerEvents>(
    event: K,
    payload: ConnectionManagerEvents[K]
  ): boolean {
    return this.emitter.emit(event, payload);
  }

  /**
   * Remove all listeners for a specific event or all events.
   */
  removeAllListeners<K extends keyof ConnectionManagerEvents>(event?: K): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  /**
   * Get the number of listeners for an event.
   */
  listenerCount<K extends keyof ConnectionManagerEvents>(event: K): number {
    return this.emitter.listenerCount(event);
  }
}
