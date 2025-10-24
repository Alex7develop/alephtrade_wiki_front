import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import type { RootState } from '@/store/store';
import { selectFile, moveNodeAPI } from '@/store/fsSlice';
import { renameFileAPI } from '@/store/fsSlice';

const Wrap = styled.div`
  padding: 20px;
  background: ${({ theme }) => theme.colors.surface};
  height: 100%;
  overflow-y: auto;
`;

const Row = styled.div<{ selected?: boolean }>`
  display: grid;
  grid-template-columns: 1fr 100px;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  background: ${({ selected, theme }) => (selected ? theme.colors.primary : 'transparent')};
  color: ${({ selected, theme }) => (selected ? '#fff' : theme.colors.text)};
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  border: 1px solid transparent;
  
  &:hover { 
    background: ${({ selected, theme }) => (selected ? theme.colors.primary : theme.colors.surfaceAlt)};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,.1);
  }
`;

const Title = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Type = styled.div`
  justify-self: end;
  color: ${({ theme }) => theme.colors.textMuted};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  height: 24px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
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
  const dispatch: any = useDispatch();
  const { root, selectedFolderId, selectedFileId, search } = useSelector((s: RootState) => s.fs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
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

  function getFileIcon(mime?: string): string {
    if (!mime) return '📄';
    if (mime === 'application/pdf') return '📄';
    if (mime === 'text/markdown') return '📝';
    if (mime === 'text/plain') return '📄';
    if (mime.startsWith('image/')) return '🖼️';
    if (mime.endsWith('wordprocessingml.document')) return '📄';
    return '📄';
  }

  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const commitRename = async (id: string) => {
    const newName = editingValue.trim();
    if (newName && filtered.find((f: any) => f.id === id)?.name !== newName) {
      await dispatch(renameFileAPI({ uuid: id, name: newName }));
    }
    setEditingId(null);
  };

  return (
    <Wrap>
      {filtered.map((f: any) => (
        <Row
          key={f.id}
          selected={selectedFileId === f.id}
          style={{
            boxShadow: draggingId === f.id ? '0 0 8px #3178ff' :
              dropTargetId === f.id ? 'inset 0 0 0 2px #31a8ff' : undefined
          }}
          draggable
          onDragStart={e => {
            setDraggingId(f.id);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', f.id);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDropTargetId(null);
          }}
          onDragOver={e => {
            e.preventDefault();
          }}
          onDrop={e => {
            e.preventDefault();
            setDropTargetId(null);
          }}
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
            <Title>
              <span>{getFileIcon(f.mime)}</span>
              {f.name}
            </Title>
          )}
          <Type>{getTypeLabel(f.mime)}</Type>
        </Row>
      ))}
      {/* Прокидываем drop на сам список — если drag file, drop на фон = file dvig в текущую папку (имеет смысл только при drag с другой вкладки/уровня) */}
      <div
        style={{height:8, width:'100%'}}
        onDragOver={e => {e.preventDefault();}}
        onDrop={e => {
          // Определим id drag-элемента
          const id = e.dataTransfer.getData('text/plain');
          if (id && id !== selectedFolderId && folder?.id) {
            dispatch(moveNodeAPI({ uuid: id, parent_uuid: folder.id }));
          }
        }}
      />
    </Wrap>
  );
}


