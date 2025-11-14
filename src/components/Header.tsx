import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { setSearch, setSearchType, uploadFileAPI, searchAPI } from '@/store/fsSlice';
import type { RootState } from '@/store/store';
import type { SearchType } from '@/store/fsSlice';
import logoSrc from '/icon/featherIcon.svg';
import addIcon from '/icon/plus.png';
import uploadIcon from '/icon/download.png';
import themeIcon from '/icon/theme.png';
import userIcon from '/icon/user.png';
import { useEffect, useState, useCallback } from 'react';
import { useThemeMode } from '@/styles/ThemeMode';
import React, { useRef } from 'react';
import { AuthModal } from './AuthModal';
import { UserDropdown } from './UserDropdown';
import { CreateFolderModal } from './CreateFolderModal';
import { Tooltip } from './Tooltip';

const Bar = styled.div`
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  flex-shrink: 0;

  /* Мобильные устройства */
  @media (max-width: 768px) {
    padding: 0 12px;
    gap: 8px;
    flex-wrap: nowrap;
    min-width: 0;
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    height: 50px;
    padding: 0 8px;
    gap: 6px;
    flex-wrap: nowrap;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 16px;
  flex-shrink: 0;
  min-width: 0;
  
  @media (max-width: 480px) {
    gap: 8px;
    margin-right: 8px;
  }
`;

const Logo = styled.img`
  width: 24px;
  height: 24px;
  display: block;
`;

const BrandTitle = styled.div`
  font-weight: 500;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  
  @media (max-width: 480px) {
    font-size: 15px;
    display: none;
  }
`;

const SearchContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
  
  @media (max-width: 768px) {
    gap: 8px;
    min-width: 0;
  }

  @media (max-width: 480px) {
    gap: 6px;
    min-width: 0;
  }
`;

const SearchToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    gap: 6px;
  }
  
  @media (max-width: 480px) {
    gap: 4px;
  }
`;

const SearchToggleSwitch = styled.button<{ $active: boolean }>`
  position: relative;
  width: 40px;
  height: 20px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) => 
    $active ? theme.colors.primary : theme.colors.surfaceAlt};
  cursor: pointer;
  transition: background-color 0.2s ease;
  outline: none;
  padding: 0;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $active }) => $active ? '18px' : '2px'};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s ease;
  }
  
  @media (max-width: 768px) {
    width: 42px;
    height: 24px;
    
    &::after {
      width: 18px;
      height: 18px;
      left: ${({ $active }) => $active ? '20px' : '2px'};
    }
  }
  
  @media (max-width: 480px) {
    width: 38px;
    height: 22px;
    
    &::after {
      width: 16px;
      height: 16px;
      left: ${({ $active }) => $active ? '18px' : '2px'};
    }
  }
`;

const SearchToggleText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
  white-space: nowrap;
  min-width: fit-content;
  
  @media (max-width: 768px) {
    font-size: 11px;
    display: none;
  }
  
  @media (max-width: 480px) {
    display: none;
  }
`;

const Search = styled.input`
  flex: 1;
  height: 32px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  &:focus { 
    border-color: ${({ theme }) => theme.colors.primary}; 
    background: ${({ theme }) => theme.colors.surface};
  }

  /* Мобильные устройства */
  @media (max-width: 768px) {
    height: 32px;
    padding: 0 12px;
    font-size: 14px;
    min-width: 0;
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    height: 30px;
    padding: 0 10px;
    font-size: 13px;
    min-width: 0;
  }
`;

const Button = styled.button`
  height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  
  .button-text {
    white-space: nowrap;
  }
  
  &:hover { 
    background: ${({ theme }) => theme.colors.primaryAccent};
  }
  &:active { 
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Скрываем на мобильных */
  @media (max-width: 768px) {
    &.desktop-only {
      display: none;
    }
  }
`;

const GrayButton = styled.button`
  height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  
  .button-text {
    white-space: nowrap;
  }
  
  &:hover { 
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  }
  &:active { 
    opacity: 0.8;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Скрываем на мобильных */
  @media (max-width: 768px) {
    &.desktop-only {
      display: none;
    }
  }
`;

const Icon = styled.img`
  width: 16px;
  height: 16px;
  filter: brightness(0) invert(1);
`;

const GrayIcon = styled.img`
  width: 16px;
  height: 16px;
  filter: none;
  opacity: 0.7;
`;

const UserIcon = styled.img`
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: brightness(0) invert(1);
`;

const Toggle = styled.button`
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  &:active {
    opacity: 0.8;
  }
  
  /* Скрываем на мобильных */
  @media (max-width: 768px) {
    &.desktop-only {
      display: none;
    }
  }
`;

const UploadModalBg = styled.div`
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,.4);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const UploadModal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
  border-radius: 6px;
  padding: 20px;
  min-width: 400px;
  max-width: 90vw;
  position: relative;
  display: flex; 
  flex-direction: column; 
  gap: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;
const UploadTitle = styled.div`
  font-weight: 500;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;
const UploadActions = styled.div`
  display: flex; 
  gap: 8px; 
  justify-content: flex-end;
  margin-top: 4px;
`;

const UploadCancelButton = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: background-color 0.15s ease;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  }
  
  &:active:not(:disabled) {
    opacity: 0.8;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UploadSubmitButton = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: background-color 0.15s ease;
  min-width: 120px;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryAccent};
  }
  
  &:active:not(:disabled) {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
const UploadError = styled.div`
  color: ${({ theme }) => theme.colors.danger}; 
  font-size: 13px;
  margin-top: 4px;
`;
const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 16px;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FileField = styled.input`
  font-size: 14px; 
  display: block;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  width: 100%;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  flex-shrink: 0;
  min-width: 0;

  /* Мобильные устройства */
  @media (max-width: 768px) {
    gap: 8px;
    flex-shrink: 0;
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    gap: 6px;
    flex-shrink: 0;
  }
`;

const MenuButton = styled.button`
  display: none;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  border: none;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  
  &:active {
    opacity: 0.8;
  }

  /* Показываем только на мобильных */
  @media (max-width: 768px) {
    display: flex;
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    width: 30px;
    height: 30px;
  }
`;

const Avatar = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: darkblue;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 500;
  transition: background-color 0.15s ease;
  
  &:hover {
    background: #000075;
  }
  
  &:active {
    opacity: 0.9;
  }
`;


interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  uploadOpen?: boolean;
  setUploadOpen?: (open: boolean) => void;
  authOpen?: boolean;
  setAuthOpen?: (open: boolean) => void;
}

export function Header({ 
  sidebarOpen, 
  setSidebarOpen,
  uploadOpen: externalUploadOpen,
  setUploadOpen: externalSetUploadOpen,
  authOpen: externalAuthOpen,
  setAuthOpen: externalSetAuthOpen
}: HeaderProps) {
  const dispatch: any = useDispatch();
  const search = useSelector((s: RootState) => s.fs.search);
  const searchType = useSelector((s: RootState) => s.fs.searchType);
  const selectedFolderId = useSelector((s: RootState) => s.fs.selectedFolderId);
  const { mode, toggle } = useThemeMode();
  const { auth } = useSelector((s: RootState) => s.fs);
  
  // Используем внешние состояния если они переданы, иначе внутренние
  const [internalUploadOpen, setInternalUploadOpen] = useState(false);
  const [internalAuthOpen, setInternalAuthOpen] = useState(false);
  
  const uploadOpen = externalUploadOpen !== undefined ? externalUploadOpen : internalUploadOpen;
  const setUploadOpen = externalSetUploadOpen || setInternalUploadOpen;
  const authOpen = externalAuthOpen !== undefined ? externalAuthOpen : internalAuthOpen;
  const setAuthOpen = externalSetAuthOpen || setInternalAuthOpen;
  
  // Принудительно закрываем dropdown при logout
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) {
      setUserDropdownOpen(false);
      // Принудительно обновляем состояние для перерисовки
      setAuthOpen(false);
    }
  }, [auth.isAuthenticated, auth.token, setAuthOpen]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadAccess, setUploadAccess] = useState<0 | 1>(1);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarRef = useRef<HTMLButtonElement | null>(null);

  // Debounced функция для поиска (только для AI поиска)
  const handleSearchChange = useCallback((value: string) => {
    dispatch(setSearch(value));
    
    // Для AI поиска делаем debounced запрос к серверу
    if (searchType === 'ai') {
      // Очищаем предыдущий таймер
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Если запрос пустой, сразу очищаем результаты
      if (!value || value.trim().length === 0) {
        return;
      }
      
      // Устанавливаем новый таймер для debounce (500ms)
      searchTimeoutRef.current = setTimeout(() => {
        dispatch(searchAPI(value));
      }, 500);
    }
  }, [dispatch, searchType]);

  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const onChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setUploadError(null);
  };
  const onUpload = async () => {
    setUploadError(null);
    if (!file) { setUploadError('Выберите файл'); return; }
    if (!/\.(pdf|md)$/i.test(file.name)) {
      setUploadError('Можно загрузить только PDF или MD'); return;
    }
    setUploading(true);
    try {
      await dispatch(uploadFileAPI({ file, parentId: selectedFolderId, access: uploadAccess }));
      setUploadOpen(false); 
      setFile(null);
      setUploadAccess(1); // Сбрасываем на значение по умолчанию
    } catch (e: any) {
      setUploadError(e?.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  return (
    <Bar>
      <Brand>
        <Logo src={logoSrc} alt="logo" />
        <BrandTitle>Wiki</BrandTitle>
      </Brand>
      <SearchContainer>
        <Search
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={searchType === 'local' ? 'Поиск по названию...' : 'AI поиск по контексту...'}
        />
        <SearchToggleWrapper>
          <Tooltip text={searchType === 'local' ? 'Переключить на AI поиск' : 'Переключить на поиск по названию'}>
            <SearchToggleSwitch
              $active={searchType === 'ai'}
              onClick={() => dispatch(setSearchType(searchType === 'local' ? 'ai' : 'local'))}
              aria-label={searchType === 'local' ? 'Переключить на AI поиск' : 'Переключить на поиск по названию'}
            />
          </Tooltip>
          <SearchToggleText>
            {searchType === 'local' ? 'Название' : 'AI'}
          </SearchToggleText>
        </SearchToggleWrapper>
      </SearchContainer>
      {auth.isAuthenticated && auth.token && (
        <>
          <Tooltip text="Создать папку">
            <GrayButton
              onClick={() => setShowCreateFolderModal(true)}
              className="desktop-only"
            >
              <GrayIcon src={addIcon} alt="Создать папку" />
              <span className="button-text">Создать папку</span>
            </GrayButton>
          </Tooltip>
          <Tooltip text="Загрузить файл">
            <GrayButton
              onClick={() => setUploadOpen(true)}
              className="desktop-only"
            >
              <GrayIcon src={uploadIcon} alt="Загрузить файл" />
              <span className="button-text">Загрузить файл</span>
            </GrayButton>
          </Tooltip>
        </>
      )}
        <Tooltip text="Сменить тему">
          <Toggle onClick={toggle} className="desktop-only">
            <Icon src={themeIcon} alt="Тема" style={{ filter: 'none', width: '18px', height: '18px' }} />
          </Toggle>
        </Tooltip>
        
        <Actions>
          <Tooltip text="Меню">
            <MenuButton onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </MenuButton>
          </Tooltip>
          
          <Avatar 
            ref={(el) => {
              if (el) avatarRef.current = el;
            }}
            key={auth.isAuthenticated && auth.token ? 'authenticated' : 'not-authenticated'}
            onClick={() => {
              if (auth.user && auth.isAuthenticated && auth.token) {
                setUserDropdownOpen(!userDropdownOpen);
              } else {
                setAuthOpen(true);
              }
            }} 
            title={auth.user && auth.isAuthenticated && auth.token ? `${auth.user.name} ${auth.user.second_name}` : 'Войти'}
          >
            {auth.user && auth.isAuthenticated && auth.token ? auth.user.name.charAt(0).toUpperCase() : <UserIcon src={userIcon} alt="Пользователь" />}
          </Avatar>
          {auth.user && auth.isAuthenticated && auth.token && (
            <UserDropdown 
              key={`dropdown-${auth.isAuthenticated}`}
              isOpen={userDropdownOpen} 
              onClose={() => setUserDropdownOpen(false)}
              anchorElement={avatarRef.current}
            />
          )}
        </Actions>
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        parentId={selectedFolderId}
      />
      {uploadOpen && (
        <UploadModalBg onClick={() => !uploading && setUploadOpen(false)}>
          <UploadModal onClick={e => e.stopPropagation()}>
            <UploadTitle>Загрузка файла</UploadTitle>
            <FileField
              type="file"
              accept=".md,.pdf"
              ref={fileInput}
              disabled={uploading}
              onChange={onChooseFile}
            />
            {file && <div style={{fontSize:13, color: 'inherit', opacity: 0.7, marginBottom: '12px'}}>Файл: {file.name}</div>}
            <Select
              value={uploadAccess}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadAccess(Number(e.target.value) as 0 | 1)}
              disabled={uploading}
            >
              <option value={1}>Приватный (1)</option>
              <option value={0}>Публичный (0)</option>
            </Select>
            {uploadError && <UploadError>{uploadError}</UploadError>}
            <UploadActions>
              <UploadCancelButton 
                disabled={uploading} 
                onClick={()=>{
                  if(!uploading) {
                    setUploadOpen(false);
                    setFile(null);
                    setUploadAccess(1);
                  }
                }}
              >
                Отмена
              </UploadCancelButton>
              <UploadSubmitButton
                type="button"
                disabled={uploading}
                onClick={onUpload}
              >
                {uploading ? '⏳ Загрузка...' : 'Загрузить'}
              </UploadSubmitButton>
            </UploadActions>
          </UploadModal>
        </UploadModalBg>
      )}
      
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </Bar>
  );
}


