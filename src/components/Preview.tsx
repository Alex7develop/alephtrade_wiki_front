import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { renameItem } from '@/store/fsSlice';

const Wrap = styled.div`
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.inner};
`;


const Title = styled.div`
  font-weight: 600;
`;

const Body = styled.div`
  padding: 16px;
  color: ${({ theme }) => theme.colors.text};
`;

export function Preview() {
  const dispatch = useDispatch();
  const { root, selectedFileId } = useSelector((s: RootState) => s.fs);

  function find(node: any, id: string | null): any | null {
    if (!id) return null;
    if (node.id === id) return node;
    for (const c of node.children ?? []) {
      const f = find(c, id);
      if (f) return f;
    }
    return null;
  }

  const node = find(root, selectedFileId);

  if (!node) {
    return (
      <Wrap>
        <Toolbar>
          <Title>Выберите элемент слева</Title>
        </Toolbar>
        <Body />
      </Wrap>
    );
  }

  const isFolder = node.type === 'folder';
  return (
    <Wrap>
      <Toolbar>
        <Title>{node.name}</Title>
        <div style={{ flex: 1 }} />
      </Toolbar>
      <Body>
        {isFolder ? (
          <div>Папка содержит: {(node.children ?? []).length} элементов</div>
        ) : (
          <div>
            <div>Тип: {node.mime || 'неизвестно'}</div>
            <div>Предпросмотр недоступен, будет добавлен позже</div>
          </div>
        )}
      </Body>
    </Wrap>
  );
}


