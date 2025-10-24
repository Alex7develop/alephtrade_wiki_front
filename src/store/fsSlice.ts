import { createAsyncThunk, createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';

export type NodeType = 'folder' | 'file';

export interface FsNode {
  id: string;
  type: NodeType;
  name: string;
  children?: FsNode[]; // only for folders
  mime?: string; // for files, optional
  url?: string; // for files, optional (s3 url)
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

export interface FsState {
  root: FsNode;
  selectedFolderId: string; // текущая открытая папка
  selectedFileId: string | null; // выбранный файл для предпросмотра
  search: string;
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
  children?: ApiNode[];
};

function mapApiToFs(node: ApiNode): FsNode {
  const fsNode: FsNode = {
    id: node.uuid,
    name: node.name,
    type: node.type,
    url: node.s3_url,
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

export const fetchTree = createAsyncThunk('fs/fetchTree', async () => {
  // Запрашиваем напрямую публичный эндпоинт
  const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/tree');
  if (!res.ok) throw new Error('Не удалось загрузить дерево');
  const data = (await res.json()) as ApiNode[];
  return data.map(mapApiToFs);
});

// Добавляем thunk для создания папки через API
export const createFolderAPI = createAsyncThunk(
  'fs/createFolderAPI',
  async (
    { parentId, name }: { parentId?: string; name?: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      // Позволяем создавать на root, если parentId некорректен
      const parent_uuid = parentId && parentId !== 'root' ? parentId : undefined;
      const reqBody = {
        name: name?.trim() || 'Новая папка',
        ...(parent_uuid ? { parent_uuid } : {}),
        access: 1
      };
      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/create_folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    { parentId, file }: { parentId?: string; file: File },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const form = new FormData();
      form.append('file', file);
      if (parentId && parentId !== 'root') form.append('parent_uuid', parentId);
      form.append('access', '1');

      const res = await fetch('https://api.alephtrade.com/backend_wiki/api/v2/upload_file', {
        method: 'POST',
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
    { dispatch, rejectWithValue }
  ) => {
    try {
      const res = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/update_file/${uuid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
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

// Thunk: удаление файла через API DELETE /api/v2/delete_file/{uuid}
export const deleteFileAPI = createAsyncThunk(
  'fs/deleteFileAPI',
  async (
    { uuid }: { uuid: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const res = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/delete_file/${uuid}`,
        { method: 'DELETE' }
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
    { dispatch, rejectWithValue }
  ) => {
    try {
      const res = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/delete_folder/${uuid}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка удаления папки');
      }
      dispatch(fetchTree());
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || 'Ошибка');
    }
  }
);

// Thunk: перемещение и/или переименование папки/файла (PATCH /api/v2/update_structure/{uuid})
export const moveNodeAPI = createAsyncThunk(
  'fs/moveNodeAPI',
  async (
    { uuid, parent_uuid, name, access }: { uuid: string; parent_uuid?: string; name?: string; access?: number },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const res = await fetch(
        `https://api.alephtrade.com/backend_wiki/api/v2/update_structure/${uuid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(name ? { name } : {}),
            ...(typeof access === 'number' ? { access } : {}),
            ...(parent_uuid ? { parent_uuid } : {})
          })
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.message) || 'Ошибка перемещения');
      }
      await dispatch(fetchTree());
      return await res.json();
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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
      .addCase(logout.fulfilled, (state) => {
        state.auth.loading = false;
        state.auth.user = null;
        state.auth.token = null;
        state.auth.isAuthenticated = false;
        // Очищаем токен из localStorage
        try {
          localStorage.removeItem('auth_token');
        } catch (error) {
          console.error('Ошибка удаления токена:', error);
        }
      })
      .addCase(logout.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.error = action.payload as string;
      });
  }
});

export const { selectFolder, selectFile, setSearch, createFolder, renameItem } = fsSlice.actions;
export default fsSlice.reducer;


