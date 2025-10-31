import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { fetchTree, getUser } from '@/store/fsSlice';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Preview } from '@/components/Preview';
import { MobileBottomNav } from '@/components/MobileBottomNav';

const Layout = styled.div`
  display: grid;
  grid-template-rows: 60px 1fr;
  grid-template-columns: 320px 1fr;
  grid-template-areas:
    'header header'
    'sidebar content';
  height: 100vh;
  width: 100vw;
  max-width: 100vw;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  /* Мобильные устройства */
  @media (max-width: 768px) {
    grid-template-rows: 60px 1fr;
    grid-template-columns: 1fr;
    grid-template-areas:
      'header'
      'content';
    min-width: 0;
    width: 100%;
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    grid-template-rows: 50px 1fr;
  }
`;

const HeaderArea = styled.header`
  grid-area: header;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  position: relative;
  z-index: 100;
`;

const SidebarArea = styled.aside<{ $sidebarOpen: boolean }>`
  grid-area: sidebar;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  overflow: auto;

  /* Мобильные устройства */
  @media (max-width: 768px) {
    position: fixed;
    top: 60px;
    left: 0;
    width: 280px;
    height: calc(100vh - 60px);
    z-index: 1000;
    transform: ${({ $sidebarOpen }) => $sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'};
    transition: transform 0.3s ease;
    box-shadow: 2px 0 8px rgba(0,0,0,.1);
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    top: 50px;
    height: calc(100vh - 50px);
    width: 260px;
  }
`;

const ContentArea = styled.main`
  grid-area: content;
  background: ${({ theme }) => theme.colors.surface};
  overflow: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 100%;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    padding-bottom: 64px; /* Место для bottom navigation */
  }
  
  @media (max-width: 480px) {
    padding-bottom: 60px;
  }
`;

const MobileOverlay = styled.div<{ $sidebarOpen: boolean }>`
  display: none;
  
  /* Показываем overlay на мобильных */
  @media (max-width: 768px) {
    display: ${({ $sidebarOpen }) => $sidebarOpen ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,.5);
    z-index: 999;
  }
`;

export default function App() {
  const dispatch = useDispatch();
  const { loading, error, auth } = useSelector((s: RootState) => s.fs);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Функция для открытия модального окна загрузки
  // Передадим эту функцию через ref или создадим контекст
  // Пока что создадим простой способ через событие или состояние
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <Layout>
      <HeaderArea>
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          uploadOpen={showUploadModal}
          setUploadOpen={setShowUploadModal}
          authOpen={showAuthModal}
          setAuthOpen={setShowAuthModal}
        />
      </HeaderArea>
      <MobileOverlay $sidebarOpen={sidebarOpen} onClick={() => setSidebarOpen(false)} />
      <SidebarArea $sidebarOpen={sidebarOpen}>
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
      <MobileBottomNav 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onUploadClick={() => setShowUploadModal(true)}
      />
    </Layout>
  );
}


