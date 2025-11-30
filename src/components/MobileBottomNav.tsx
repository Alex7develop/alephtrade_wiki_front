import styled from 'styled-components';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { useThemeMode } from '@/styles/ThemeMode';
import homeIcon from '/icon/home.png';
import cloudIcon from '/icon/cloud.png';
import themeIcon from '/icon/theme.png';

const Nav = styled.nav`
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 100vw;
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom, 0);
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
  overflow: hidden;
  
  /* Показываем только на мобильных */
  @media (max-width: 768px) {
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: calc(64px + env(safe-area-inset-bottom, 0px));
    min-height: 64px;
  }
  
  @media (max-width: 480px) {
    height: calc(60px + env(safe-area-inset-bottom, 0px));
    min-height: 60px;
  }
`;

const NavButton = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
  font-size: 10px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  transition: all 0.2s ease;
  padding: 8px 4px;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  
  &:active {
    transform: scale(0.95);
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  
  @media (max-width: 480px) {
    font-size: 9px;
    gap: 2px;
    padding: 6px 2px;
  }
`;

const Icon = styled.img<{ $active?: boolean }>`
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: ${({ $active }) => ($active ? 1 : 0.6)};
  transition: opacity 0.2s ease;
  
  @media (max-width: 480px) {
    width: 22px;
    height: 22px;
  }
`;

const Label = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  font-size: 10px;
  
  @media (max-width: 480px) {
    font-size: 9px;
  }
`;

interface MobileBottomNavProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onUploadClick: () => void;
}

export function MobileBottomNav({ 
  sidebarOpen, 
  setSidebarOpen, 
  onUploadClick
}: MobileBottomNavProps) {
  const { toggle: toggleTheme } = useThemeMode();
  const auth = useSelector((s: RootState) => s.fs.auth);
  
  // Проверяем, можно ли показывать кнопку загрузки
  // Показываем только если пользователь авторизован И имеет уровень доступа access: 2
  const canUpload = auth.isAuthenticated && auth.user && auth.user.access === 2;
  
  // Обработчик для кнопки "Меню" - открывает/закрывает sidebar
  const handleMenu = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Обработчик для кнопки "Загрузить файл" - загрузка файла
  const handleUpload = () => {
    onUploadClick();
  };
  
  // Обработчик для кнопки "Тема" - смена темы
  const handleTheme = () => {
    toggleTheme();
  };
  
  return (
    <Nav>
      <NavButton $active={sidebarOpen} onClick={handleMenu} title="Меню с деревом файлов">
        <Icon src={homeIcon} alt="Главная" $active={sidebarOpen} />
        <Label>Меню</Label>
      </NavButton>
      
      {canUpload && (
        <NavButton onClick={handleUpload} title="Загрузить файл">
          <Icon src={cloudIcon} alt="Загрузить файл" />
          <Label>Загрузить файл</Label>
        </NavButton>
      )}
      
      <NavButton onClick={handleTheme} title="Сменить тему">
        <Icon src={themeIcon} alt="Сменить тему" />
        <Label>Тема</Label>
      </NavButton>
    </Nav>
  );
}

