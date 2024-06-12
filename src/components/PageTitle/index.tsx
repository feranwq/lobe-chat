import { memo, useEffect } from 'react';

const PageTitle = memo<{ title: string }>(({ title }) => {
  useEffect(() => {
    document.title = title ? `${title} · Log.AI` : 'Log.AI';
  }, [title]);

  return null;
});

export default PageTitle;
