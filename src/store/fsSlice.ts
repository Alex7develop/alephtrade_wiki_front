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
    name: '/',
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
};

function mapApiToFs(node: ApiNode): FsNode {
  const fsNode: FsNode = {
    id: node.uuid,
    name: node.name,
    type: node.type,
    url: node.s3_url,
    access: node.access !== undefined ? Number(node.access) : undefined,
    children: node.children?.map(mapApiToFs)
  };
  
  // Определяем MIME тип из URL для файлов
  if (node.type === 'file' && node.s3_url) {
    const extension = node.s3_url.split('.').pop()?.toLowerCase();
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
      default:
        fsNode.mime = extension || 'unknown';
    }
  }
  
  return fsNode;
}

export const fetchTree = createAsyncThunk('fs/fetchTree', async (access: 0 | 1 | undefined = undefined, { rejectWithValue, getState }) => {
  // Получаем состояние для проверки авторизации
  const state = getState() as { fs: FsState };
  const isAuthenticated = state.fs.auth.isAuthenticated && !!state.fs.auth.token;
  
  // Если не авторизован, всегда используем access: 0 для получения только публичных файлов
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
      const form = new FormData();
      form.append('file', file);
      if (parentId && parentId !== 'root') form.append('parent_uuid', parentId);
      
      // Добавляем access только если он передан, иначе используем значение по умолчанию
      const accessValue = typeof access === 'number' ? access : 1;
      form.append('access', String(accessValue));

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/upload_file', {
        method: 'POST',
        headers,
        body: form
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка загрузки файла');
      }
      // обновить дерево после загрузки
      dispatch(fetchTree());
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

// Переименование файла через API PATCH /api/v2/update_file/{uuid}
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
      const res = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/update_file/${uuid}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ name })
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка переименования файла');
      }
      dispatch(fetchTree());
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

// Изменение уровня доступа файла через API PUT /api/v2/update_file/{uuid}
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
      const res = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/update_file/${uuid}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ access })
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка изменения уровня доступа');
      }
      dispatch(fetchTree());
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
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
      const data = (await res.json()) as ApiNode[];
      return data.map(mapApiToFs);
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
        // при первой загрузке остаёмся на корне
        state.selectedFolderId = 'root';
        state.selectedFileId = null;
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


