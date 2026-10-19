'use client';

import { CheckCircledIcon } from '@radix-ui/react-icons';
import { Button, Callout, Flex, Text, TextArea, TextField } from '@radix-ui/themes';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useId, useState } from 'react';
import { submitReport, type ReportState } from '@/app/[locale]/(site)/actions';
import type { SubmissionKind } from '@/schema';
import { Turnstile } from './Turnstile';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;

type Props = {
  kind: SubmissionKind;
  /** correction: 대상 콜라보 slug */
  collab?: string;
  /** 보낸 뒤 화면의 닫기 버튼(대화상자에서만) */
  onClose?: () => void;
};

/** 제보 폼. 보낸 뒤 “하나 더”를 누르면 key를 바꿔 빈 폼으로 다시 그린다 */
export function ReportForm(props: Props) {
  const [round, setRound] = useState(0);
  return <ReportFormInner key={round} {...props} onAgain={() => setRound((r) => r + 1)} />;
}

function ReportFormInner({ kind, collab, onClose, onAgain }: Props & { onAgain: () => void }) {
  const t = useTranslations('Report');
  const locale = useLocale();
  const id = useId();
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, { status: 'idle' });

  if (state.status === 'sent') {
    return (
      <Flex direction="column" gap="4" role="status">
        <Callout.Root color="grass">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>{t(`sent.${kind}`)}</Callout.Text>
        </Callout.Root>
        <Flex gap="2" justify="end">
          {onClose && (
            <Button type="button" variant="soft" color="gray" onClick={onClose}>
              {t('close')}
            </Button>
          )}
          <Button type="button" variant={onClose ? 'surface' : 'solid'} onClick={onAgain}>
            {t('again')}
          </Button>
        </Flex>
      </Flex>
    );
  }

  const error = state.status === 'error' ? state : null;
  const fieldError = (field: 'url' | 'note') => {
    const code = error?.fields?.[field];
    return code ? t(`fieldError.${code}`) : null;
  };
  const urlError = fieldError('url');
  const noteError = fieldError('note');
  const urlRequired = kind === 'tip';
  const noteRequired = kind === 'correction';

  return (
    <form action={action}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="locale" value={locale} />
      {collab && <input type="hidden" name="collab" value={collab} />}
      {/* 봇 거르기: 사람에게는 보이지 않는 칸 */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <Flex direction="column" gap="4">
        {kind === 'correction' && (
          <Field id={`${id}-note`} label={t('note.correction')} hint={t('noteHint.correction')} error={noteError} required>
            <TextArea
              id={`${id}-note`}
              name="note"
              rows={5}
              required={noteRequired}
              minLength={5}
              maxLength={1000}
              defaultValue={error?.values.note}
              placeholder={t('notePlaceholder.correction')}
              aria-invalid={noteError ? true : undefined}
              aria-describedby={`${id}-note-hint`}
            />
          </Field>
        )}

        <Field id={`${id}-url`} label={t(`url.${kind}`)} hint={t(`urlHint.${kind}`)} error={urlError} required={urlRequired}>
          <TextField.Root
            id={`${id}-url`}
            name="url"
            type="url"
            inputMode="url"
            required={urlRequired}
            maxLength={2000}
            defaultValue={error?.values.url}
            placeholder="https://"
            aria-invalid={urlError ? true : undefined}
            aria-describedby={`${id}-url-hint`}
          />
        </Field>

        {kind === 'tip' && (
          <Field id={`${id}-note`} label={t('note.tip')} hint={t('noteHint.tip')} error={noteError}>
            <TextArea
              id={`${id}-note`}
              name="note"
              rows={4}
              maxLength={1000}
              defaultValue={error?.values.note}
              placeholder={t('notePlaceholder.tip')}
              aria-invalid={noteError ? true : undefined}
              aria-describedby={`${id}-note-hint`}
            />
          </Field>
        )}

        {TURNSTILE_SITE_KEY && <Turnstile siteKey={TURNSTILE_SITE_KEY} locale={locale} />}

        {error && !error.fields && (
          <Callout.Root color="red" size="1" role="alert">
            <Callout.Text>{t(`error.${error.error}`)}</Callout.Text>
          </Callout.Root>
        )}

        <Text size="1" color="gray">
          {t('privacy')}
        </Text>

        <Flex gap="2" justify="end">
          {onClose && (
            <Button type="button" variant="soft" color="gray" onClick={onClose} disabled={pending}>
              {t('cancel')}
            </Button>
          )}
          <Button type="submit" loading={pending}>
            {t('submit')}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  error: string | null;
  required?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations('Report');
  return (
    <Flex direction="column" gap="1">
      <Text as="label" htmlFor={id} size="2" weight="medium">
        {label}
        <Text color="gray" weight="regular">
          {' '}
          {required ? t('required') : t('optional')}
        </Text>
      </Text>
      {children}
      <Text id={`${id}-hint`} size="1" color={error ? 'red' : 'gray'} role={error ? 'alert' : undefined}>
        {error ?? hint}
      </Text>
    </Flex>
  );
}
