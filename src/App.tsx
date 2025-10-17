import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { fetchTree } from '@/store/fsSlice';
import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { FilesList } from '@/components/FilesList';
import { Preview } from '@/components/Preview';

const Layout = styled.div`
  display: grid;
  grid-template-rows: 64px 1fr 56px;
  /* Уменьшаем Files, увеличиваем Preview */
  grid-template-columns: 280px 0.6fr 16px 1.4fr;
  grid-template-areas:
    'header header header header'
    'sidebar files divider preview'
    'footer footer footer footer';
  height: 100vh;
`;

const HeaderArea = styled.header`
  grid-area: header;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: linear-gradient(180deg, ${({ theme }) => theme.colors.surfaceAlt}, ${({ theme }) => theme.colors.surface});
  box-shadow: 0 1px 0 rgba(255,255,255,.04) inset, 0 4px 12px rgba(0,0,0,.18);
`;

const SidebarArea = styled.aside`
  grid-area: sidebar;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  overflow: auto;
`;

const FilesArea = styled.section`
  grid-area: files;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  overflow: auto;
`;

const DividerArea = styled.div`
  grid-area: divider;
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const PreviewArea = styled.main`
  grid-area: preview;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  overflow: auto;
`;

const FooterArea = styled.footer`
  grid-area: footer;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 14px;
`;

export default function App() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s: RootState) => s.fs);

  useEffect(() => {
    dispatch(fetchTree() as any);
  }, [dispatch]);

  return (
    <Layout>
      <HeaderArea>
        <Header />
      </HeaderArea>
      <SidebarArea>
        {loading ? 'Загрузка...' : <Sidebar />}
      </SidebarArea>
      <FilesArea>
        {error ? <div style={{ padding: 16, color: '#f88' }}>Ошибка: {error}</div> : <FilesList />}
      </FilesArea>
      <DividerArea />
      <PreviewArea>
        <Preview />
      </PreviewArea>
      <FooterArea>
        Все права защищены © 2025
      </FooterArea>
    </Layout>
  );
}


