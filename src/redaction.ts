/** Copy diagnostic data without retaining the client's credential or invoking getters. */
export function redactDiagnostic<T>(value: T, credential: string): T {
  const literals = new Set([credential, JSON.stringify(credential).slice(1, -1)]);
  for (const encode of [encodeURIComponent, encodeURI]) {
    try {
      const encoded = encode(credential);
      literals.add(encoded);
      literals.add(encodeURIComponent(encoded));
    } catch { /* malformed surrogate: the raw literal is still protected */ }
  }
  const query = new URLSearchParams({ value: credential }).toString();
  literals.add(query.slice('value='.length));
  const patterns = [...literals].filter(Boolean).sort((a, b) => b.length - a.length).map((literal) => {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Percent hex is case-insensitive; the credential itself remains case-sensitive.
    return new RegExp(escaped.replace(/%([0-9a-f]{2})/gi, (_, hex: string) =>
      '%' + [...hex].map((c) => /[a-f]/i.test(c) ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c).join('')), 'g');
  });
  const text = (input: string) => patterns.reduce((result, pattern) => result.replace(pattern, '[REDACTED]'), input);
  const seen = new WeakMap<object, unknown>();
  let count = 0;
  const copy = (input: unknown, depth: number): unknown => {
    if (typeof input === 'string') return text(input);
    if (typeof input === 'symbol') return Symbol(text(input.description ?? ''));
    if (typeof input === 'function') return '[function]';
    if (!input || typeof input !== 'object') return input;
    if (seen.has(input)) return seen.get(input);
    if (depth > 32 || ++count > 5000) return '[diagnostic omitted]';
    if (input instanceof Date) return new Date(input.getTime());
    if (input instanceof Map) {
      const out = new Map(); seen.set(input, out);
      for (const [key, item] of input) out.set(copy(key, depth + 1), copy(item, depth + 1));
      return out;
    }
    if (input instanceof Set) {
      const out = new Set(); seen.set(input, out);
      for (const item of input) out.add(copy(item, depth + 1));
      return out;
    }
    const isError = input instanceof Error;
    const out = Array.isArray(input) ? [] : isError ? Object.create(Object.getPrototypeOf(input)) : Object.create(null);
    seen.set(input, out);
    for (const key of Reflect.ownKeys(input)) {
      if (Array.isArray(input) && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor) continue;
      const safeKey = typeof key === 'string' ? text(key) : Symbol(text(key.description ?? ''));
      Object.defineProperty(out, safeKey, {
        value: 'value' in descriptor ? copy(descriptor.value, depth + 1) : '[accessor omitted]',
        enumerable: descriptor.enumerable, writable: true, configurable: true,
      });
    }
    if (isError) {
      // Preserve typed SDK errors without allowing custom diagnostic hooks to
      // reach a shared original error or a private credential-bearing closure.
      let owner: object | null = input;
      let name: unknown;
      while (owner && name === undefined) {
        const descriptor = Object.getOwnPropertyDescriptor(owner, 'name');
        if (descriptor) { name = 'value' in descriptor ? descriptor.value : 'Error'; break; }
        owner = Object.getPrototypeOf(owner);
      }
      Object.defineProperty(out, 'name', { value: text(typeof name === 'string' ? name : 'Error'), configurable: true });
      Object.defineProperty(out, 'toString', { value: Error.prototype.toString, configurable: true });
      const record = () => Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(out))
        .filter(([, d]) => typeof d.value !== 'function').map(([key, d]) => [key, d.value]));
      Object.defineProperty(out, 'toJSON', { value: record, configurable: true });
      Object.defineProperty(out, Symbol.for('nodejs.util.inspect.custom'), { value: record, configurable: true });
    }
    return out;
  };
  return copy(value, 0) as T;
}
