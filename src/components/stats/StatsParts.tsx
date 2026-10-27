import { useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { MoreList } from './MoreList';
import { BAR_LIST_SIZE, RANK_SIZE, STATS_PATH, niceTicks, percentOf, type MonthState } from '@/lib/stats';
import type { RankedEntity, TermRef } from '@/schema';

/** 통계 페이지의 한 묶음: 위 굵은 선, 제목과 보조 설명 */
export function StatsSection({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`stats-${id}`} className="ct-stats-section">
      <div className="ct-section-heading">
        <h2 id={`stats-${id}`}>{title}</h2>
        {note && <span className="ct-stats-note">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export type Kpi = { label: string; value: string; hint?: string; accent?: boolean };

/** 요약 숫자 줄. 첫 칸이 이 화면의 대표 숫자다 */
export function KpiRow({ label, items }: { label: string; items: Kpi[] }) {
  return (
    <dl className="ct-kpis" aria-label={label}>
      {items.map((k) => (
        <div key={k.label} data-accent={k.accent || undefined}>
          <dt>{k.label}</dt>
          <dd>
            <span className="ct-kpi-value">{k.value}</span>
            {k.hint && <span className="ct-kpi-hint">{k.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export type Column = {
  key: string;
  /** 툴팁·표에 쓰는 전체 이름(예: 2026.10) */
  label: string;
  /** 축 아래 짧은 표기. 없으면 그 칸은 비워 둔다(글자가 겹치지 않게) */
  axisLabel?: string;
  count: number;
  state?: MonthState;
};

/**
 * 세로 막대 차트(시리즈 하나). 서버에서 HTML로 그리고, 막대마다 포인터·키보드 초점에 값을 보여 준다.
 * 이번 달은 강조색, 예정은 옅은 색이며 범례와 툴팁 글자로도 구분한다. 같은 값을 표로도 열 수 있다.
 */
export function ColumnChart({ label, columns, caption }: { label: string; columns: Column[]; caption?: string }) {
  const t = useTranslations('Stats.chart');
  const ticks = niceTicks(Math.max(0, ...columns.map((c) => c.count)));
  const top = ticks.at(-1)!;
  const states = new Set(columns.map((c) => c.state));
  const pointLabel = (c: Column) => {
    const suffix = c.state === 'future' ? ` (${t('planned')})` : c.state === 'current' ? ` (${t('current')})` : '';
    return t('point', { label: `${c.label}${suffix}`, count: c.count });
  };

  return (
    <figure className="ct-chart">
      {(states.has('current') || states.has('future')) && (
        <ul className="ct-chart-legend">
          <li data-state="past">{t('byStart')}</li>
          {states.has('current') && <li data-state="current">{t('current')}</li>}
          {states.has('future') && <li data-state="future">{t('planned')}</li>}
        </ul>
      )}
      <div className="ct-cols" style={{ '--cols': columns.length } as CSSProperties}>
        <div className="ct-cols-axis" aria-hidden="true">
          {ticks.map((v) => (
            <span key={v} data-v={v} style={{ bottom: `${(v / top) * 100}%` }} />
          ))}
        </div>
        <ol className="ct-cols-plot" aria-label={label}>
          {columns.map((c) => {
            const body = (
              <>
                <span className="ct-col-bar" style={{ height: `${(c.count / top) * 100}%` }}>
                  <span className="ct-col-tip" aria-hidden="true">
                    <strong>{t('count', { count: c.count })}</strong>
                    <span>
                      {c.label}
                      {c.state === 'future' && ` · ${t('planned')}`}
                    </span>
                  </span>
                </span>
              </>
            );
            return (
              <li key={c.key} data-state={c.state ?? 'past'}>
                {/* 키보드로도 값을 읽을 수 있게 막대 칸이 초점을 받는다 */}
                <span className="ct-col" tabIndex={0} role="img" aria-label={pointLabel(c)}>
                  {body}
                </span>
                <span className="ct-col-label" aria-hidden="true">
                  {c.axisLabel ?? ''}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
      <details className="ct-chart-table">
        <summary>{t('table')}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{t('colPeriod')}</th>
              <th scope="col">{t('colCount')}</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c) => (
              <tr key={c.key}>
                <th scope="row">
                  {c.label}
                  {c.state === 'future' && ` (${t('planned')})`}
                </th>
                <td className="ct-mono">{c.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** 분류별 가로 막대: 이름 · 건수 · 전체 대비 비율. 이름은 그 분류의 목록으로 이어진다. 앞 BAR_LIST_SIZE개만 보이고 나머지는 '더 보기' */
export function BarList({ title, items, total, href }: { title: string; items: (TermRef & { count: number })[]; total: number; href: (key: string) => string }) {
  const t = useTranslations('Stats');
  const tList = useTranslations('List');
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section className="ct-block">
      <h3 className="ct-stats-h3">{title}</h3>
      {items.length === 0 ? (
        <p className="ct-stats-empty">{t('rank.empty')}</p>
      ) : (
        <MoreList
          className="ct-barlist"
          visible={BAR_LIST_SIZE}
          moreLabel={tList('showMore', { count: items.length - BAR_LIST_SIZE })}
          lessLabel={tList('showLess')}
          items={items.map((it) => (
            <li key={it.key}>
              <Link href={href(it.key)} title={t('chart.share', { count: total, percent: percentOf(it.count, total) })}>
                <span className="ct-barlist-label">{it.label}</span>
                <span className="ct-barlist-value ct-mono">
                  {it.count}
                  <span>{percentOf(it.count, total)}%</span>
                </span>
                <span className="ct-barlist-bar" aria-hidden="true">
                  <span style={{ width: `${(it.count / max) * 100}%` }} />
                </span>
              </Link>
            </li>
          ))}
        />
      )}
    </section>
  );
}

/** 순위 목록(위에서 RANK_SIZE개): 순번 · 이름(분류) · 건수. 이름은 작품·회사 페이지로 이어진다 */
export function RankList({ title, items, hrefPrefix }: { title: string; items: (RankedEntity & { kind?: TermRef | null })[]; hrefPrefix: '/properties' | '/companies' }) {
  const t = useTranslations('Stats');
  return (
    <section className="ct-block">
      <h3 className="ct-stats-h3">{title}</h3>
      {items.length === 0 ? (
        <p className="ct-stats-empty">{t('rank.empty')}</p>
      ) : (
        <ol className="ct-ranklist">
          {items.slice(0, RANK_SIZE).map((it, i) => (
            <li key={it.slug}>
              <Link href={`${hrefPrefix}/${it.slug}`}>
                <span className="ct-ranklist-rank ct-mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="ct-ranklist-name">
                  {it.name}
                  {it.kind && <span>{it.kind.label}</span>}
                </span>
                <span className="ct-ranklist-count ct-mono">{t('chart.count', { count: it.count })}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** 연도 고르기: 전체 + 시작한 콜라보가 있는 해. 목록 화면의 진행 상태 탭과 같은 모양 */
export function YearTabs({ label, allLabel, years, current }: { label: string; allLabel: string; years: { year: number; count: number }[]; current: number | null }) {
  return (
    <nav aria-label={label}>
      <ul className="ct-tabs">
        <li>
          <Link href={STATS_PATH} aria-current={current === null ? 'page' : undefined}>
            {allLabel}
          </Link>
        </li>
        {years
          .filter((y) => y.count > 0)
          .map((y) => (
            <li key={y.year}>
              <Link href={`${STATS_PATH}/${y.year}`} aria-current={current === y.year ? 'page' : undefined}>
                {y.year}
                <sup>{y.count}</sup>
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}

/** 집계 기준. 숫자를 인용하는 사람이 범위를 오해하지 않게 모든 통계 화면 아래에 둔다 */
export function MethodNote({ undated, yearScoped }: { undated: number; yearScoped: boolean }) {
  const t = useTranslations('Stats');
  return (
    <StatsSection id="method" title={t('section.method')}>
      <ul className="ct-stats-method">
        <li>{t('method.collectionStart')}</li>
        <li>{t('method.published')}</li>
        <li>{t('method.start')}</li>
        {undated > 0 && <li>{t('chart.undated', { count: undated })}</li>}
        <li>{t('method.multi')}</li>
        {yearScoped && <li>{t('method.yearLinks')}</li>}
        <li>
          {t('method.coverage')}{' '}
          <Link href="/report" className="ct-more">
            {t('method.report')}
          </Link>
        </li>
      </ul>
    </StatsSection>
  );
}
