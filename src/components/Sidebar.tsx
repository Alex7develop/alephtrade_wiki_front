import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useMemo, useState, useRef, useEffect } from 'react';
import { selectFolder, selectFile, moveNodeAPI, renameFileAPI } from '@/store/fsSlice';
import type { RootState } from '@/store/store';
import rightArrowIcon from '/icon/right-arrow-.png';
import downArrowIcon from '/icon/down-arrow.png';
import lockIcon from '/icon/zamok.png';
// import publicIcon from '/icon/open_zamok.png';

const TreeWrap = styled.div`
  padding: 12px;
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
    padding: 10px;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    padding: 8px;
  }
`;

const ItemRow = styled.div<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  height: auto;
  padding: 6px 8px;
  border-radius: 0;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ selected, theme }) => 
    selected 
      ? (theme.mode === 'dark' ? 'rgba(0, 102, 255, 0.15)' : 'rgba(0, 102, 255, 0.08)')
      : 'transparent'};
  font-size: 14px;
  font-weight: 400;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  transition: background-color 0.15s ease;
  margin-bottom: 0;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  
  &:hover { 
    background: ${({ selected, theme }) => 
      selected 
        ? (theme.mode === 'dark' ? 'rgba(0, 102, 255, 0.2)' : 'rgba(0, 102, 255, 0.12)')
        : theme.colors.surfaceAlt};
  }
  
  &:active {
    opacity: 0.8;
  }
  
  /* Мобильные устройства - увеличенные touch targets */
  @media (max-width: 768px) {
    min-height: 44px;
    padding: 10px 8px;
    margin-bottom: 0;
  }
  
  @media (max-width: 480px) {
    min-height: 48px;
    padding: 12px 8px;
    margin-bottom: 0;
  }
`;

const Caret = styled.span<{ $isExpanded?: boolean }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
`;

const FolderIcon = styled.img<{ $isExpanded?: boolean }>`
  width: 16px;
  height: 16px;
  transition: opacity 0.2s ease, transform 0.2s ease;
  opacity: ${({ $isExpanded }) => ($isExpanded ? 0 : 1)};
  transform: ${({ $isExpanded }) => ($isExpanded ? 'rotate(90deg)' : 'rotate(0deg)')};
  position: ${({ $isExpanded }) => ($isExpanded ? 'absolute' : 'relative')};
`;

const DownArrowIcon = styled.img<{ $isExpanded?: boolean }>`
  width: 16px;
  height: 16px;
  transition: opacity 0.2s ease, transform 0.2s ease;
  opacity: ${({ $isExpanded }) => ($isExpanded ? 1 : 0)};
  transform: ${({ $isExpanded }) => ($isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)')};
  position: ${({ $isExpanded }) => ($isExpanded ? 'relative' : 'absolute')};
`;

const IconWrapper = styled.div`
  position: relative;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AccessIndicator = styled.img`
  width: 14px;
  height: 14px;
  margin-left: 6px;
  opacity: 0.7;
  display: inline-block;
  flex-shrink: 0;
`;

const Name = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  display: flex;
  align-items: center;
`;

const EditInput = styled.input`
  flex: 1;
  height: 26px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: 0 8px;
  outline: none;
  font-size: 14px;
  font-weight: 400;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  min-width: 0;
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

// Убрали иконки файлов - теперь просто статьи без иконок

function matches(query: string, name: string) {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}

// Функция для поиска родительской папки файла
function findParentFolder(root: any, fileId: string, parent: any = null): any | null {
  if (root.id === fileId) return parent;
  if (root.children) {
    for (const child of root.children) {
      const found = findParentFolder(child, fileId, root);
      if (found !== null) return found;
    }
  }
  return null;
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
  isAuthenticated,
  root
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
  root: any;
}) {
  const dispatch: any = useDispatch();
  const selectedFolderId = useSelector((s: RootState) => s.fs.selectedFolderId);
  const selectedFileId = useSelector((s: RootState) => s.fs.selectedFileId);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const isFolder = node.type === 'folder';

  const isExpanded = expanded.has(node.id);
  
  // Логика выделения: выделяем именно выбранный элемент
  let isSelected = false;
  if (isFolder) {
    // Для папок: выделяем если это выбранная папка
    isSelected = selectedFolderId === node.id;
  } else {
    // Для файлов: выделяем если это выбранный файл
    isSelected = selectedFileId === node.id;
  }
  
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
        <Caret $isExpanded={isFolder && isExpanded}>
          {isFolder && (node.children?.length > 0) ? (
            <IconWrapper>
              <FolderIcon 
                src={rightArrowIcon} 
                alt="Папка" 
                $isExpanded={isExpanded}
              />
              <DownArrowIcon 
                src={downArrowIcon} 
                alt="Раскрыто" 
                $isExpanded={isExpanded}
              />
            </IconWrapper>
          ) : isFolder ? (
            <IconWrapper style={{ width: '16px', height: '16px' }} />
          ) : null}
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
          <Name>
            {node.name}
            {/* {node.access !== undefined && node.access === 0 && (
              <AccessIndicator src={publicIcon} alt="Публичный документ" title="Публичный документ" />
            )} */}
            {node.access !== undefined && node.access === 1 && (
              <AccessIndicator src={lockIcon} alt="Приватный документ" title="Приватный документ" />
            )}
          </Name>
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
            root={root}
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
        root={root}
      />
    </TreeWrap>
  );
}


