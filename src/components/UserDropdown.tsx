import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../store/store';
import { logout, getUser, fetchTree } from '../store/fsSlice';

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownMenu = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen: boolean; $top?: number; $right?: number }>`
  position: fixed;
  top: ${({ $top }) => $top !== undefined ? `${$top}px` : 'auto'};
  right: ${({ $right }) => $right !== undefined ? `${$right}px` : '8px'};
  margin-top: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,.2);
  min-width: 280px;
  z-index: 2000;
  opacity: ${({ isOpen }) => isOpen ? 1 : 0};
  visibility: ${({ isOpen }) => isOpen ? 'visible' : 'hidden'};
  transform: ${({ isOpen }) => isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease;
  pointer-events: ${({ isOpen }) => isOpen ? 'auto' : 'none'};
  
  /* Десктоп - позиционирование относительно кнопки */
  @media (min-width: 769px) {
    position: fixed;
  }
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    position: fixed;
    top: auto;
    bottom: calc(64px + 8px); /* Выше bottom navigation */
    right: 8px;
    margin-top: 0;
  }
  
  @media (max-width: 480px) {
    bottom: calc(60px + 8px);
    min-width: calc(100vw - 16px);
    max-width: calc(100vw - 16px);
  }
`;

const UserInfo = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const UserName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;

const UserEmail = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const LoadingIndicator = styled.div`
  padding: 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 14px;
`;

const MenuActions = styled.div`
  padding: 8px 0;
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  
  &:active {
    background: ${({ theme }) => theme.colors.border};
  }
`;

const LogoutIcon = styled.span`
  font-size: 16px;
`;

interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ isOpen, onClose, anchorElement }) => {
  const dispatch = useDispatch<any>();
  const { auth } = useSelector((state: RootState) => state.fs);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  // Вычисляем позицию dropdown относительно кнопки аватара
  useEffect(() => {
    if (isOpen) {
      const element = anchorElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    }
  }, [isOpen, anchorElement]);

  // Загружаем актуальные данные пользователя при открытии dropdown
  useEffect(() => {
    if (isOpen && auth.token) {
      dispatch(getUser(auth.token));
    }
  }, [isOpen, auth.token, dispatch]);

  // Автоматически закрываем dropdown при logout
  useEffect(() => {
    if (!auth.isAuthenticated && isOpen) {
      onClose();
    }
  }, [auth.isAuthenticated, isOpen, onClose]);

  // Закрытие при клике вне dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          anchorElement && !anchorElement.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Обновляем позицию при скролле или изменении размера окна
      const updatePosition = () => {
        if (anchorElement) {
          const rect = anchorElement.getBoundingClientRect();
          setPosition({
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right
          });
        }
      };
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorElement]);

  const handleLogout = async () => {
    try {
      if (auth.token) {
        const result = await dispatch(logout(auth.token));
        // Принудительно закрываем dropdown после logout
        onClose();
        // После успешного выхода загружаем публичное дерево (access: 0)
        if (logout.fulfilled.match(result)) {
          dispatch(fetchTree(0));
        }
      }
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  if (!isOpen) return null;

  const dropdownContent = (
    <DropdownMenu 
      ref={dropdownRef}
      isOpen={isOpen}
      $top={position?.top}
      $right={position?.right}
    >
      {auth.loading ? (
        <LoadingIndicator>
          Загрузка данных...
        </LoadingIndicator>
      ) : (
        <>
          <UserInfo>
            <UserName>
              {`${auth.user?.name || ''} ${auth.user?.second_name || ''} ${auth.user?.patronymic || ''}`}
            </UserName>
            <UserEmail>{auth.user?.email || ''}</UserEmail>
          </UserInfo>
          
          <MenuActions>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon></LogoutIcon>
              Выйти
            </MenuItem>
          </MenuActions>
        </>
      )}
    </DropdownMenu>
  );

  // Используем Portal для рендеринга в body на десктопе, чтобы обойти проблемы с z-index
  return typeof document !== 'undefined' 
    ? createPortal(dropdownContent, document.body)
    : dropdownContent;
};
