import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { fetchTree, getUser } from '@/store/fsSlice';
import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Preview } from '@/components/Preview';

const Layout = styled.div`
  display: grid;
  grid-template-rows: 60px 1fr;
  grid-template-columns: 320px 1fr;
  grid-template-areas:
    'header header'
    'sidebar content';
  height: 100vh;
`;

const HeaderArea = styled.header`
  grid-area: header;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
`;

const SidebarArea = styled.aside`
  grid-area: sidebar;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  overflow: auto;
`;

const ContentArea = styled.main`
  grid-area: content;
  background: ${({ theme }) => theme.colors.surface};
  overflow: auto;
  display: flex;
  flex-direction: column;
`;

export default function App() {
  const dispatch = useDispatch();
  const { loading, error, auth } = useSelector((s: RootState) => s.fs);

  useEffect(() => {
    dispatch(fetchTree() as any);
  }, [dispatch]);

  // Восстанавливаем авторизацию при загрузке приложения
  useEffect(() => {
    if (auth.token && !auth.user) {
      // Если есть токен, но нет данных пользователя, загружаем их
      dispatch(getUser(auth.token) as any);
    }
  }, [auth.token, auth.user, dispatch]);

  return (
    <Layout>
      <HeaderArea>
        <Header />
      </HeaderArea>
      <SidebarArea>
        {loading ? 'Загрузка...' : <Sidebar />}
      </SidebarArea>
      <ContentArea>
        {error ? (
          <div style={{ padding: 24, color: '#f88', textAlign: 'center' }}>
            Ошибка: {error}
          </div>
        ) : (
          <Preview />
        )}
      </ContentArea>
    </Layout>
  );
}


