import type { CollabSummary, Locale } from '@/schema';
import { computePhase } from './phase';

const HEADERS = [
  'slug',
  'title',
  'phase',
  'start',
  'end',
  'date_precision',
  'end_kind',
  'host',
  'partner',
  'partner_category',
  'regions',
  'platforms',
  'collab_types',
  'url',
] as const;

/** RFC 4180 + 수식 주입 방지(=,+,-,@로 시작하면 ' 접두) */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function collabsToCsv(items: CollabSummary[], locale: Locale, siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''): string {
  const rows = items.map((c) => {
    const host = c.parties.find((p) => p.role === 'host');
    const partner = c.parties.find((p) => p.role === 'partner');
    const labels = (list: { label: string }[]) => list.map((t) => t.label).join('; ');
    return [
      c.slug,
      c.title,
      computePhase(c.period),
      c.period.start ?? '',
      c.period.end ?? '',
      c.period.precision,
      c.period.endKind,
      host?.name.value ?? '',
      partner?.name.value ?? '',
      partner?.kind.label ?? '',
      labels(c.regions),
      labels(c.platforms),
      labels(c.collabTypes),
      `${siteUrl}/${locale}/collabs/${c.slug}`,
    ].map(csvCell);
  });
  // BOM: 엑셀에서 한글이 깨지지 않도록
  return '﻿' + [HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\r\n') + '\r\n';
}
