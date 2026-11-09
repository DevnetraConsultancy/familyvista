/**
 * PostgREST caps every response (1000 rows by default) without an error, so
 * a plain `select()` silently drops rows past the cap. This reads every page.
 *
 * `build(from, to)` must return a fresh query with a stable `.order()` and
 * `.range(from, to)` applied.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<{ data: T[]; error: { message: string } | null }> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) return { data: out, error };
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
  }
  return { data: out, error: null };
}

/** Split a list into chunks (keeps `.in()` filters well under URL limits). */
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
