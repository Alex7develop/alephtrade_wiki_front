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
  height: 100%;
  overflow: auto;
`;

const PdfViewer = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  background: white;
`;

const FileInfo = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 500;
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
`;

const UnsupportedFile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
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
  const isPdf = node.mime === 'application/pdf';
  
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
          <>
            <FileInfo>
              <InfoRow>
                <InfoLabel>Тип файла:</InfoLabel>
                <InfoValue>{node.mime || 'неизвестно'}</InfoValue>
              </InfoRow>
              {node.url && (
                <InfoRow>
                  <InfoLabel>URL:</InfoLabel>
                  <InfoValue style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                    {node.url}
                  </InfoValue>
                </InfoRow>
              )}
            </FileInfo>
            
            {isPdf && node.url ? (
              <PdfViewer src={node.url} title={node.name} />
            ) : (
              <UnsupportedFile>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                <div>Предпросмотр для этого типа файла пока недоступен</div>
                {node.url && (
                  <div style={{ marginTop: '8px', fontSize: '14px' }}>
                    <a href={node.url} target="_blank" rel="noopener noreferrer" 
                       style={{ color: '#3a86ff', textDecoration: 'none' }}>
                      Открыть в новой вкладке
                    </a>
                  </div>
                )}
              </UnsupportedFile>
            )}
          </>
        )}
      </Body>
    </Wrap>
  );
}


