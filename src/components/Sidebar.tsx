import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useMemo, useState } from 'react';
import { selectFolder, moveNodeAPI } from '@/store/fsSlice';
import type { RootState } from '@/store/store';

const TreeWrap = styled.div`
  padding: 12px;
`;

const ItemRow = styled.div<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ selected, theme }) => (selected ? 'rgba(255,255,255,.03)' : 'transparent')};
  &:hover { background: rgba(255,255,255,.03); }
`;

const Caret = styled.span`
  width: 16px;
  text-align: center;
`;

const Name = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

function matches(query: string, name: string) {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}

function TreeNode({ node, level, expanded, toggle }: { node: any; level: number; expanded: Set<string>; toggle: (id: string) => void }) {
  const dispatch: any = useDispatch();
  const selectedFolderId = useSelector((s: RootState) => s.fs.selectedFolderId);
  const search = useSelector((s: RootState) => s.fs.search);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const isFolder = node.type === 'folder';
  const visible = !search || matches(search, node.name);
  if (!visible && isFolder) {
    // показываем папку, если в ней есть совпадения
    const anyChildVisible = (node.children ?? []).some((c: any) => matches(search, c.name));
    if (!anyChildVisible) return null;
  } else if (!visible) {
    return null;
  }

  const isExpanded = expanded.has(node.id);

  return (
    <div>
      <ItemRow
        selected={selectedFolderId === node.id}
        style={{
          paddingLeft: 8 + level * 16,
          boxShadow: dropTargetId === node.id ? 'inset 0 0 0 2px #16aaff' : undefined,
          background: dropTargetId === node.id ? 'rgba(22,170,255,0.11)' : undefined,
        }}
        onClick={() => {
          if (isFolder) {
            toggle(node.id);
            dispatch(selectFolder(node.id));
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
        draggable={false}
      >
        <Caret>{isFolder ? (isExpanded ? '▾' : '▸') : null}</Caret>
        <Name>{node.name}</Name>
      </ItemRow>
      {isFolder && isExpanded && (node.children ?? [])
        .filter((c: any) => c.type === 'folder')
        .map((c: any) => (
          <TreeNode key={c.id} node={c} level={level + 1} expanded={expanded} toggle={toggle} />
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
  return (
    <TreeWrap>
      <TreeNode node={root} level={0} expanded={expanded} toggle={toggle} />
    </TreeWrap>
  );
}


