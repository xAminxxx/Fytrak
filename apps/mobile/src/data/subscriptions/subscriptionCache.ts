export type Unsubscribe = () => void;

type Listener<T> = (value: T) => void;

type CacheEntry = {
  listeners: Set<Listener<unknown>>;
  unsubscribe: Unsubscribe | null;
  value: unknown;
  hasValue: boolean;
  refCount: number;
};

const cache = new Map<string, CacheEntry>();

export function subscribeWithCache<T>(
  key: string,
  factory: (emit: Listener<T>) => Unsubscribe,
  listener: Listener<T>
): Unsubscribe {
  if (!key) {
    throw new Error("subscribeWithCache requires a key.");
  }

  let entry = cache.get(key);
  if (!entry) {
    entry = {
      listeners: new Set(),
      unsubscribe: null,
      value: null,
      hasValue: false,
      refCount: 0,
    };
    cache.set(key, entry);
  }

  const typedListener = listener as Listener<unknown>;
  entry.listeners.add(typedListener);
  entry.refCount += 1;

  if (!entry.unsubscribe) {
    entry.unsubscribe = factory((value) => {
      entry!.value = value;
      entry!.hasValue = true;
      entry!.listeners.forEach((cb) => cb(value));
    });
  }

  if (entry.hasValue) {
    listener(entry.value as T);
  }

  return () => {
    const current = cache.get(key);
    if (!current) return;
    current.listeners.delete(typedListener);
    current.refCount -= 1;

    if (current.refCount <= 0) {
      current.unsubscribe?.();
      cache.delete(key);
    }
  };
}
