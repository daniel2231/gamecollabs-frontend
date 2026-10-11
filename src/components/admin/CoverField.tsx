'use client';

import { ExclamationTriangleIcon, ImageIcon, InfoCircledIcon, TrashIcon, UploadIcon } from '@radix-ui/react-icons';
import { Button, Callout, Flex, Spinner, Text, TextField } from '@radix-ui/themes';
import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { coverFit, COVER_MAX_EDGE, fitWithin, imageUrlFromTransfer } from '@/lib/cover';
import type { AdminCover, UploadedMedia } from '@/schema';

/** 브라우저에서 고를 수 있는 원본 상한. 줄인 뒤 보내므로 넉넉하게 둔다 */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

type Props = {
  /** undefined: 백엔드가 현재 커버를 알려주지 않음(그대로 두면 기존 값 유지) */
  value: AdminCover | null | undefined;
  onChange: (cover: AdminCover | null) => void;
};

/** 긴 변 1600px 이하로 줄여 WebP(안 되면 JPEG)로 다시 인코딩한다 */
async function prepare(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (!ACCEPT.split(',').includes(file.type)) throw new Error('JPEG·PNG·WebP 이미지만 올릴 수 있습니다');
  if (file.size > MAX_INPUT_BYTES) throw new Error('원본이 너무 큽니다(25MB 이하)');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('이미지를 읽지 못했습니다');
  });
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 처리하지 못했습니다');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // WebP 인코딩을 못 하는 브라우저는 PNG를 돌려주므로 형식을 확인하고 JPEG로 바꾼다
  let blob = await encode('image/webp', 0.85);
  if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', 0.88);
  if (!blob) throw new Error('이미지를 변환하지 못했습니다');
  return { blob, width, height };
}

/** 다른 사이트 이미지는 브라우저에서 읽을 수 없으니(CORS) <img>로 불러 크기만 잰다 */
function measure(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다. 이미지 주소가 아니거나 사이트가 막고 있으면, 내려받아 파일로 올려 주세요.'));
    img.src = url;
  });
}

async function upload(blob: Blob, width: number, height: number): Promise<UploadedMedia> {
  const body = new FormData();
  body.set('file', new File([blob], blob.type === 'image/webp' ? 'cover.webp' : 'cover.jpg', { type: blob.type }));
  body.set('width', String(width));
  body.set('height', String(height));
  const res = await fetch('/api/admin/media', { method: 'POST', body });
  const json = (await res.json().catch(() => null)) as { ok: true; data: UploadedMedia } | { ok: false; error: { message: string } } | null;
  if (!json?.ok) throw new Error(json?.error.message ?? `업로드하지 못했습니다 (${res.status})`);
  return json.data;
}

/** 커버 이미지: 끌어다 놓기·클릭·붙여넣기로 올리고, 카드와 같은 16:9로 미리 본다 */
export function CoverField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<{ preview: string; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 업로드가 끝났을 때 그사이 입력한 출처·대체 텍스트를 덮어쓰지 않도록 최신 값을 본다
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });

  // 영역 밖에 떨어뜨린 파일·이미지를 브라우저가 열어 버리면 저장 안 한 편집이 날아간다.
  // 입력란에 주소를 끌어다 놓는 것(출처 URL 등)은 그대로 둔다
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => {
      if ((e.target as Element | null)?.closest?.('input, textarea, [contenteditable="true"]')) return;
      const types = e.dataTransfer?.types ?? [];
      if (types.includes('Files') || types.includes('text/uri-list')) e.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  async function handle(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    let prepared: Awaited<ReturnType<typeof prepare>>;
    try {
      prepared = await prepare(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지를 처리하지 못했습니다');
      return;
    }
    const preview = URL.createObjectURL(prepared.blob);
    const creditAtStart = latest.current?.credit ?? '';
    setBusy({ preview, width: prepared.width, height: prepared.height });
    try {
      const media = await upload(prepared.blob, prepared.width, prepared.height);
      const current = latest.current;
      // 새 이미지의 출처는 새로 적어야 하므로 이전 이미지의 출처는 비운다(업로드 중에 새로 적었으면 둔다).
      // 대체 텍스트는 콜라보 설명인 경우가 많아 남긴다
      onChange({
        storageKey: media.storageKey,
        url: media.url,
        originalUrl: null,
        credit: current && current.credit !== creditAtStart ? current.credit : '',
        alt: current?.alt ?? { ko: '', en: '' },
        width: media.width,
        height: media.height,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드하지 못했습니다');
    } finally {
      setBusy(null);
      URL.revokeObjectURL(preview);
    }
  }

  /**
   * 다른 웹페이지의 이미지: data: 주소면 파일로 바꿔 올리고, http(s) 주소면 원본 주소로 두고
   * 저장할 때 백엔드가 우리 저장소로 복사한다(브라우저는 다른 사이트 이미지를 읽을 수 없다)
   */
  async function handleUrl(url: string) {
    if (busy) return;
    setError(null);
    if (url.startsWith('data:')) {
      const blob = await fetch(url).then((r) => r.blob()).catch(() => null);
      if (!blob) return setError('이미지를 읽지 못했습니다');
      return handle(new File([blob], 'dropped', { type: blob.type }));
    }
    setBusy({ preview: url, width: 0, height: 0 });
    try {
      const size = await measure(url);
      const current = latest.current;
      onChange({
        storageKey: null,
        url,
        originalUrl: url,
        credit: '',
        alt: current?.alt ?? { ko: '', en: '' },
        width: size.width,
        height: size.height,
        mirrorError: null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지를 불러오지 못했습니다');
    } finally {
      setBusy(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
    if (file) return void handle(file);
    const url = imageUrlFromTransfer({
      html: e.dataTransfer.getData('text/html'),
      uriList: e.dataTransfer.getData('text/uri-list'),
      text: e.dataTransfer.getData('text/plain'),
    });
    if (url) return void handleUrl(url);
    setError('이미지를 찾지 못했습니다. 이미지 파일이나 웹페이지의 이미지를 끌어다 놓으세요.');
  }

  function onPaste(e: ClipboardEvent) {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      return void handle(file);
    }
    // 이미지 주소를 복사해 붙여넣은 경우
    const url = imageUrlFromTransfer({ html: e.clipboardData.getData('text/html'), text: e.clipboardData.getData('text/plain') });
    if (!url) return;
    e.preventDefault();
    void handleUrl(url);
  }

  const shown = busy ? { url: busy.preview, width: busy.width, height: busy.height } : value;
  const set = (patch: Partial<AdminCover>) => value && onChange({ ...value, ...patch });

  return (
    <Flex direction="column" gap="3">
      {value === undefined && (
        <Callout.Root color="gray" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            백엔드가 아직 관리자 응답에 커버 정보를 주지 않아 현재 커버를 보여줄 수 없습니다. 새 이미지를 올리면 교체되고, 그대로 두면
            기존 커버가 유지됩니다.
          </Callout.Text>
        </Callout.Root>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label={value ? '커버 이미지 교체' : '커버 이미지 올리기'}
        aria-describedby={helpId}
        aria-busy={Boolean(busy)}
        className="ct-dropzone"
        data-filled={shown ? '' : undefined}
        data-over={over ? '' : undefined}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!busy) inputRef.current?.click();
          }
        }}
        onPaste={onPaste}
        onDragEnter={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
        }}
        onDrop={onDrop}
      >
        {shown ? (
          <img src={shown.url} alt="" data-fit={coverFit(shown)} referrerPolicy="no-referrer" />
        ) : over ? null : (
          <Flex direction="column" align="center" gap="2" p="4">
            <ImageIcon width="28" height="28" aria-hidden="true" />
            <Text size="2" weight="medium">
              이미지를 끌어다 놓거나 클릭해서 고르세요
            </Text>
          </Flex>
        )}
        {(busy || over) && (
          <div className="ct-dropzone-overlay" aria-hidden="true">
            {busy ? (
              <Flex align="center" gap="2">
                <Spinner /> {busy.width ? '업로드 중…' : '이미지 불러오는 중…'}
              </Flex>
            ) : (
              <Flex align="center" gap="2">
                <UploadIcon /> 놓으면 올립니다
              </Flex>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          void handle(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <Text id={helpId} size="1" color="gray">
        JPEG·PNG·WebP 파일이나 다른 웹페이지의 이미지를 끌어다 놓으세요. 영역을 선택한 뒤 이미지나 이미지 주소를 붙여넣어도(Ctrl+V) 됩니다. 긴 변 {COVER_MAX_EDGE}px 이하 WebP로 줄여 올리고, 카드에서는 16:9로
        보입니다.
        {value?.width && value.height && (
          <>
            {' '}
            현재 {value.width}×{value.height}
            {coverFit(value) === 'contain' && ' · 16:9와 비율이 많이 달라 카드에서는 잘리지 않게 전체를 맞춰 보여줍니다'}
          </>
        )}
      </Text>

      {error && (
        <Callout.Root color="red" size="1" role="alert">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {value && (
        <>
          {!value.storageKey && value.originalUrl && (
            <Callout.Root color="amber" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                {value.mirrorError
                  ? `원본 이미지를 우리 저장소로 복사하지 못했습니다(${value.mirrorError}). 원본 링크로만 보이므로, 원본이 지워지면 사라집니다. 이미지를 내려받아 파일로 올려 주세요.`
                  : '다른 사이트의 이미지 주소입니다. 저장하면 우리 저장소로 복사합니다. 출처 표기를 꼭 적어 주세요.'}
              </Callout.Text>
            </Callout.Root>
          )}
          <div className="ct-two">
            <Text as="label" className="ct-field">
              <span className="ct-label">출처 표기 (credit)</span>
              <TextField.Root value={value.credit} maxLength={120} placeholder="예: © Blizzard Entertainment" onChange={(e) => set({ credit: e.target.value })} />
            </Text>
            <div className="ct-field">
              <span className="ct-label">원본 주소</span>
              <Text size="2" color="gray" style={{ wordBreak: 'break-all' }}>
                {value.originalUrl ? (
                  <a href={value.originalUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-11)' }}>
                    {value.originalUrl}
                  </a>
                ) : (
                  '직접 올린 이미지'
                )}
              </Text>
            </div>
            <Text as="label" className="ct-field">
              <span className="ct-label">대체 텍스트 (한국어)</span>
              <TextField.Root value={value.alt.ko} maxLength={300} placeholder="비우면 제목을 씁니다" onChange={(e) => set({ alt: { ...value.alt, ko: e.target.value } })} />
            </Text>
            <Text as="label" className="ct-field">
              <span className="ct-label">Alt text (English)</span>
              <TextField.Root value={value.alt.en} maxLength={300} placeholder="Falls back to the title" onChange={(e) => set({ alt: { ...value.alt, en: e.target.value } })} />
            </Text>
          </div>
          {(value.alt.ko.trim() === '') !== (value.alt.en.trim() === '') && (
            <Text size="1" color="amber">
              대체 텍스트는 한·영을 모두 채워야 저장됩니다. 한쪽만 있으면 둘 다 비운 것으로 저장됩니다.
            </Text>
          )}
          <div>
            <Button variant="soft" color="red" size="2" onClick={() => onChange(null)} disabled={Boolean(busy)}>
              <TrashIcon /> 커버 제거
            </Button>
          </div>
        </>
      )}
    </Flex>
  );
}
