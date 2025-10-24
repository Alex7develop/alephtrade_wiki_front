import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../store/store';
import { logout, getUser } from '../store/fsSlice';

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownMenu = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,.15);
  min-width: 280px;
  z-index: 1000;
  opacity: ${({ isOpen }) => isOpen ? 1 : 0};
  visibility: ${({ isOpen }) => isOpen ? 'visible' : 'hidden'};
  transform: ${({ isOpen }) => isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease;
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
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<any>();
  const { auth } = useSelector((state: RootState) => state.fs);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    try {
      if (auth.token) {
        await dispatch(logout(auth.token));
        // Принудительно закрываем dropdown после logout
        onClose();
      }
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  return (
    <DropdownContainer ref={dropdownRef} key={auth.isAuthenticated ? 'authenticated' : 'not-authenticated'}>
      <DropdownMenu isOpen={isOpen}>
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
    </DropdownContainer>
  );
};
