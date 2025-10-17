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

export interface FsState {
  root: FsNode;
  selectedFolderId: string; // текущая открытая папка
  selectedFileId: string | null; // выбранный файл для предпросмотра
  search: string;
  loading: boolean;
  error: string | null;
}

const initialState: FsState = {
  root: {
    id: 'root',
    type: 'folder',
    name: 'Корень',
    children: []
  },
  selectedFolderId: 'root',
  selectedFileId: null,
  search: '',
  loading: false,
  error: null
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
      });
  }
});

export const { selectFolder, selectFile, setSearch, createFolder, renameItem } = fsSlice.actions;
export default fsSlice.reducer;


