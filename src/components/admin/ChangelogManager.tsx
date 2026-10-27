'use client';

import { ExternalLinkIcon, Pencil1Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { AlertDialog, Badge, Button, Callout, Card, Dialog, Flex, Heading, SegmentedControl, Switch, Text, TextArea, TextField } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { deleteChangelog, saveChangelog } from '@/app/[locale]/admin/actions';
import { Markdown } from '@/components/site/Markdown';
import { Link, useRouter } from '@/i18n/navigation';
import { CHANGELOG_PATH } from '@/lib/changelog';
import { formatDate } from '@/lib/format';
import type { AdminChangelogEntry, ChangelogInput } from '@/schema';

type FormError = { message?: string; fields?: Record<string, string> };

/** 사이트 변경 내역 작성(관리자 전용). 공개한 항목만 /changelog에 보이고, 본문은 마크다운 ko/en 필수 */
export function ChangelogManager({ entries }: { entries: AdminChangelogEntry[] }) {
  const [editing, setEditing] = useState<AdminChangelogEntry | 'new' | null>(null);
  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="end" gap="3" wrap="wrap">
        <Flex direction="column" gap="1">
          <Heading as="h1" size="6">
            변경 내역
          </Heading>
          <Text size="2" color="gray">
            공개한 항목만 사이트의 변경 내역 페이지에 최신순(날짜 → 작성 순)으로 보입니다. 본문은 마크다운이며 한국어·영어 모두 필요합니다.
          </Text>
        </Flex>
        <Flex gap="2">
          <Button asChild variant="soft" color="gray">
            <Link href={CHANGELOG_PATH} target="_blank">
              <ExternalLinkIcon /> 페이지 보기
            </Link>
          </Button>
          <Button onClick={() => setEditing('new')}>
            <PlusIcon /> 새 항목
          </Button>
        </Flex>
      </Flex>
      {entries.length === 0 ? (
        <Text color="gray" size="2">
          아직 변경 내역이 없습니다.
        </Text>
      ) : (
        <Flex direction="column" gap="3">
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} onEdit={() => setEditing(e)} />
          ))}
        </Flex>
      )}
      {editing && (
        <EntryDialog key={editing === 'new' ? 'new' : editing.id} entry={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </Flex>
  );
}

function EntryCard({ entry, onEdit }: { entry: AdminChangelogEntry; onEdit: () => void }) {
  return (
    <Card size="2">
      <Flex justify="between" align="start" gap="3" wrap="wrap" mb="3">
        <Flex align="baseline" gap="3" wrap="wrap">
          <Text weight="bold" size="4" className="ct-mono">
            {entry.version}
          </Text>
          <Text size="2" color="gray" className="ct-mono">
            {formatDate(entry.date, 'day')}
          </Text>
          {entry.published ? (
            <Badge color="green">공개</Badge>
          ) : (
            <Badge color="gray" variant="soft">
              비공개
            </Badge>
          )}
        </Flex>
        <Flex gap="2">
          <Button size="1" variant="soft" onClick={onEdit}>
            <Pencil1Icon /> 수정
          </Button>
          <DeleteButton entry={entry} />
        </Flex>
      </Flex>
      <div className="ct-two">
        <BodyPreview label="한국어" body={entry.body.ko} />
        <BodyPreview label="English" body={entry.body.en} />
      </div>
    </Card>
  );
}

function BodyPreview({ label, body }: { label: string; body: string }) {
  return (
    <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
      <Text size="1" color="gray">
        {label}
      </Text>
      <Markdown>{body}</Markdown>
    </Flex>
  );
}

function DeleteButton({ entry }: { entry: AdminChangelogEntry }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <AlertDialog.Root onOpenChange={() => setError(null)}>
      <AlertDialog.Trigger>
        <Button size="1" variant="soft" color="red">
          <TrashIcon /> 삭제
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="420px">
        <AlertDialog.Title>{entry.version} 삭제</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {entry.published ? '공개된 항목입니다. 삭제하면 변경 내역 페이지에서도 사라지고 되돌릴 수 없습니다.' : '삭제하면 되돌릴 수 없습니다.'}
        </AlertDialog.Description>
        {error && (
          <Callout.Root color="red" size="1" mt="3">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}
        <Flex gap="2" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              취소
            </Button>
          </AlertDialog.Cancel>
          <Button
            color="red"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteChangelog(entry.id);
                if (!res.ok) return setError(res.error.message ?? res.error.code);
                router.refresh();
              })
            }
          >
            삭제
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

/** 브라우저 기준 오늘(YYYY-MM-DD) */
const today = () => new Date().toLocaleDateString('sv-SE');

const FIELD_MESSAGES: Record<string, string> = { 'already exists': '이미 있는 버전입니다' };

/** 입력 칸 옆에 보여 주는 필드 오류. 나머지는 아래 한 줄로 */
const INLINE_FIELDS = new Set(['version', 'date', 'body.ko', 'body.en']);

function EntryDialog({ entry, onClose }: { entry: AdminChangelogEntry | null; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<ChangelogInput>(
    entry
      ? { version: entry.version, date: entry.date, body: { ...entry.body }, published: entry.published }
      : { version: '', date: today(), body: { ko: '', en: '' }, published: false },
  );
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [error, setError] = useState<FormError | null>(null);
  const [pending, start] = useTransition();
  const field = (key: string) => {
    const msg = error?.fields?.[key];
    return msg ? <span className="ct-error-text">{FIELD_MESSAGES[msg] ?? msg}</span> : null;
  };
  const fieldErrors = Object.entries(error?.fields ?? {});
  const summary = fieldErrors.some(([k]) => INLINE_FIELDS.has(k))
    ? null
    : (error?.message ?? (fieldErrors.map(([k, v]) => `${k}: ${v}`).join(', ') || null));

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="880px">
        <Dialog.Title>{entry ? `${entry.version} 수정` : '새 변경 내역'}</Dialog.Title>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveChangelog(entry?.id ?? null, form);
              if (!res.ok) return setError(res.error);
              router.refresh();
              onClose();
            });
          }}
        >
          <Flex direction="column" gap="3" mt="3">
            <div className="ct-two">
              <Text as="label" className="ct-field">
                <span className="ct-label">버전 (예: 1.4.0)</span>
                <TextField.Root
                  className="ct-mono"
                  required
                  maxLength={40}
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
                {field('version')}
              </Text>
              <Text as="label" className="ct-field">
                <span className="ct-label">날짜</span>
                <TextField.Root type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                {field('date')}
              </Text>
            </div>
            <Flex justify="between" align="center" gap="3" wrap="wrap">
              <SegmentedControl.Root size="1" value={view} onValueChange={(v) => setView(v as 'write' | 'preview')}>
                <SegmentedControl.Item value="write">작성</SegmentedControl.Item>
                <SegmentedControl.Item value="preview">미리보기</SegmentedControl.Item>
              </SegmentedControl.Root>
              <Text as="span" size="1" color="gray">
                마크다운: <span className="ct-mono">- 목록</span>, <span className="ct-mono">**굵게**</span>, <span className="ct-mono">[링크](https://…)</span>,{' '}
                <span className="ct-mono">### 소제목</span>
              </Text>
            </Flex>
            <div className="ct-two">
              {(['ko', 'en'] as const).map((l) => (
                <Text as="label" key={l} className="ct-field" style={{ minWidth: 0 }}>
                  <span className="ct-label">{l === 'ko' ? '한국어 본문' : 'English body'}</span>
                  {view === 'write' ? (
                    <TextArea
                      required
                      rows={12}
                      maxLength={10_000}
                      value={form.body[l]}
                      onChange={(e) => setForm({ ...form, body: { ...form.body, [l]: e.target.value } })}
                    />
                  ) : (
                    <Card size="1" style={{ minHeight: 120 }}>
                      {form.body[l].trim() ? (
                        <Markdown>{form.body[l]}</Markdown>
                      ) : (
                        <Text size="2" color="gray">
                          (비어 있음)
                        </Text>
                      )}
                    </Card>
                  )}
                  {field(`body.${l}`)}
                </Text>
              ))}
            </div>
            <Text as="label" size="2">
              <Flex gap="2" align="center">
                <Switch checked={form.published} onCheckedChange={(published) => setForm({ ...form, published })} />
                공개 (변경 내역 페이지에 보임)
              </Flex>
            </Text>
            {summary && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{summary}</Callout.Text>
              </Callout.Root>
            )}
            <Flex justify="end" gap="2" mt="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  취소
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={pending}>
                {entry ? '저장' : '추가'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
