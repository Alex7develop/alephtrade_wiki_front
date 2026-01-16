import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { setSearch, setSearchType, uploadFileAPI, searchAPI, selectFile } from '@/store/fsSlice';
import type { RootState } from '@/store/store';
import type { SearchType } from '@/store/fsSlice';
import logoSrc from '/icon/featherIcon.svg';
import addIcon from '/icon/plus.png';
import uploadIcon from '/icon/download.png';
import themeIcon from '/icon/theme.png';
import userIcon from '/icon/user.png';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useThemeMode } from '@/styles/ThemeMode';
import React, { useRef } from 'react';
import { UserDropdown } from './UserDropdown';
import { CreateFolderModal } from './CreateFolderModal';
import { Tooltip } from './Tooltip';
import type { FsNode } from '@/store/fsSlice';

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
  overflow: visible;
  flex-shrink: 0;
  position: relative;
  z-index: 100;

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
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
  overflow: visible;
  position: relative;
  
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
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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

const SearchWrapper = styled.div`
  flex: 1;
  position: relative;
  min-width: 0;
  width: 100%;
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
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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

const SearchDropdown = styled.div<{ $isOpen: boolean; $top?: number; $left?: number; $width?: number }>`
  position: fixed;
  top: ${({ $top }) => ($top !== undefined ? `${$top}px` : 'auto')};
  left: ${({ $left }) => ($left !== undefined ? `${$left}px` : 'auto')};
  width: ${({ $width }) => ($width !== undefined ? `${$width}px` : 'auto')};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 10000;
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  
  /* Скрываем скроллбар на WebKit браузерах, но оставляем функциональность */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    
    &:hover {
      background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
    }
  }
  
  @media (max-width: 768px) {
    max-height: 300px;
    border-radius: 6px;
  }
  
  @media (max-width: 480px) {
    max-height: 250px;
  }
`;

const SearchResultItem = styled.div`
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  transition: background-color 0.15s ease;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  
  &:active {
    opacity: 0.9;
  }
  
  @media (max-width: 768px) {
    padding: 14px 16px;
  }
  
  @media (max-width: 480px) {
    padding: 12px 14px;
  }
`;

const SearchResultTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 480px) {
    font-size: 13px;
  }
`;

const SearchResultDescription = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 480px) {
    font-size: 11px;
  }
`;

const SearchLoading = styled.div`
  padding: 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  position: relative;
  z-index: 10001;
  background: ${({ theme }) => theme.colors.surface};
`;

const SearchEmpty = styled.div`
  padding: 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  position: relative;
  z-index: 10001;
  background: ${({ theme }) => theme.colors.surface};
`;

const SearchViewAll = styled.div`
  padding: 12px 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  text-align: center;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.15s ease;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  
  &:active {
    opacity: 0.9;
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
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  display: flex; 
  flex-direction: column; 
  gap: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 600px) {
    padding: 12px;
    min-width: 200px;
    max-width: 97vw;
    max-height: 80vh;
    font-size: 15px;
  }

  @media (max-width: 400px) {
    min-width: unset;
    max-width: 99vw;
    padding: 8px;
    font-size: 14px;
  }
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
    display: none;
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
}

export function Header({ 
  sidebarOpen, 
  setSidebarOpen,
  uploadOpen: externalUploadOpen,
  setUploadOpen: externalSetUploadOpen
}: HeaderProps) {
  const dispatch: any = useDispatch();
  const search = useSelector((s: RootState) => s.fs.search);
  const searchType = useSelector((s: RootState) => s.fs.searchType);
  const searchResults = useSelector((s: RootState) => s.fs.searchResults);
  const searchLoading = useSelector((s: RootState) => s.fs.searchLoading);
  const root = useSelector((s: RootState) => s.fs.root);
  const selectedFolderId = useSelector((s: RootState) => s.fs.selectedFolderId);
  const { mode, toggle } = useThemeMode();
  const { auth } = useSelector((s: RootState) => s.fs);
  
  // Используем внешние состояния если они переданы, иначе внутренние
  const [internalUploadOpen, setInternalUploadOpen] = useState(false);
  
  const uploadOpen = externalUploadOpen !== undefined ? externalUploadOpen : internalUploadOpen;
  const setUploadOpen = externalSetUploadOpen || setInternalUploadOpen;
  
  // Принудительно закрываем dropdown при logout
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) {
      setUserDropdownOpen(false);
    }
  }, [auth.isAuthenticated, auth.token]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadAccess, setUploadAccess] = useState<0 | 1>(1);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const fileInput = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarRef = useRef<HTMLButtonElement | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Функция для локального поиска по дереву
  const findAllFiles = useCallback((node: FsNode, query: string): FsNode[] => {
    if (!node) return [];
    
    let results: FsNode[] = [];
    const searchQuery = query.trim().toLowerCase();
    
    if (!searchQuery) return [];
    
    // Если это файл, проверяем название
    if (node.type === 'file') {
      if (node.name && typeof node.name === 'string') {
        const fileName = node.name.toLowerCase();
        if (fileName.includes(searchQuery)) {
          results.push(node);
        }
      }
    }
    
    // Рекурсивно ищем в дочерних элементах
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child) {
          const childResults = findAllFiles(child, query);
          results = results.concat(childResults);
        }
      }
    }
    
    return results;
  }, []);

  // Локальные результаты поиска
  const localSearchResults = useMemo(() => {
    if (searchType === 'local' && search && search.trim().length > 0 && root) {
      return findAllFiles(root, search).slice(0, 5); // Ограничиваем до 5 результатов
    }
    return [];
  }, [searchType, search, root, findAllFiles]);

  // Объединенные результаты для отображения
  const displayResults = useMemo(() => {
    if (searchType === 'ai') {
      return searchResults.slice(0, 5); // Ограничиваем до 5 результатов
    } else {
      return localSearchResults;
    }
  }, [searchType, searchResults, localSearchResults]);

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

  // Обработчик клика на результат поиска
  const handleResultClick = useCallback((node: FsNode) => {
    if (node.type === 'file') {
      dispatch(selectFile(node.id));
      dispatch(setSearch('')); // Очищаем поиск после выбора
      setSearchFocused(false);
    }
  }, [dispatch]);

  // Обработчик клика на "Все результаты"
  const handleViewAll = useCallback(() => {
    // Очищаем фокус, чтобы скрыть выпадающий список
    setSearchFocused(false);
    // Поиск уже активен, результаты будут показаны в FilesList
  }, []);

  // Обновляем позицию выпадающего окна
  useEffect(() => {
    const updateDropdownPosition = () => {
      if (searchInputRef.current) {
        const rect = searchInputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (searchFocused && search && search.trim().length > 0) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [searchFocused, search]);

  // Закрываем выпадающий список при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };

    if (searchFocused) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [searchFocused]);

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
    // Разрешаем загрузку PDF, MD и видео файлов
    if (!/\.(pdf|md|mp4|mov|avi|mkv|webm|png|jpg|jpeg|gif|webp)$/i.test(file.name)) {
      setUploadError('Можно загрузить PDF, MD, видео или изображение (PNG, JPG, JPEG, GIF, WEBP)');
      return;
    }
    setUploading(true);
    try {
      const result = await dispatch(uploadFileAPI({ file, parentId: selectedFolderId, access: uploadAccess }));
      if (uploadFileAPI.fulfilled.match(result)) {
        setUploadOpen(false); 
        setFile(null);
        setUploadAccess(1); // Сбрасываем на значение по умолчанию
      } else if (uploadFileAPI.rejected.match(result)) {
        const errorMessage = result.payload as string || 'Ошибка загрузки файла';
        setUploadError(errorMessage);
      }
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
        <BrandTitle></BrandTitle>
      </Brand>
      <SearchContainer>
        <SearchWrapper ref={searchWrapperRef}>
          <Search
            ref={searchInputRef}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder={searchType === 'local' ? 'Поиск...' : 'Поиск...'}
          />
          <SearchDropdown 
            $isOpen={!!(searchFocused && search && search.trim().length > 0)}
            $top={dropdownPosition.top}
            $left={dropdownPosition.left}
            $width={dropdownPosition.width}
          >
            {searchLoading ? (
              <SearchLoading>Поиск...</SearchLoading>
            ) : displayResults.length > 0 ? (
              <>
                {displayResults.map((result) => (
                  <SearchResultItem
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                  >
                    <SearchResultTitle>{result.name}</SearchResultTitle>
                    {result.type === 'file' && (
                      <SearchResultDescription>
                        {result.mime === 'text/markdown' || result.url?.toLowerCase().endsWith('.md')
                          ? 'Markdown документ'
                          : result.mime === 'application/pdf'
                          ? 'PDF документ'
                          : 'Файл'}
                      </SearchResultDescription>
                    )}
                  </SearchResultItem>
                ))}
                {(searchType === 'ai' ? searchResults.length : localSearchResults.length) > 5 && (
                  <SearchViewAll onClick={handleViewAll}>
                    Все результаты &gt;
                  </SearchViewAll>
                )}
              </>
            ) : (
              <SearchEmpty>Ничего не найдено</SearchEmpty>
            )}
          </SearchDropdown>
        </SearchWrapper>
        <SearchToggleWrapper>
          <Tooltip text={searchType === 'local' ? 'Переключить на AI поиск' : 'Переключить на поиск без AI'}>
            <SearchToggleSwitch
              $active={searchType === 'ai'}
              onClick={() => dispatch(setSearchType(searchType === 'local' ? 'ai' : 'local'))}
              aria-label={searchType === 'local' ? 'Переключить на AI поиск' : 'Переключить на поиск без AI'}
            />
          </Tooltip>
          <SearchToggleText>
            {searchType === 'local' ? 'AI' : 'AI'}
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
                // Редиректим на OAuth страницу вместо открытия модального окна
                const redirectUri = encodeURIComponent(window.location.origin);
                window.location.href = `https://oauth.alephtrade.com/?redirect_uri=${redirectUri}`;
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
              accept=".md,.pdf,.mp4,.mov,.avi,.mkv,.webm,.png,.jpg,.jpeg,.gif,.webp"
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
    </Bar>
  );
}


