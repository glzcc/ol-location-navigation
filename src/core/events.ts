import type {
  NavigationEventHandler,
  NavigationEventMap,
  NavigationEventName
} from '../types/navigation';

export class NavigationEventBus {
  private readonly handlers = new Map<NavigationEventName, Set<NavigationEventHandler<any>>>();

  on<T extends NavigationEventName>(eventName: T, handler: NavigationEventHandler<T>): void {
    const handlers = this.handlers.get(eventName) ?? new Set();
    handlers.add(handler);
    this.handlers.set(eventName, handlers);
  }

  off<T extends NavigationEventName>(eventName: T, handler: NavigationEventHandler<T>): void {
    this.handlers.get(eventName)?.delete(handler);
  }

  emit<T extends NavigationEventName>(eventName: T, payload: NavigationEventMap[T]): void {
    this.handlers.get(eventName)?.forEach(handler => handler(payload));
  }

  clear(): void {
    this.handlers.clear();
  }
}
