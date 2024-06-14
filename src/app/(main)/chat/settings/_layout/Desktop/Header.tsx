'use client';

import { ChatHeader } from '@lobehub/ui';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

import { pathString } from '@/utils/url';

import HeaderContent from '../../features/HeaderContent';

const Header = memo(() => {
  // const { t } = useTranslation('setting');
  const router = useRouter();

  return (
    <ChatHeader
      // left={<ChatHeaderTitle title={t('header.session')} />}
      onBackClick={() => router.push(pathString('/chat', { search: location.search }))}
      right={<HeaderContent />}
      showBackButton
    />
  );
});

export default Header;
