export function groupBy<T, K>(
  items: T[],
  keyFn: (item: T, index: number) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const key = keyFn(item, i);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}
