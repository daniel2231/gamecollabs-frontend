'use client';

import { AlertDialog, Button, Callout, Flex } from '@radix-ui/themes';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

/** 탈퇴 버튼: 확인 창에서 한 번 더 묻고 /api/me/delete로 폼을 보낸다 */
export function DeleteAccount({ failed }: { failed: boolean }) {
  const t = useTranslations('Member.accountPage');
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  return (
    <Flex direction="column" gap="3" align="start">
      {failed && (
        <Callout.Root color="red" size="1" role="alert">
          <Callout.Text>{t('deleteFailed')}</Callout.Text>
        </Callout.Root>
      )}
      <AlertDialog.Root>
        <AlertDialog.Trigger>
          <Button color="red" variant="soft">
            {t('delete')}
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>{t('deleteConfirmTitle')}</AlertDialog.Title>
          <AlertDialog.Description size="2">{t('deleteConfirm')}</AlertDialog.Description>
          <form method="post" action="/api/me/delete" onSubmit={() => setPending(true)}>
            <input type="hidden" name="locale" value={locale} />
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray" type="button">
                  {t('cancel')}
                </Button>
              </AlertDialog.Cancel>
              <Button color="red" type="submit" loading={pending}>
                {t('deleteNow')}
              </Button>
            </Flex>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  );
}
