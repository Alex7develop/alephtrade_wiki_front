import { createAsyncThunk, createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';

export type NodeType = 'folder' | 'file';

export interface FsNode {
  id: string;
  type: NodeType;
  name: string;
  children?: FsNode[]; // only for folders
  mime?: string; // for files, optional
  url?: string; // for files, optional (s3 url)
  access?: number; // 0 = приватный, 1 = публичный
  attachments?: {
    images?: string[]; // массив URL изображений
  };
  chunk_result_url?: string | null; // URL на HTML страницу RAG
  created_at?: string; // Дата создания файла
  updated_at?: string; // Дата обновления файла
  rag_actual?: boolean; // Актуальный файл из RAG
  rag_finished?: string | null; // Дата завершения RAG обработки
  rag_in_progress?: boolean; // Файл в очереди в RAG
  rag_started?: string | null; // Дата начала RAG обработки
}

export interface User {
  uuid: string;
  aleph_id: string;
  id: string;
  name: string;
  second_name: string;
  patronymic: string;
  phone: string;
  email: string;
  avatar: string | null;
  access: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export type SearchType = 'local' | 'ai';

export interface FsState {
  root: FsNode;
  selectedFolderId: string; // текущая открытая папка
  selectedFileId: string | null; // выбранный файл для предпросмотра
  search: string;
  searchType: SearchType; // тип поиска: локальный или AI
  searchResults: FsNode[]; // результаты серверного поиска
  searchLoading: boolean; // статус загрузки поиска
  searchError: string | null; // ошибка поиска
  loading: boolean;
  error: string | null;
  auth: AuthState;
}

// Восстанавливаем токен из localStorage при инициализации
const getStoredToken = () => {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
};

// Получаем токен из localStorage для использования в запросах
const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
};

// Создаем заголовки с токеном авторизации
const getAuthHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const initialState: FsState = {
  root: {
    id: 'root',
    type: 'folder',
    name: 'Введение',
    children: []
  },
  selectedFolderId: 'root',
  selectedFileId: null,
  search: '',
  searchType: 'local',
  searchResults: [],
  searchLoading: false,
  searchError: null,
  loading: false,
  error: null,
  auth: {
    user: null,
    token: getStoredToken(),
    isAuthenticated: !!getStoredToken(),
    loading: false,
    error: null
  }
};

function findNodeById(node: FsNode, id: string): FsNode | null {
  if (node.id === id) return node;
  if (node.type === 'folder' && node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

function extractUuidFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const clean = url.split('?')[0];
  const segments = clean.split('/');
  const last = segments.pop();
  if (!last) return null;
  const dotIndex = last.lastIndexOf('.');
  return dotIndex === -1 ? last : last.slice(0, dotIndex);
}

function findParentFolder(node: FsNode, targetId: string, parent: FsNode | null = null): FsNode | null {
  if (node.id === targetId) {
    return parent;
  }
  if (node.type === 'file' && node.url) {
    const shareId = extractUuidFromUrl(node.url);
    if (shareId && shareId === targetId) {
      return parent;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findParentFolder(child, targetId, node);
      if (found) return found;
    }
  }
  return null;
}

function mutateAddFolder(node: FsNode, parentId: string, name: string): boolean {
  if (node.id === parentId && node.type === 'folder') {
    const id = `${name}-${nanoid(6)}`;
    node.children = node.children ?? [];
    node.children.push({ id, type: 'folder', name, children: [] });
    return true;
  }
  if (node.children) {
    return node.children.some((c) => mutateAddFolder(c, parentId, name));
  }
  return false;
}

function mutateRename(node: FsNode, id: string, newName: string): boolean {
  if (node.id === id) {
    node.name = newName;
    return true;
  }
  if (node.children) {
    return node.children.some((c) => mutateRename(c, id, newName));
  }
  return false;
}

// API node type
type ApiNode = {
  uuid: string;
  name: string;
  type: 'file' | 'folder';
  s3_url?: string;
  access?: number | string; // может быть числом или строкой из API
  children?: ApiNode[];
  attachments?: {
    images?: string[]; // массив URL изображений
  } | []; // может быть пустым массивом
  chunk_result_url?: string | null; // URL на HTML страницу RAG
  created_at?: string; // Дата создания файла
  updated_at?: string; // Дата обновления файла
  rag_actual?: boolean; // Актуальный файл из RAG
  rag_finished?: string | null; // Дата завершения RAG обработки
  rag_in_progress?: boolean; // Файл в очереди в RAG
  rag_started?: string | null; // Дата начала RAG обработки
};

function mapApiToFs(node: ApiNode): FsNode {
  const fsNode: FsNode = {
    id: node.uuid,
    name: node.name,
    type: node.type,
    url: node.s3_url,
    access: node.access !== undefined ? Number(node.access) : undefined,
    children: node.children?.map(mapApiToFs),
    // Маппим attachments: если это объект с images, берем его; если пустой массив, игнорируем
    attachments: node.attachments && !Array.isArray(node.attachments) && node.attachments.images
      ? { images: node.attachments.images }
      : undefined,
    chunk_result_url: node.chunk_result_url || undefined,
    created_at: node.created_at,
    updated_at: node.updated_at,
    rag_actual: node.rag_actual,
    rag_finished: node.rag_finished || undefined,
    rag_in_progress: node.rag_in_progress,
    rag_started: node.rag_started || undefined
  };
  
  // Определяем MIME тип из URL для файлов
  if (node.type === 'file' && node.s3_url) {
    const lowerUrl = node.s3_url.toLowerCase();
    
    // Видео от Яндекс Cloud Runtime не имеют расширения, определяем по URL
    if (lowerUrl.includes('runtime.video.cloud.yandex.net')) {
      fsNode.mime = 'video/yandex-runtime';
    } else {
      const extension = lowerUrl.split('.').pop()?.split('?')[0];
      switch (extension) {
        case 'pdf':
          fsNode.mime = 'application/pdf';
          break;
        case 'md':
          fsNode.mime = 'text/markdown';
          break;
        case 'doc':
        case 'docx':
          fsNode.mime = 'application/msword';
          break;
        case 'xls':
        case 'xlsx':
          fsNode.mime = 'application/vnd.ms-excel';
          break;
        case 'txt':
          fsNode.mime = 'text/plain';
          break;
        case 'jpg':
        case 'jpeg':
          fsNode.mime = 'image/jpeg';
          break;
        case 'png':
          fsNode.mime = 'image/png';
          break;
        case 'gif':
          fsNode.mime = 'image/gif';
          break;
        case 'mp4':
          fsNode.mime = 'video/mp4';
          break;
        case 'mov':
          fsNode.mime = 'video/quicktime';
          break;
        case 'avi':
          fsNode.mime = 'video/x-msvideo';
          break;
        case 'mkv':
          fsNode.mime = 'video/x-matroska';
          break;
        case 'webm':
          fsNode.mime = 'video/webm';
          break;
        default:
          fsNode.mime = extension || 'unknown';
      }
    }
  }
  
  return fsNode;
}

export const fetchTree = createAsyncThunk('fs/fetchTree', async (access: 0 | 1 | undefined = undefined, { rejectWithValue, getState }) => {
  // Получаем состояние для проверки авторизации
  const state = getState() as { fs: FsState };
  const isAuthenticated = state.fs.auth.isAuthenticated && !!state.fs.auth.token;
  
  // Если не авторизован, всегда используем access: 0 (публичные файлы)
  // Если авторизован и access передан - используем его, иначе загружаем все файлы
  const accessLevel = isAuthenticated ? access : 0;
  
  // Формируем URL с query параметром access, если он указан
  let url = 'https://api.alephtrade.com/backend_wiki/api/v2/tree';
  if (accessLevel !== undefined) {
    url += `?access=${accessLevel}`;
  }
  
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  
  // Если получили 401 или 403 - токен невалидный, очищаем его
  if (res.status === 401 || res.status === 403) {
    try {
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Ошибка очистки токена:', error);
    }
    // Если не авторизован и получили ошибку - пробуем загрузить с access: 0
    if (!isAuthenticated) {
      const publicUrl = 'https://api.alephtrade.com/backend_wiki/api/v2/tree?access=0';
      const publicRes = await fetch(publicUrl);
      if (publicRes.ok) {
        const publicData = (await publicRes.json()) as ApiNode[];
        return publicData.map(mapApiToFs);
      }
    }
    return rejectWithValue('Требуется авторизация');
  }
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Не удалось загрузить дерево');
  }
  
  const data = (await res.json()) as ApiNode[];
  return data.map(mapApiToFs);
});

// Добавляем thunk для создания папки через API
export const createFolderAPI = createAsyncThunk(
  'fs/createFolderAPI',
  async (
    { parentId, name, access }: { parentId?: string; name?: string; access?: 0 | 1 },
    { dispatch, rejectWithValue, getState }
  ) => {
    // Проверяем авторизацию
    const state = getState() as { fs: FsState };
    if (!state.fs.auth.isAuthenticated || !state.fs.auth.token) {
      return rejectWithValue('Требуется авторизация для создания папки');
    }
    
    try {
      // Позволяем создавать на root, если parentId некорректен
      const parent_uuid = parentId && parentId !== 'root' ? parentId : undefined;
      const reqBody: any = {
        name: name?.trim() || 'Новая папка',
        ...(parent_uuid ? { parent_uuid } : {}),
      };
      
      // Добавляем access только если он передан
      if (typeof access === 'number') {
        reqBody.access = access;
      } else {
        reqBody.access = 1; // По умолчанию публичная
      }
      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/create_folder', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(reqBody)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка создания папки');
      }
      // После успеха подгружаем всё дерево заново
      dispatch(fetchTree());
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

// Thunk — загрузка файла (md/pdf) через POST /api/v2/upload_file
export const uploadFileAPI = createAsyncThunk(
  'fs/uploadFileAPI',
  async (
    { parentId, file, access }: { parentId?: string; file: File; access?: 0 | 1 },
    { dispatch, rejectWithValue, getState }
  ) => {
    // Проверяем авторизацию
    const state = getState() as { fs: FsState };
    if (!state.fs.auth.isAuthenticated || !state.fs.auth.token) {
      return rejectWithValue('Требуется авторизация для загрузки файла');
    }
    
    try {
      // Определяем уровень доступа: если явно передан - используем его,
      // иначе берем из родительской папки
      let accessValue: 0 | 1;
      if (typeof access === 'number') {
        // Если access явно передан, используем его
        accessValue = access as 0 | 1;
      } else {
        // Если access не передан, берем из родительской папки
        if (parentId && parentId !== 'root') {
          const parentNode = findNodeById(state.fs.root, parentId);
          if (parentNode && parentNode.type === 'folder') {
            // Берем уровень доступа из папки
            accessValue = typeof parentNode.access === 'number' 
              ? (parentNode.access as 0 | 1) 
              : 1; // По умолчанию приватный, если не указан
          } else {
            // Если папка не найдена, используем значение по умолчанию
            accessValue = 1;
          }
        } else {
          // Если это root или parentId не указан, используем значение по умолчанию
          accessValue = 1;
        }
      }

      const form = new FormData();
      // Добавляем файл - браузер сам установит правильный Content-Type
      form.append('file', file);
      if (parentId && parentId !== 'root') {
        form.append('parent_uuid', parentId);
      }
      
      form.append('access', String(accessValue));

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // НЕ устанавливаем Content-Type для FormData - браузер сам установит multipart/form-data с boundary
      
      console.log('📤 Загрузка файла:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        parentId: parentId && parentId !== 'root' ? parentId : undefined,
        access: accessValue
      });
      
      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/upload_file', {
        method: 'POST',
        headers,
        body: form
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Обрабатываем разные форматы ответа об ошибке
        let errorMessage = 'Ошибка загрузки файла';
        if (data) {
          if (typeof data.message === 'string') {
            errorMessage = data.message;
          } else if (Array.isArray(data.message)) {
            errorMessage = data.message.join(', ');
          } else if (data['0']) {
            errorMessage = data['0'];
          } else if (data.error) {
            errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
          }
        }
        throw new Error(errorMessage);
      }
      // обновить дерево после загрузки
      dispatch(fetchTree());
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

// Thunk — загрузка изображения в MD файл через POST /api/v2/upload_file_image
export const uploadFileImageAPI = createAsyncThunk(
  'fs/uploadFileImageAPI',
  async (
    { parentUuid, file }: { parentUuid: string; file: File },
    { dispatch, rejectWithValue, getState }
  ) => {
    // Проверяем авторизацию
    const state = getState() as { fs: FsState };
    if (!state.fs.auth.isAuthenticated || !state.fs.auth.token) {
      return rejectWithValue('Требуется авторизация для загрузки изображения');
    }
    
    // Проверяем, что это изображение
    if (!file.type.startsWith('image/')) {
      return rejectWithValue('Можно загрузить только изображения');
    }
    
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('parent_uuid', parentUuid);

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('📤 Загрузка изображения в MD файл:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        parentUuid
      });
      
      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/upload_file_image', {
        method: 'POST',
        headers,
        body: form
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = 'Ошибка загрузки изображения';
        if (data) {
          if (typeof data.message === 'string') {
            errorMessage = data.message;
          } else if (Array.isArray(data.message)) {
            errorMessage = data.message.join(', ');
          } else if (data.error) {
            errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
          }
        }
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      console.log('✅ Изображение успешно загружено:', result);
      return result;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка загрузки изображения');
    }
  }
);

// Переименование файла через API POST /api/v2/update_file/{uuid}
export const renameFileAPI = createAsyncThunk(
  'fs/renameFileAPI',
  async (
    { uuid, name }: { uuid: string; name: string },
    { dispatch, rejectWithValue, getState }
  ) => {
    // Проверяем авторизацию
    const state = getState() as { fs: FsState };
    if (!state.fs.auth.isAuthenticated || !state.fs.auth.token) {
      return rejectWithValue('Требуется авторизация для переименования файла');
    }
    
    try {
      const fileNode = findNodeById(state.fs.root, uuid);
      if (!fileNode || fileNode.type !== 'file') {
        return rejectWithValue('Файл не найден');
      }

      if (!fileNode.url) {
        return rejectWithValue('URL файла не найден');
      }

      // Загружаем файл по его URL
      const fileResponse = await fetch(fileNode.url);
      if (!fileResponse.ok) {
        throw new Error('Не удалось загрузить файл для переименования');
      }

      const fileContent = await fileResponse.blob();
      
      // Используем новое имя, но сохраняем расширение из старого имени, если оно есть
      const oldFileName = fileNode.name || 'file';
      const oldExt = oldFileName.split('.').pop();
      const newFileName = name.includes('.') ? name : `${name}.${oldExt || ''}`;
      
      // Определяем MIME тип
      let mimeType = fileNode.mime || 'application/octet-stream';
      if (!mimeType || mimeType === 'unknown') {
        const ext = newFileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'md' || ext === 'markdown') mimeType = 'text/markdown';
        else if (ext === 'txt') mimeType = 'text/plain';
      }

      // Создаем File из Blob
      const file = new File([fileContent], newFileName, { type: mimeType });

      // Получаем текущий уровень доступа файла
      const access = typeof fileNode.access === 'number' ? (fileNode.access as 0 | 1) : 1;

      // Создаем FormData и добавляем файл, имя и access
      const form = new FormData();
      form.append('file', file);
      form.append('name', name);
      form.append('access', String(access));

      console.log('📤 Переименование файла через update_file:', {
        uuid,
        oldName: oldFileName,
        newName: name,
        access,
        mimeType
      });

      const res = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/update_file/${uuid}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: form
        }
      );
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = 'Ошибка переименования файла';
        if (data && data.message) {
          if (Array.isArray(data.message)) {
            errorMessage = data.message.join(', ');
          } else if (typeof data.message === 'string') {
            errorMessage = data.message;
          }
        }
        throw new Error(errorMessage);
      }
      
      dispatch(fetchTree());
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка переименования файла');
    }
  }
);

// Изменение уровня доступа файла через API POST /api/v2/update_file/{uuid}
export const updateFileAccessAPI = createAsyncThunk(
  'fs/updateFileAccessAPI',
  async (
    { uuid, access }: { uuid: string; access: 0 | 1 },
    { dispatch, rejectWithValue, getState }
  ) => {
    // Проверяем авторизацию
    const state = getState() as { fs: FsState };
    if (!state.fs.auth.isAuthenticated || !state.fs.auth.token) {
      return rejectWithValue('Требуется авторизация для изменения уровня доступа');
    }
    
    try {
      const fileNode = findNodeById(state.fs.root, uuid);
      if (!fileNode || fileNode.type !== 'file') {
        return rejectWithValue('Файл не найден');
      }

      if (!fileNode.url) {
        return rejectWithValue('URL файла не найден');
      }

      // Загружаем файл по его URL
      const fileResponse = await fetch(fileNode.url);
      if (!fileResponse.ok) {
        throw new Error('Не удалось загрузить файл для обновления доступа');
      }

      const fileContent = await fileResponse.blob();
      const fileName = fileNode.name || 'file';
      
      // Определяем MIME тип
      let mimeType = fileNode.mime || 'application/octet-stream';
      if (!mimeType || mimeType === 'unknown') {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'md' || ext === 'markdown') mimeType = 'text/markdown';
        else if (ext === 'txt') mimeType = 'text/plain';
      }

      // Создаем File из Blob
      const file = new File([fileContent], fileName, { type: mimeType });

      // Создаем FormData и добавляем файл и access
      const form = new FormData();
      form.append('file', file);
      form.append('access', String(access));

      console.log('📤 Изменение уровня доступа файла через update_file:', {
        uuid,
        fileName,
        access,
        mimeType
      });

      const res = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/update_file/${uuid}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: form
        }
      );
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = 'Ошибка изменения уровня доступа';
        if (data && data.message) {
          if (Array.isArray(data.message)) {
            errorMessage = data.message.join(', ');
          } else if (typeof data.message === 'string') {
            errorMessage = data.message;
          }
        }
        throw new Error(errorMessage);
      }
      
      dispatch(fetchTree());
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка изменения уровня доступа');
    }
  }
);

export const updateFileContentAPI = createAsyncThunk(
  'fs/updateFileContentAPI',
  async (
    { uuid, content, fileName }: { uuid: string; content: string; fileName: string },
    { dispatch, rejectWithValue, getState }
  ) => {
    const state = getState() as { fs: FsState };
    if (!state.fs.auth.isAuthenticated || !state.fs.auth.token) {
      return rejectWithValue('Требуется авторизация для редактирования файла');
    }

    try {
      const fileNode = findNodeById(state.fs.root, uuid);
      if (!fileNode || fileNode.type !== 'file') {
        return rejectWithValue('Файл не найден');
      }

      const access = typeof fileNode.access === 'number' ? (fileNode.access as 0 | 1) : 1;

      let finalFileName = fileName || fileNode.name;
      const ext = finalFileName.split('.').pop()?.toLowerCase();
      if (!ext || (ext !== 'md' && ext !== 'pdf')) {
        finalFileName = `${finalFileName}.md`;
      }

      const mimeType = finalFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/markdown';
      const blob = new Blob([content], { type: mimeType });
      const form = new FormData();
      form.append('file', blob, finalFileName);
      form.append('access', String(access));

      console.log('📤 Обновление файла через update_file:', {
        uuid,
        fileName: finalFileName,
        access
      });

      const updateRes = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/update_file/${uuid}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: form
        }
      );

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        throw new Error((errorData && errorData.message) || 'Не удалось обновить файл');
      }

      dispatch(fetchTree());
      return await updateRes.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка сохранения файла');
    }
  }
);

// Thunk: удаление файла через API DELETE /api/v2/delete_file/{uuid}
export const deleteFileAPI = createAsyncThunk(
  'fs/deleteFileAPI',
  async (
    { uuid }: { uuid: string },
    { dispatch, rejectWithValue, getState }
  ) => {
    // Проверяем авторизацию
    const state = getState() as { fs: FsState };
    if (!state.fs.auth.isAuthenticated || !state.fs.auth.token) {
      return rejectWithValue('Требуется авторизация для удаления файла');
    }
    
    try {
      const res = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/delete_file/${uuid}`,
        { 
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка удаления файла');
      }
      dispatch(fetchTree());
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

// Thunk: удаление папки через API DELETE /api/v2/delete_folder/{uuid}
export const deleteFolderAPI = createAsyncThunk(
  'fs/deleteFolderAPI',
  async (
    { uuid }: { uuid: string },
    { dispatch, rejectWithValue, getState }
  ) => {
    // Проверяем авторизацию
    const state = getState() as { fs: FsState };
    if (!state.fs.auth.isAuthenticated || !state.fs.auth.token) {
      return rejectWithValue('Требуется авторизация для удаления папки');
    }
    
    try {
      const url = `https://api.alephtrade.com/backend_wiki/api/v2/delete_folder/${uuid}`;
      console.log('🗑️ Отправка запроса на удаление папки:', {
        uuid,
        url
      });
      
      const res = await fetch(url, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      const responseData = await res.json().catch(() => ({}));
      console.log('📥 Ответ от API delete_folder:', {
        status: res.status,
        ok: res.ok,
        response: responseData
      });
      
      if (!res.ok) {
        throw new Error((responseData && responseData.message) || 'Ошибка удаления папки');
      }
      
      dispatch(fetchTree());
      return responseData;
    } catch (e: any) {
      console.error('❌ Ошибка при удалении папки:', e);
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

// Thunk: перемещение и/или переименование папки/файла (PATCH /api/v2/update_structure/{uuid})
export const moveNodeAPI = createAsyncThunk(
  'fs/moveNodeAPI',
  async (
    { uuid, parent_uuid, name, access, after_uuid, before_uuid, order }: { 
      uuid: string; 
      parent_uuid?: string; 
      name?: string; 
      access?: number;
      after_uuid?: string; // UUID файла, после которого нужно вставить
      before_uuid?: string; // UUID файла, перед которым нужно вставить
      order?: number; // Позиция в списке
    },
    { dispatch, rejectWithValue, getState }
  ) => {
    // Проверяем авторизацию
    const state = getState() as { fs: FsState };
    if (!state.fs.auth.isAuthenticated || !state.fs.auth.token) {
      return rejectWithValue('Требуется авторизация для перемещения файла');
    }
    
    try {
      const body: any = {};
      if (name) body.name = name;
      if (typeof access === 'number') body.access = access;
      if (parent_uuid) body.parent_uuid = parent_uuid;
      // Параметры для изменения порядка файлов
      // Пробуем разные варианты в зависимости от того, какие параметры переданы
      if (typeof order === 'number') {
        // Основной параметр - числовая позиция
        body.order = order;
        
        // Альтернативные названия параметра
        body.position = order;
        body.sort_order = order;
        body.position_index = order;
      }
      
      // Если указан after_uuid - файл должен быть после этого файла
      if (after_uuid) {
        body.after_uuid = after_uuid;
        body.insert_after = after_uuid;
      }
      
      // Если указан before_uuid - файл должен быть перед этим файлом
      if (before_uuid) {
        body.before_uuid = before_uuid;
        body.insert_before = before_uuid;
      }
      
      console.log('📤 Отправка запроса на изменение порядка:', {
        uuid,
        body: JSON.stringify(body),
        bodyObject: body,
        url: `https://api.alephtrade.com/backend_wiki/api/v2/update_structure/${uuid}`
      });
      
              const res = await fetch(
                `https://api.alephtrade.com/backend_wiki/api/v2/update_structure/${uuid}`,
                {
                  method: 'PATCH',
                  headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                  body: JSON.stringify(body)
                }
              );
      
      const responseData = await res.json().catch(() => ({}));
      console.log('📥 Ответ от API update_structure:', {
        status: res.status,
        ok: res.ok,
        response: responseData,
        responseString: JSON.stringify(responseData)
      });
      
      if (!res.ok) {
        throw new Error((responseData && responseData.message) || 'Ошибка перемещения');
      }
      
      await dispatch(fetchTree());
      return responseData;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

// Auth API methods
export const sendSms = createAsyncThunk(
  'auth/sendSms',
  async (phone: string, { rejectWithValue }) => {
    try {
      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/send_sms', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ phone })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка отправки SMS');
      }
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

export const confirmSms = createAsyncThunk(
  'auth/confirmSms',
  async ({ phone, code }: { phone: string; code: string }, { rejectWithValue }) => {
    try {
      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/confirm_sms', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ phone, code })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Неверный код');
      }
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

export const getUser = createAsyncThunk(
  'auth/getUser',
  async (token: string, { rejectWithValue }) => {
    try {
      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/user/get', {
        method: 'GET',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || '');
      }
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || '');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (token: string, { rejectWithValue }) => {
    try {
      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/user/logout', {
        method: 'GET',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка выхода');
      }
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

// Thunk: поиск через API POST /api/v2/search
export const searchAPI = createAsyncThunk(
  'fs/searchAPI',
  async (query: string, { rejectWithValue, getState }) => {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }
      
      // Проверяем авторизацию для определения уровня доступа
      const state = getState() as { fs: FsState };
      const isAuthenticated = state.fs.auth.isAuthenticated && !!state.fs.auth.token;
      const accessLevel = isAuthenticated ? 0 : 0; // Для неавторизованных только публичные файлы
      
      const res = await fetch(
        'https://api.alephtrade.com/backend_wiki/api/v2/search',
        {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            search_string: query.trim(),
            access: accessLevel
          })
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка поиска');
      }
      const response = await res.json() as { 
        status: string; 
        results: Array<{
          metadata: {
            uuid_file: string;
            filename: string;
            wiki_url?: string;
            type?: string;
            chunk_idx?: number;
          };
          page_content: string;
          score?: number;
        }>; 
        access?: number; 
        guard?: any 
      };
      
      // API возвращает результаты векторного поиска, нужно преобразовать их в FsNode[]
      const results = Array.isArray(response.results) ? response.results : [];
      
      // Получаем дерево файлов для получения полной информации о файлах
      const root = state.fs.root;
      
      // Функция для поиска файла в дереве по UUID
      const findFileInTree = (node: FsNode, uuid: string): FsNode | null => {
        if (node.id === uuid && node.type === 'file') {
          return node;
        }
        if (node.children) {
          for (const child of node.children) {
            const found = findFileInTree(child, uuid);
            if (found) return found;
          }
        }
        return null;
      };
      
      // Создаем Map для уникальных файлов (по uuid_file)
      // Используем Map с информацией о максимальном score для каждого файла
      const uniqueFiles = new Map<string, { node: FsNode; maxScore: number }>();
      
      // Сначала собираем все результаты с их scores
      for (const result of results) {
        const uuid = result.metadata?.uuid_file;
        if (!uuid) continue;
        
        const score = result.score || 0;
        
        // Если файл уже добавлен, обновляем score только если текущий выше
        if (uniqueFiles.has(uuid)) {
          const existing = uniqueFiles.get(uuid)!;
          if (score > existing.maxScore) {
            existing.maxScore = score;
          }
          continue; // Пропускаем, так как файл уже обработан
        }
        
        // Пытаемся найти файл в дереве для получения полной информации
        let fileNode = root ? findFileInTree(root, uuid) : null;
        
        if (fileNode) {
          // Используем информацию из дерева (включая s3_url)
          uniqueFiles.set(uuid, { node: fileNode, maxScore: score });
        } else {
          // Файл не найден в дереве, создаем FsNode из метаданных поиска
          const wikiUrl = result.metadata?.wiki_url;
          const filename = result.metadata?.filename;
          
          // Используем wiki_url напрямую, если он есть (это уже полный URL)
          let s3Url: string;
          if (wikiUrl) {
            s3Url = wikiUrl;
          } else {
            // Fallback: строим URL по старому формату, если wiki_url нет
            let objectUuid = uuid;
            
            // Определяем расширение файла из filename или по умолчанию md
            let extension = 'md';
            if (filename) {
              const filenameParts = filename.split('.');
              if (filenameParts.length > 1) {
                extension = filenameParts[filenameParts.length - 1].toLowerCase();
              }
            }
            s3Url = `https://storage.yandexcloud.net/wiki-docs/${objectUuid}.${extension}`;
          }
          
          // Определяем MIME тип из URL
          let mime = 'text/markdown';
          const lowerUrl = s3Url.toLowerCase();
          if (lowerUrl.endsWith('.pdf')) {
            mime = 'application/pdf';
          } else if (lowerUrl.endsWith('.md') || lowerUrl.endsWith('.markdown')) {
            mime = 'text/markdown';
          } else if (lowerUrl.endsWith('.txt')) {
            mime = 'text/plain';
          }
          
          // Пытаемся извлечь имя файла
          let fileName = filename || uuid;
          
          const fsNode: FsNode = {
            id: uuid,
            type: 'file',
            name: fileName,
            url: s3Url,
            mime: mime,
            access: response.access !== undefined ? response.access : undefined
          };
          
          uniqueFiles.set(uuid, { node: fsNode, maxScore: score });
        }
      }
      
      // Преобразуем Map в массив и сортируем по score (от большего к меньшему)
      const uniqueFilesArray = Array.from(uniqueFiles.values())
        .sort((a, b) => b.maxScore - a.maxScore) // Сортировка по убыванию score
        .map(item => item.node);
      
      console.log('🔍 Результаты поиска после дедупликации:', {
        totalResults: results.length,
        uniqueFiles: uniqueFilesArray.length,
        files: uniqueFilesArray.map(f => ({ id: f.id, name: f.name }))
      });
      
      // Возвращаем массив уникальных файлов, отсортированных по релевантности
      return uniqueFilesArray;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка поиска');
    }
  }
);

const fsSlice = createSlice({
  name: 'fs',
  initialState,
  reducers: {
    selectFolder(state, action: PayloadAction<string>) {
      state.selectedFolderId = action.payload;
      state.selectedFileId = null;
    },
    selectFile(state, action: PayloadAction<string>) {
      state.selectedFileId = action.payload;
      // При выборе файла сбрасываем selectedFolderId, чтобы не выделялась родительская папка
      state.selectedFolderId = '';
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      // Очищаем результаты поиска при пустом запросе
      if (!action.payload || action.payload.trim().length === 0) {
        state.searchResults = [];
        state.searchError = null;
      }
    },
    setSearchType(state, action: PayloadAction<SearchType>) {
      state.searchType = action.payload;
      // Очищаем результаты при смене типа поиска
      state.searchResults = [];
      state.searchError = null;
    },
    createFolder(state, action: PayloadAction<{ parentId?: string; name?: string }>) {
      const parentId = action.payload.parentId ?? state.selectedFolderId;
      const name = action.payload.name?.trim() || 'Новая папка';
      mutateAddFolder(state.root, parentId, name);
    },
    renameItem(state, action: PayloadAction<{ id: string; name: string }>) {
      mutateRename(state.root, action.payload.id, action.payload.name.trim());
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTree.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTree.fulfilled, (state, action: PayloadAction<FsNode[]>) => {
        state.loading = false;
        state.root.children = action.payload;
        // При первой загрузке остаёмся на корне, но не сбрасываем выбранный файл,
        // чтобы прямые ссылки продолжали работать после повторных обновлений дерева
        if (!state.selectedFolderId && !state.selectedFileId) {
          state.selectedFolderId = 'root';
        }
      })
      .addCase(fetchTree.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Ошибка загрузки';
      })
      // Auth cases
      .addCase(sendSms.pending, (state) => {
        state.auth.loading = true;
        state.auth.error = null;
      })
      .addCase(sendSms.fulfilled, (state) => {
        state.auth.loading = false;
      })
      .addCase(sendSms.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.error = action.payload as string;
      })
      .addCase(confirmSms.pending, (state) => {
        state.auth.loading = true;
        state.auth.error = null;
      })
      .addCase(confirmSms.fulfilled, (state, action) => {
        state.auth.loading = false;
        state.auth.token = action.payload.token;
        state.auth.user = action.payload.user;
        state.auth.isAuthenticated = true;
        // Сохраняем токен в localStorage
        try {
          localStorage.setItem('auth_token', action.payload.token);
        } catch (error) {
          console.error('Ошибка сохранения токена:', error);
        }
      })
      .addCase(confirmSms.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.error = action.payload as string;
      })
      .addCase(getUser.pending, (state) => {
        state.auth.loading = true;
        state.auth.error = null;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.auth.loading = false;
        state.auth.user = action.payload;
        state.auth.isAuthenticated = true;
      })
      .addCase(getUser.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.error = action.payload as string;
      })
      .addCase(logout.pending, (state) => {
        state.auth.loading = true;
        state.auth.error = null;
      })
      .addCase(logout.fulfilled, (state, action) => {
        state.auth.loading = false;
        state.auth.user = null;
        state.auth.token = null;
        state.auth.isAuthenticated = false;
        // Сбрасываем выбранные файлы/папки при выходе
        state.selectedFileId = '';
        state.selectedFolderId = 'root';
        // Очищаем токен из localStorage
        try {
          localStorage.removeItem('auth_token');
        } catch (error) {
          console.error('Ошибка удаления токена:', error);
        }
        // Возвращаем action для дальнейшей обработки
        return state;
      })
      .addCase(logout.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.error = action.payload as string;
      })
      // Search cases
      .addCase(searchAPI.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchAPI.fulfilled, (state, action: PayloadAction<FsNode[]>) => {
        state.searchLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchAPI.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
        state.searchResults = [];
      });
  }
});

export const { selectFolder, selectFile, setSearch, setSearchType, createFolder, renameItem } = fsSlice.actions;
export default fsSlice.reducer;


