import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useMemo, useState, useRef, useEffect } from 'react';
import { selectFolder, selectFile, moveNodeAPI, renameFileAPI } from '@/store/fsSlice';
import type { RootState } from '@/store/store';
import fileIcon from '/icon/icons8-файл.svg';

const TreeWrap = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    padding: 12px;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    padding: 8px;
  }
`;

const ItemRow = styled.div<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  height: auto;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ selected, theme }) => (selected ? theme.colors.primary : 'transparent')};
  color: ${({ selected, theme }) => (selected ? '#fff' : theme.colors.text)};
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  
  &:hover { 
    background: ${({ selected, theme }) => (selected ? theme.colors.primary : theme.colors.surfaceAlt)};
    transform: translateX(2px);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  /* Мобильные устройства - увеличенные touch targets */
  @media (max-width: 768px) {
    min-height: 48px;
    padding: 12px;
    margin-bottom: 6px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
  
  @media (max-width: 480px) {
    min-height: 52px;
    padding: 14px 12px;
    margin-bottom: 8px;
  }
`;

const Caret = styled.span`
  width: 20px;
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Icon = styled.img`
  width: 16px;
  height: 16px;
  margin-right: 4px;
  filter: ${({ theme }) => theme.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'};
`;

const Name = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

const EditInput = styled.input`
  flex: 1;
  height: 28px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: 0 8px;
  outline: none;
  font-size: 14px;
  font-weight: 500;
  min-width: 0;
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(90,90,90,0.1);
  }
`;

function getFileIcon(mime?: string): JSX.Element {
  return <Icon src={fileIcon} alt="Файл" />;
}

function matches(query: string, name: string) {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}

function TreeNode({ 
  node, 
  level, 
  expanded, 
  toggle,
  editingId,
  setEditingId,
  editingValue,
  setEditingValue,
  commitRename,
  inputRef,
  isAuthenticated
}: { 
  node: any; 
  level: number; 
  expanded: Set<string>; 
  toggle: (id: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editingValue: string;
  setEditingValue: (value: string) => void;
  commitRename: (id: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  isAuthenticated: boolean;
}) {
  const dispatch: any = useDispatch();
  const selectedFolderId = useSelector((s: RootState) => s.fs.selectedFolderId);
  const selectedFileId = useSelector((s: RootState) => s.fs.selectedFileId);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const isFolder = node.type === 'folder';

  const isExpanded = expanded.has(node.id);
  const isSelected = isFolder ? selectedFolderId === node.id : selectedFileId === node.id;
  const isEditing = editingId === node.id;

  return (
    <div>
      <ItemRow
        selected={isSelected}
        style={{
          paddingLeft: 8 + level * 16,
          boxShadow: dropTargetId === node.id ? 'inset 0 0 0 2px #16aaff' : undefined,
          background: dropTargetId === node.id ? 'rgba(22,170,255,0.11)' : undefined,
        }}
        onClick={(e) => {
          // Не обрабатываем клик, если идет редактирование
          if (isEditing) {
            e.stopPropagation();
            return;
          }
          if (isFolder) {
            toggle(node.id);
            dispatch(selectFolder(node.id));
          } else {
            dispatch(selectFile(node.id));
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          // Переименование только для файлов и только если авторизован
          if (!isFolder && node.type === 'file' && isAuthenticated) {
            setEditingId(node.id);
            setEditingValue(node.name);
          }
        }}
        title={node.name}
        onDragOver={e => {
          if (isFolder && node.id !== 'root') {
            e.preventDefault();
            setDropTargetId(node.id);
          }
        }}
        onDragLeave={e => { if (isFolder) setDropTargetId(null); }}
        onDrop={e => {
          if (!isAuthenticated) {
            e.preventDefault();
            return;
          }
          if (!isFolder || node.id === 'root') return;
          e.preventDefault();
          const sourceId = e.dataTransfer.getData('text/plain');
          if (!sourceId || sourceId === node.id) return;
          setDropTargetId(null);
          dispatch(moveNodeAPI({ uuid: sourceId, parent_uuid: node.id }));
        }}
        draggable={!isFolder && isAuthenticated}
        onDragStart={e => {
          if (!isFolder && isAuthenticated) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', node.id);
          } else {
            e.preventDefault();
          }
        }}
      >
        <Caret>
          {isFolder ? (isExpanded ? '📂' : '📁') : getFileIcon(node.mime)}
        </Caret>
        {isEditing ? (
          <EditInput
            ref={inputRef}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => commitRename(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitRename(node.id);
              }
              if (e.key === 'Escape') {
                setEditingId(null);
                setEditingValue('');
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <Name>{node.name}</Name>
        )}
      </ItemRow>
      {isFolder && isExpanded && (node.children ?? [])
        .map((c: any) => (
          <TreeNode 
            key={c.id} 
            node={c} 
            level={level + 1} 
            expanded={expanded} 
            toggle={toggle}
            editingId={editingId}
            setEditingId={setEditingId}
            editingValue={editingValue}
            setEditingValue={setEditingValue}
            commitRename={commitRename}
            inputRef={inputRef}
            isAuthenticated={isAuthenticated}
          />
        ))}
    </div>
  );
}

export function Sidebar() {
  const dispatch: any = useDispatch();
  const root = useSelector((s: RootState) => s.fs.root);
  const auth = useSelector((s: RootState) => s.fs.auth);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isAuthenticated = auth.isAuthenticated && !!auth.token;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  useMemo(() => expanded, [expanded]);

  // Фокус на input при начале редактирования
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Функция для сохранения переименования
  const commitRename = async (id: string) => {
    if (!isAuthenticated) {
      setEditingId(null);
      setEditingValue('');
      return;
    }
    
    const newName = editingValue.trim();
    if (!newName) {
      // Если имя пустое, отменяем редактирование
      setEditingId(null);
      return;
    }
    
    // Находим файл в дереве для проверки текущего имени
    const findNode = (node: any): any => {
      if (node.id === id) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }
      }
      return null;
    };
    
    const currentNode = findNode(root);
    if (currentNode && currentNode.name !== newName) {
      try {
        await dispatch(renameFileAPI({ uuid: id, name: newName }));
        // После успешного переименования дерево обновится автоматически через fetchTree в renameFileAPI
      } catch (error) {
        console.error('Ошибка переименования файла:', error);
        // В случае ошибки оставляем режим редактирования
        return;
      }
    }
    setEditingId(null);
    setEditingValue('');
  };

  // Sidebar всегда показывает полное дерево файлов для навигации
  // Результаты поиска показываются только в основной области (FilesList)
  return (
    <TreeWrap>
      <TreeNode 
        node={root} 
        level={0} 
        expanded={expanded} 
        toggle={toggle}
        editingId={editingId}
        setEditingId={setEditingId}
        editingValue={editingValue}
        setEditingValue={setEditingValue}
        commitRename={commitRename}
        inputRef={inputRef}
        isAuthenticated={isAuthenticated}
      />
    </TreeWrap>
  );
}


