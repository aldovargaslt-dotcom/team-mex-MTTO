import { redirect } from 'next/navigation';
import { legacyAnalysisUrl } from '@/lib/inventory-analysis';

export default async function LegacyPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string') params.set(key, value);
    else if (value?.[0]) params.set(key, value[0]);
  }
  redirect(legacyAnalysisUrl('consumo', params));
}
