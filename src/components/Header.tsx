import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { setSearch, createFolderAPI, uploadFileAPI } from '@/store/fsSlice';
import type { RootState } from '@/store/store';
import logoSrc from '/icon/featherIcon.svg';
import addIcon from '/icon/add_11891531.png';
import uploadIcon from '/icon/file_4970405.png';
import themeIcon from '/icon/icons8-день-и-ночь-50.png';
import { useEffect, useState } from 'react';
import { useThemeMode } from '@/styles/ThemeMode';
import React, { useRef } from 'react';
import { AuthModal } from './AuthModal';
import { UserDropdown } from './UserDropdown';

const Bar = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 1px 3px rgba(0,0,0,.05);

  /* Мобильные устройства */
  @media (max-width: 768px) {
    padding: 0 12px;
    gap: 8px;
    flex-wrap: wrap;
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
    max-width: 200px;
    height: 32px;
    padding: 0 12px;
    font-size: 14px;
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    max-width: 150px;
    height: 30px;
    padding: 0 10px;
    font-size: 13px;
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
  &:hover { 
    background: ${({ theme }) => theme.colors.primaryAccent};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(90,90,90,.2);
  }
  &:active { transform: translateY(0); }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  /* Мобильные устройства */
  @media (max-width: 768px) {
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
    gap: 4px;
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    height: 30px;
    padding: 0 10px;
    font-size: 12px;
    gap: 3px;
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
  &:hover {
    background: ${({ theme }) => theme.colors.primaryAccent};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(90,90,90,.2);
  }
  &:active {
    transform: translateY(0);
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

  /* Мобильные устройства */
  @media (max-width: 768px) {
    gap: 8px;
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    gap: 6px;
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
}

export function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const dispatch: any = useDispatch();
  const search = useSelector((s: RootState) => s.fs.search);
  const selectedFolderId = useSelector((s: RootState) => s.fs.selectedFolderId);
  const { mode, toggle } = useThemeMode();
  const { auth } = useSelector((s: RootState) => s.fs);
  
  // Принудительно закрываем dropdown при logout
  useEffect(() => {
    if (!auth.isAuthenticated) {
      setUserDropdownOpen(false);
      // Принудительно обновляем состояние для перерисовки
      setAuthOpen(false);
    }
  }, [auth.isAuthenticated]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
      await dispatch(uploadFileAPI({ file, parentId: selectedFolderId }));
      setUploadOpen(false); setFile(null);
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
      <Search
        value={search}
        onChange={(e) => dispatch(setSearch(e.target.value))}
        placeholder="Поиск по названию..."
      />
      <Button
        onClick={() => dispatch(createFolderAPI({ parentId: selectedFolderId }))}
      >
        <Icon src={addIcon} alt="Создать папку" />
        Создать папку
      </Button>
      <Button
        onClick={() => setUploadOpen(true)}
      >
        <Icon src={uploadIcon} alt="Загрузить файл" />
        Загрузить файл
      </Button>
        <Toggle onClick={toggle} title="Сменить тему">
          <Icon src={themeIcon} alt="Тема" />
          {mode === 'light' ? '' : ''}
        </Toggle>
        
        <Actions>
          <MenuButton onClick={() => setSidebarOpen(!sidebarOpen)} title="Меню">
            ☰
          </MenuButton>
          
          <Avatar 
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
            />
          )}
        </Actions>
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
            {file && <div style={{fontSize:15, color:'#888'}}>Файл: {file.name}</div>}
            {uploadError && <UploadError>{uploadError}</UploadError>}
            <UploadActions>
              <Button 
                disabled={uploading} 
                style={{ background: '#8a8a8a', color: '#fff' }} 
                onClick={()=>{if(!uploading)setUploadOpen(false);}}
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


