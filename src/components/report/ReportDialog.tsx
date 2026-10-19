'use client';

import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Button, Dialog } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ReportForm } from './ReportForm';

/** 상세 페이지의 “오류 제보”: 이 콜라보에서 틀린 내용을 적어 보내는 대화상자 */
export function ReportDialog({ collab, title }: { collab: string; title: string }) {
  const t = useTranslations('Report');
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button variant="surface" color="gray" size="2" style={{ whiteSpace: 'nowrap' }}>
          <ExclamationTriangleIcon />
          {t('open')}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>{t('dialogTitle')}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {t('dialogDescription', { title })}
        </Dialog.Description>
        {/* 닫았다 열면 빈 폼부터: 대화상자가 닫히면 내용이 언마운트된다 */}
        <ReportForm kind="correction" collab={collab} onClose={() => setOpen(false)} />
      </Dialog.Content>
    </Dialog.Root>
  );
}
