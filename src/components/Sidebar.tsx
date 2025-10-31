import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useMemo, useState } from 'react';
import { selectFolder, selectFile, moveNodeAPI } from '@/store/fsSlice';
import type { RootState } from '@/store/store';
import fileIcon from '/icon/icons8-файл.svg';

const TreeWrap = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  height: 100%;
`;

const ItemRow = styled.div<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ selected, theme }) => (selected ? theme.colors.primary : 'transparent')};
  color: ${({ selected, theme }) => (selected ? '#fff' : theme.colors.text)};
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-bottom: 2px;
  
  &:hover { 
    background: ${({ selected, theme }) => (selected ? theme.colors.primary : theme.colors.surfaceAlt)};
    transform: translateX(2px);
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

function getFileIcon(mime?: string): JSX.Element {
  return <Icon src={fileIcon} alt="Файл" />;
}

function matches(query: string, name: string) {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}

function TreeNode({ node, level, expanded, toggle }: { 
  node: any; 
  level: number; 
  expanded: Set<string>; 
  toggle: (id: string) => void;
}) {
  const dispatch: any = useDispatch();
  const selectedFolderId = useSelector((s: RootState) => s.fs.selectedFolderId);
  const selectedFileId = useSelector((s: RootState) => s.fs.selectedFileId);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const isFolder = node.type === 'folder';

  const isExpanded = expanded.has(node.id);
  const isSelected = isFolder ? selectedFolderId === node.id : selectedFileId === node.id;

  return (
    <div>
      <ItemRow
        selected={isSelected}
        style={{
          paddingLeft: 8 + level * 16,
          boxShadow: dropTargetId === node.id ? 'inset 0 0 0 2px #16aaff' : undefined,
          background: dropTargetId === node.id ? 'rgba(22,170,255,0.11)' : undefined,
        }}
        onClick={() => {
          if (isFolder) {
            toggle(node.id);
            dispatch(selectFolder(node.id));
          } else {
            dispatch(selectFile(node.id));
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
          if (!isFolder || node.id === 'root') return;
          e.preventDefault();
          const sourceId = e.dataTransfer.getData('text/plain');
          if (!sourceId || sourceId === node.id) return;
          setDropTargetId(null);
          dispatch(moveNodeAPI({ uuid: sourceId, parent_uuid: node.id }));
        }}
        draggable={!isFolder}
        onDragStart={e => {
          if (!isFolder) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', node.id);
          }
        }}
      >
        <Caret>
          {isFolder ? (isExpanded ? '📂' : '📁') : getFileIcon(node.mime)}
        </Caret>
        <Name>{node.name}</Name>
      </ItemRow>
      {isFolder && isExpanded && (node.children ?? [])
        .map((c: any) => (
          <TreeNode 
            key={c.id} 
            node={c} 
            level={level + 1} 
            expanded={expanded} 
            toggle={toggle}
          />
        ))}
    </div>
  );
}

export function Sidebar() {
  const root = useSelector((s: RootState) => s.fs.root);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));
  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  useMemo(() => expanded, [expanded]);

  // Sidebar всегда показывает полное дерево файлов для навигации
  // Результаты поиска показываются только в основной области (FilesList)
  return (
    <TreeWrap>
      <TreeNode 
        node={root} 
        level={0} 
        expanded={expanded} 
        toggle={toggle}
      />
    </TreeWrap>
  );
}


