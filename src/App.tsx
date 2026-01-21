import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import type { RootState } from '@/store/store';
import { fetchTree, getUser, selectFile, selectFolder, setAuthToken } from '@/store/fsSlice';
import { useEffect, useState, useRef } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Preview } from '@/components/Preview';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { VideoSharePage } from '@/components/VideoSharePage';

const Layout = styled.div`
  display: grid;
  grid-template-rows: 56px 1fr;
  grid-template-columns: 440px 1fr;
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
    grid-template-rows: 56px 1fr;
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
  width: 100%;
  max-width: 100%;
  overflow: visible;
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
    top: 56px;
    left: 0;
    width: 280px;
    height: calc(100vh - 56px);
    z-index: 1000;
    transform: ${({ $sidebarOpen }) => $sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'};
    transition: transform 0.2s ease;
    box-shadow: 1px 0 4px rgba(0,0,0,.08);
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    top: 0px;
    height: calc(100vh - 50px -10px);
    width: 300px;
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

function extractUuidFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const clean = url.split('?')[0];
    const segments = clean.split('/');
    const last = segments.pop();
    if (!last) return null;
    const dotIndex = last.lastIndexOf('.');
    return dotIndex === -1 ? last : last.slice(0, dotIndex);
  } catch {
    return null;
  }
}

// Функция для поиска узла (файла или папки) по UUID (id или object_uuid в S3 ссылке)
function findNodeByShareId(node: any, shareId: string): any | null {
  if (!node) return null;
  const normalizedTarget = shareId.toLowerCase();
  const nodeShareId = extractUuidFromUrl(node.url)?.toLowerCase();
  const nodeId = typeof node.id === 'string' ? node.id.toLowerCase() : '';
  const isMatch =
    nodeId === normalizedTarget || (!!nodeShareId && nodeShareId === normalizedTarget);
  if (isMatch) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByShareId(child, shareId);
      if (found) return found;
    }
  }
  return null;
}

// Функция для поиска родительской папки файла
function findParentFolderForFile(node: any, fileId: string, parent: any = null): any | null {
  if (node.id === fileId) return parent;
  const nodeShareId = extractUuidFromUrl(node.url);
  if (nodeShareId && nodeShareId === fileId) {
    return parent;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findParentFolderForFile(child, fileId, node);
      if (found !== null) return found;
    }
  }
  return null;
}

function isVideoNode(node: any): boolean {
  if (!node || node.type !== 'file') return false;
  const url = node.url?.toLowerCase() ?? '';
  return (
    (typeof node.mime === 'string' && node.mime.startsWith('video')) ||
    url.includes('runtime.video.cloud.yandex.net') ||
    /\.(mp4|mov|avi|mkv|webm)(\?|$)/i.test(node.url ?? '')
  );
}

// Функция для получения значения куки по имени
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// Флаг на уровне модуля для предотвращения повторных вызовов
let oauthCallbackProcessed = false;

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const isVideoRoute = pathSegments[0] === 'video';
  const uuid = !isVideoRoute && pathSegments.length > 0 ? pathSegments[0] : undefined;
  const { loading, error, auth, root, selectedFileId, selectedFolderId } = useSelector((s: RootState) => s.fs);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Проверяем наличие токена при загрузке
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasLoadedTree, setHasLoadedTree] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // Если токена нет - загружаем дерево с access: 0 (только публичные файлы)
      // НЕ показываем модальное окно авторизации автоматически
      dispatch(fetchTree(0) as any).then((result: any) => {
        if (result.type && result.type.includes('fulfilled')) {
          setHasLoadedTree(true);
        }
        setIsInitialized(true);
      });
    } else {
      // Если токен есть - проверяем его валидность, загружая дерево
      // Если токен невалидный, fetchTree вернет ошибку и мы покажем модальное окно
      const fetchTreePromise = dispatch(fetchTree() as any);
      fetchTreePromise.then((result: any) => {
        // Проверяем результат через type property
        if (result.type && result.type.includes('fulfilled')) {
          // Если запрос успешен, но пользователь не авторизован в Redux - проверяем авторизацию
          if (!auth.isAuthenticated || !auth.user) {
            // Пытаемся загрузить данные пользователя для проверки валидности токена
            dispatch(getUser(token) as any).then((userResult: any) => {
              if (userResult.type && userResult.type.includes('fulfilled')) {
                // Пользователь авторизован, можно загружать дерево
                setHasLoadedTree(true);
              } else {
                // Токен невалидный - загружаем публичное дерево
                // НЕ показываем модальное окно автоматически
                try {
                  localStorage.removeItem('auth_token');
                } catch (e) {
                  console.error('Ошибка очистки токена:', e);
                }
                // Загружаем публичное дерево
                dispatch(fetchTree(0) as any).then((publicResult: any) => {
                  if (publicResult.type && publicResult.type.includes('fulfilled')) {
                    setHasLoadedTree(true);
                  }
                });
              }
            });
          } else {
            // Пользователь уже авторизован
            setHasLoadedTree(true);
          }
        } else {
          // Если запрос не удался из-за авторизации - загружаем публичное дерево
          // НЕ показываем модальное окно автоматически
          // Очищаем состояние авторизации
          try {
            localStorage.removeItem('auth_token');
          } catch (e) {
            console.error('Ошибка очистки токена:', e);
          }
          // Загружаем публичное дерево
          dispatch(fetchTree(0) as any).then((publicResult: any) => {
            if (publicResult.type && publicResult.type.includes('fulfilled')) {
              setHasLoadedTree(true);
            }
          });
        }
        setIsInitialized(true);
      }).catch(() => {
        // В случае ошибки загружаем публичное дерево
        // НЕ показываем модальное окно автоматически
        dispatch(fetchTree(0) as any).then((publicResult: any) => {
          if (publicResult.type && publicResult.type.includes('fulfilled')) {
            setHasLoadedTree(true);
          }
        });
        setIsInitialized(true);
      });
    }
  }, [dispatch]);

  // Загружаем полное дерево после успешной авторизации
  useEffect(() => {
    if (auth.isAuthenticated && auth.token && isInitialized) {
      // После авторизации загружаем полное дерево (без ограничения по access)
      dispatch(fetchTree() as any).then((result: any) => {
        if (result.type && result.type.includes('fulfilled')) {
          setHasLoadedTree(true);
        }
      });
    } else if (!auth.isAuthenticated && isInitialized && hasLoadedTree) {
      // Если пользователь вышел - перезагружаем публичное дерево
      // Это сработает автоматически через logout thunk, но на всякий случай оставляем fallback
      dispatch(fetchTree(0) as any).then((result: any) => {
        if (result.type && result.type.includes('fulfilled')) {
          setHasLoadedTree(true);
        }
      });
    }
  }, [auth.isAuthenticated, auth.token, isInitialized, hasLoadedTree, dispatch]);

  // Обрабатываем возврат с OAuth (проверка куки auid при загрузке)
  useEffect(() => {
    // Защита от повторных вызовов
    if (oauthCallbackProcessed) return;
    
    const auid = getCookie('auid');
    
    if (auid) {
      oauthCallbackProcessed = true;
      console.log('Кука auid найдена при возврате с OAuth:', auid);
      
      // Выполняем запрос на API auth_sso
      fetch('https://api.alephtrade.com/backend_wiki/api/v2/auth_sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ auid }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log('Ответ от auth_sso:', data);
          
          // Сохраняем токен в localStorage, если он есть в ответе
          if (data.token) {
            try {
              localStorage.setItem('auth_token', data.token);
              console.log('Токен сохранен в localStorage');
              
              // Сразу обновляем токен в Redux store для мгновенного обновления UI
              // Это нужно для того, чтобы иконка личного кабинета обновилась сразу
              dispatch(setAuthToken(data.token));
              
              // После сохранения токена сразу обновляем состояние авторизации
              // и загружаем данные пользователя и дерево
              dispatch(getUser(data.token) as any).then((userResult: any) => {
                if (userResult.type && userResult.type.includes('fulfilled')) {
                  // После успешной загрузки пользователя загружаем дерево
                  dispatch(fetchTree() as any).then((treeResult: any) => {
                    if (treeResult.type && treeResult.type.includes('fulfilled')) {
                      setHasLoadedTree(true);
                      // После загрузки дерева сбрасываем флаг проверки доступа,
                      // чтобы документ из URL мог открыться после авторизации
                      setPrivateAccessChecked(false);
                    }
                  });
                }
              });
            } catch (error) {
              console.error('Ошибка при сохранении токена в localStorage:', error);
            }
          }
        })
        .catch((error) => {
          console.error('Ошибка при запросе auth_sso:', error);
        });
    }
  }, [dispatch]);

  // Восстанавливаем авторизацию при загрузке приложения
  useEffect(() => {
    if (auth.token && !auth.user) {
      // Если есть токен, но нет данных пользователя, загружаем их
      dispatch(getUser(auth.token) as any);
    }
  }, [auth.token, auth.user, dispatch]);

  // Флаг для отслеживания проверки доступа к приватному документу
  const [privateAccessChecked, setPrivateAccessChecked] = useState(false);

  // Обрабатываем UUID из URL при загрузке дерева
  useEffect(() => {
    if (!uuid || !hasLoadedTree || !root || !root.children || root.children.length === 0) {
      return;
    }
    
    console.log('🔍 Проверка доступа к документу:', {
      uuid,
      hasLoadedTree,
      oauthCallbackProcessed,
      privateAccessChecked
    });
    
    // Пропускаем проверку, если уже обрабатывали возврат с OAuth
    if (oauthCallbackProcessed) {
      console.log('✅ Возврат с OAuth, открываем документ');
      // После возврата с OAuth просто открываем документ
      const node = findNodeByShareId(root, uuid);
      if (node) {
        if (node.type === 'file') {
          dispatch(selectFile(node.id));
        } else if (node.type === 'folder' && node.id !== 'root') {
          dispatch(selectFolder(node.id));
        }
      }
      return;
    }
    
    const node = findNodeByShareId(root, uuid);
    const hasAuid = !!getCookie('auid');
    const hasToken = !!localStorage.getItem('auth_token');
    
    console.log('🔍 Результаты проверки:', {
      nodeFound: !!node,
      nodeAccess: node?.access,
      hasAuid,
      hasToken,
      privateAccessChecked
    });
    
    // Если документ не найден в публичном дереве и нет авторизации - редиректим на OAuth
    if (!node && !hasAuid && !hasToken && !privateAccessChecked) {
      setPrivateAccessChecked(true);
      const redirectUri = encodeURIComponent(`${window.location.origin}/${uuid}`);
      console.log('🔒 Документ не найден в публичном дереве, требуется авторизация, редирект на OAuth');
      window.location.href = `https://oauth.alephtrade.com/?redirect_uri=${redirectUri}`;
      return;
    }
    
    // Если документ найден - проверяем его доступ
    if (node) {
      // Проверяем, является ли документ приватным (access: 1 = приватный)
      const isPrivate = node.access === 1;
      
      console.log('🔍 Проверка приватности документа:', {
        isPrivate,
        access: node.access,
        hasAuid,
        hasToken
      });
      
      // Если документ приватный и пользователь не авторизован - редиректим на OAuth
      if (isPrivate && !hasAuid && !hasToken && !privateAccessChecked) {
        setPrivateAccessChecked(true);
        const redirectUri = encodeURIComponent(`${window.location.origin}/${uuid}`);
        console.log('🔒 Приватный документ требует авторизации, редирект на OAuth');
        window.location.href = `https://oauth.alephtrade.com/?redirect_uri=${redirectUri}`;
        return;
      }
      
      // Если документ публичный или пользователь авторизован - открываем документ
      console.log('✅ Доступ разрешен, открываем документ');
      if (node.type === 'file') {
        dispatch(selectFile(node.id));
      } else if (node.type === 'folder' && node.id !== 'root') {
        dispatch(selectFolder(node.id));
      }
      
      setPrivateAccessChecked(true);
    }
  }, [uuid, hasLoadedTree, root, dispatch, privateAccessChecked]);

  // Синхронизируем URL при изменении selectedFileId или selectedFolderId
  useEffect(() => {
    if (!hasLoadedTree) return;
    
    // Проверяем, есть ли выбранный файл (не null и не пустая строка)
    const hasFileId = selectedFileId !== null && 
                      selectedFileId !== undefined && 
                      typeof selectedFileId === 'string' && 
                      selectedFileId.trim() !== '';
    
    if (hasFileId) {
      // Если файл выбран и URL не совпадает - обновляем URL на UUID файла
      if (selectedFileId !== uuid) {
        navigate(`/${selectedFileId}`, { replace: true });
      }
    } else if (selectedFolderId && selectedFolderId !== 'root') {
      // Если выбрана папка (не root) и URL не совпадает - обновляем URL на UUID папки
      if (selectedFolderId !== uuid) {
        navigate(`/${selectedFolderId}`, { replace: true });
      }
    } else if (selectedFolderId === 'root' && !uuid) {
      // Если выбрана root папка, очищаем URL
      navigate('/', { replace: true });
    }
  }, [selectedFileId, selectedFolderId, uuid, hasLoadedTree, navigate]);

  // Функция для открытия модального окна загрузки
  // Передадим эту функцию через ref или создадим контекст
  // Пока что создадим простой способ через событие или состояние
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <Routes>
      <Route path="/video/:uuid" element={<VideoSharePage />} />
      <Route
        path="/:uuid?"
        element={
          <Layout>
          <HeaderArea>
            <Header 
              sidebarOpen={sidebarOpen} 
              setSidebarOpen={setSidebarOpen}
              uploadOpen={showUploadModal}
              setUploadOpen={setShowUploadModal}
            />
          </HeaderArea>
          <MobileOverlay $sidebarOpen={sidebarOpen} onClick={() => setSidebarOpen(false)} />
          {/* Показываем контент если дерево загружено (для авторизованных и неавторизованных) */}
          {hasLoadedTree && (
            <>
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
            </>
          )}
          <MobileBottomNav
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onUploadClick={() => setShowUploadModal(true)}
          />
        </Layout>
        }
      />
    </Routes>
  );
}


