import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { setSearch, setSearchType, uploadFileAPI, searchAPI } from '@/store/fsSlice';
import type { RootState } from '@/store/store';
import type { SearchType } from '@/store/fsSlice';
import logoSrc from '/icon/featherIcon.svg';
import addIcon from '/icon/add_11891531.png';
import uploadIcon from '/icon/file_4970405.png';
import themeIcon from '/icon/icons8-день-и-ночь-50.png';
import { useEffect, useState, useCallback } from 'react';
import { useThemeMode } from '@/styles/ThemeMode';
import React, { useRef } from 'react';
import { AuthModal } from './AuthModal';
import { UserDropdown } from './UserDropdown';
import { CreateFolderModal } from './CreateFolderModal';

const Bar = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
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
  width: 32px;
  height: 32px;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,.1));
`;

const BrandTitle = styled.div`
  font-weight: 600;
  font-size: 20px;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.01em;
  white-space: nowrap;
  
  @media (max-width: 480px) {
    font-size: 18px;
    display: none; /* Скрываем на очень маленьких экранах */
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
  width: 48px;
  height: 28px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) => 
    $active ? theme.colors.primary : theme.colors.surfaceAlt};
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
  padding: 0;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(90,90,90,0.1);
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(90,90,90,0.15);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $active }) => $active ? '22px' : '2px'};
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    border: 1px solid ${({ theme }) => theme.colors.border};
    transition: left 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
  height: 36px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  padding: 0 16px;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  &:focus { 
    border-color: ${({ theme }) => theme.colors.primary}; 
    box-shadow: 0 0 0 3px rgba(90,90,90,.1); 
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
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  
  .button-text {
    white-space: nowrap;
  }
  
  &:hover { 
    background: ${({ theme }) => theme.colors.primaryAccent};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(90,90,90,.2);
  }
  &:active { 
    transform: translateY(0) scale(0.98);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
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

const Toggle = styled.button`
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryAccent};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(90,90,90,.2);
  }
  &:active {
    transform: scale(0.95);
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
  background: rgba(0,0,0,.5);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
`;
const UploadModal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 20px 40px rgba(0,0,0,.15);
  border-radius: 12px;
  padding: 32px;
  min-width: 400px;
  position: relative;
  display: flex; 
  flex-direction: column; 
  gap: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;
const UploadTitle = styled.div`
  font-weight: 600;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`;
const UploadActions = styled.div`
  display: flex; 
  gap: 12px; 
  justify-content: flex-end;
  margin-top: 8px;
`;
const UploadError = styled.div`
  color: ${({ theme }) => theme.colors.danger}; 
  font-size: 14px;
  margin-top: 4px;
`;
const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 16px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 16px;
  transition: border-color 0.2s ease;
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
  font-size: 15px; 
  display: block;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  width: 100%;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(90,90,90,.1);
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
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryAccent};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(90,90,90,.2);
  }
  
  &:active {
    transform: translateY(0);
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryAccent};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(90,90,90,.2);
  }
  
  &:active {
    transform: translateY(0);
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
    if (!auth.isAuthenticated) {
      setUserDropdownOpen(false);
      // Принудительно обновляем состояние для перерисовки
      setAuthOpen(false);
    }
  }, [auth.isAuthenticated, setAuthOpen]);
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
          <SearchToggleSwitch
            $active={searchType === 'ai'}
            onClick={() => dispatch(setSearchType(searchType === 'local' ? 'ai' : 'local'))}
            title={searchType === 'local' ? 'Переключить на AI поиск' : 'Переключить на поиск по названию'}
            aria-label={searchType === 'local' ? 'Переключить на AI поиск' : 'Переключить на поиск по названию'}
          />
          <SearchToggleText>
            {searchType === 'local' ? 'Название' : 'AI'}
          </SearchToggleText>
        </SearchToggleWrapper>
      </SearchContainer>
      {auth.isAuthenticated && auth.token && (
        <>
          <Button
            onClick={() => setShowCreateFolderModal(true)}
            className="desktop-only"
          >
            <Icon src={addIcon} alt="Создать папку" />
            <span className="button-text">Создать папку</span>
          </Button>
          <Button
            onClick={() => setUploadOpen(true)}
            className="desktop-only"
          >
            <Icon src={uploadIcon} alt="Загрузить файл" />
            <span className="button-text">Загрузить файл</span>
          </Button>
        </>
      )}
        <Toggle onClick={toggle} title="Сменить тему" className="desktop-only">
          <Icon src={themeIcon} alt="Тема" />
          {mode === 'light' ? '' : ''}
        </Toggle>
        
        <Actions>
          <MenuButton onClick={() => setSidebarOpen(!sidebarOpen)} title="Меню">
            ☰
          </MenuButton>
          
          <Avatar 
            ref={(el) => {
              if (el) avatarRef.current = el;
            }}
            key={auth.isAuthenticated ? 'authenticated' : 'not-authenticated'}
            onClick={() => {
              if (auth.user && auth.isAuthenticated) {
                setUserDropdownOpen(!userDropdownOpen);
              } else {
                setAuthOpen(true);
              }
            }} 
            title={auth.user && auth.isAuthenticated ? `${auth.user.name} ${auth.user.second_name}` : 'Войти'}
          >
            {auth.user && auth.isAuthenticated ? auth.user.name.charAt(0).toUpperCase() : '👤'}
          </Avatar>
          {auth.user && auth.isAuthenticated && (
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
            {file && <div style={{fontSize:15, color:'#888', marginBottom: '16px'}}>Файл: {file.name}</div>}
            <Select
              value={uploadAccess}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadAccess(Number(e.target.value) as 0 | 1)}
              disabled={uploading}
            >
              <option value={1}>Публичный (1)</option>
              <option value={0}>Приватный (0)</option>
            </Select>
            {uploadError && <UploadError>{uploadError}</UploadError>}
            <UploadActions>
              <Button 
                disabled={uploading} 
                style={{ background: '#8a8a8a', color: '#fff' }} 
                onClick={()=>{
                  if(!uploading) {
                    setUploadOpen(false);
                    setFile(null);
                    setUploadAccess(1); // Сбрасываем на значение по умолчанию
                  }
                }}
              >
                Отмена
              </Button>
              <Button
                type="button"
                style={{ minWidth: 120 }}
                disabled={uploading}
                onClick={onUpload}
              >
                {uploading ? '⏳ Загрузка...' : 'Загрузить'}
              </Button>
            </UploadActions>
          </UploadModal>
        </UploadModalBg>
      )}
      
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </Bar>
  );
}


