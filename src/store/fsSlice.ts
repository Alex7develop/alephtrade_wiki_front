import { createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';

export type NodeType = 'folder' | 'file';

export interface FsNode {
  id: string;
  type: NodeType;
  name: string;
  children?: FsNode[]; // only for folders
  mime?: string; // for files, optional
}

export interface FsState {
  root: FsNode;
  selectedFolderId: string; // текущая открытая папка
  selectedFileId: string | null; // выбранный файл для предпросмотра
  search: string;
}

const initialState: FsState = {
  root: {
    id: 'root',
    type: 'folder',
    name: 'Компания',
    children: [
      {
        id: 'policies',
        type: 'folder',
        name: 'Политики',
        children: [
          { id: 'sec.pdf', type: 'file', name: 'Инфобезопасность.pdf', mime: 'application/pdf' },
          { id: 'hr.docx', type: 'file', name: 'HR-процессы.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        ]
      },
      {
        id: 'guides',
        type: 'folder',
        name: 'Инструкции',
        children: [
          { id: 'onboarding.md', type: 'file', name: 'Онбординг.md', mime: 'text/markdown' },
          { id: 'vpn.txt', type: 'file', name: 'VPN.txt', mime: 'text/plain' }
        ]
      },
      {
        id: 'deep',
        type: 'folder',
        name: 'Глубокая структура',
        children: [
          {
            id: 'lvl-1',
            type: 'folder',
            name: 'Уровень 1',
            children: [
              {
                id: 'lvl-2',
                type: 'folder',
                name: 'Уровень 2',
                children: [
                  {
                    id: 'lvl-3',
                    type: 'folder',
                    name: 'Уровень 3',
                    children: [
                      {
                        id: 'lvl-4',
                        type: 'folder',
                        name: 'Уровень 4',
                        children: [
                          { id: 'deep-note.txt', type: 'file', name: 'Глубокая заметка.txt', mime: 'text/plain' }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      { id: 'logo.png', type: 'file', name: 'Логотип.png', mime: 'image/png' }
    ]
  },
  selectedFolderId: 'root',
  selectedFileId: null,
  search: ''
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
  }
});

export const { selectFolder, selectFile, setSearch, createFolder, renameItem } = fsSlice.actions;
export default fsSlice.reducer;


