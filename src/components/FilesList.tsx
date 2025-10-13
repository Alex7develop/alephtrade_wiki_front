import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import type { RootState } from '@/store/store';
import { renameItem, selectFile } from '@/store/fsSlice';

const Wrap = styled.div`
  padding: 16px;
`;

const Row = styled.div<{ selected?: boolean }>`
  display: grid;
  grid-template-columns: 1fr 120px;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  background: ${({ selected, theme }) => (selected ? theme.colors.surface : 'transparent')};
  &:hover { background: ${({ theme }) => theme.colors.surface }; }
  overflow: hidden;
`;

const Title = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const Type = styled.div`
  justify-self: end;
  color: ${({ theme }) => theme.colors.primaryAccent};
  background: rgba(58,134,255,.12);
  border: 1px solid rgba(58,134,255,.25);
  height: 26px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

function find(node: any, id: string): any | null {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const f = find(c, id);
    if (f) return f;
  }
  return null;
}

export function FilesList() {
  const dispatch = useDispatch();
  const { root, selectedFolderId, selectedFileId, search } = useSelector((s: RootState) => s.fs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const folder = find(root, selectedFolderId);
  const files = (folder?.children ?? []).filter((c: any) => c.type === 'file');
  const filtered = search ? files.filter((f: any) => f.name.toLowerCase().includes(search.toLowerCase())) : files;

  function getTypeLabel(mime?: string): string {
    if (!mime) return 'file';
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'text/plain') return 'txt';
    if (mime === 'text/markdown') return 'md';
    if (mime.startsWith('image/')) return mime.split('/')[1];
    if (mime.endsWith('wordprocessingml.document')) return 'docx';
    return mime.split('/').pop() || 'file';
  }

  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const commitRename = (id: string) => {
    const newName = editingValue.trim();
    if (newName && filtered.find((f: any) => f.id === id)?.name !== newName) {
      dispatch(renameItem({ id, name: newName }));
    }
    setEditingId(null);
  };

  return (
    <Wrap>
      {filtered.map((f: any) => (
        <Row
          key={f.id}
          selected={selectedFileId === f.id}
          onClick={() => dispatch(selectFile(f.id))}
          onDoubleClick={() => {
            setEditingId(f.id);
            setEditingValue(f.name);
          }}
        >
          {editingId === f.id ? (
            <input
              ref={inputRef}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => commitRename(f.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(f.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              style={{
                height: 28,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: 'inherit',
                padding: '0 8px',
                outline: 'none',
                width: '100%'
              }}
            />
          ) : (
            <Title>{f.name}</Title>
          )}
          <Type>{getTypeLabel(f.mime)}</Type>
        </Row>
      ))}
    </Wrap>
  );
}


