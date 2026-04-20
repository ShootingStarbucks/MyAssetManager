import 'server-only';

export async function fetchUsdToKrw(): Promise<number | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates: { KRW: number } };
    return data.rates.KRW ?? null;
  } catch {
    return null;
  }
}
