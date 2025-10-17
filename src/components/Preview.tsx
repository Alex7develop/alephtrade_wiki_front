import styled from 'styled-components';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { marked } from 'marked';
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

const HtmlDoc = styled.iframe`
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

const MdWrap = styled.div`
  height: 100%;
  overflow: auto;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 16px;
  
  /* базовые стили markdown */
  h1, h2, h3 { margin: 16px 0 8px; }
  p { margin: 8px 0; }
  code { background: rgba(255,255,255,.06); padding: 2px 6px; border-radius: 6px; }
  pre { background: rgba(255,255,255,.06); padding: 12px; border-radius: 8px; overflow: auto; }
  a { color: ${({ theme }) => theme.colors.primary}; text-decoration: none; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid ${({ theme }) => theme.colors.border}; padding: 8px; }
  blockquote { border-left: 3px solid ${({ theme }) => theme.colors.primary}; padding-left: 12px; color: ${({ theme }) => theme.colors.textMuted}; }
`;

export function Preview() {
  const dispatch = useDispatch();
  const { root, selectedFileId } = useSelector((s: RootState) => s.fs);

  // Markdown preview state must be declared before any return to preserve hooks order
  const [mdLoading, setMdLoading] = useState(false);
  const [mdError, setMdError] = useState<string | null>(null);
  const [mdText, setMdText] = useState<string>('');
  const [mdHtml, setMdHtml] = useState<string>('');

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

  // Load markdown content when applicable. The hook is always called.
  useEffect(() => {
    let aborted = false;
    const isMd = !!(node && ((node.mime === 'text/markdown') || node.url?.toLowerCase().endsWith('.md')));
    if (isMd && node?.url) {
      // Dev: route through Vite proxy '/yc' to bypass CORS
      // Prod: use CORS-friendly public proxy for read-only content
      const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)/.test(window.location.hostname);
      let mdUrl = node.url;
      if (node.url.startsWith('https://storage.yandexcloud.net')) {
        mdUrl = isLocalhost
          ? node.url.replace('https://storage.yandexcloud.net', '/yc')
          : `https://api.allorigins.win/raw?url=${encodeURIComponent(node.url)}`;
      }
      setMdLoading(true);
      setMdError(null);
      setMdText('');
      setMdHtml('');
      fetch(mdUrl)
        .then((r) => {
          if (!r.ok) throw new Error('Не удалось загрузить Markdown');
          return r.text();
        })
        .then((t) => {
          if (aborted) return;
          setMdText(t);
          try {
            // Convert markdown to HTML and inject base href so relative assets resolve to source directory
            const htmlBody = marked.parse(t);
            const baseHref = (node.url || '').replace(/([^/]+)$/,''); // directory of the file
            const themedStyles = `
              <style>
                body { margin: 0; font: 14px/1.6 -apple-system, Segoe UI, Roboto, Inter, Arial; color: #e6eefc; background: #1c2541; }
                .container { padding: 16px; }
                h1,h2,h3 { color: #e6eefc; }
                a { color: #73a9ff; text-decoration: none; }
                pre, code { background: rgba(255,255,255,.06); color: #e6eefc; }
                pre { padding: 12px; border-radius: 8px; overflow: auto; }
                img { max-width: 100%; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #2e3a5a; padding: 8px; }
                blockquote { border-left: 3px solid #3a86ff; padding-left: 12px; color: #a9b8d4; }
              </style>`;
            const documentHtml = `<!doctype html><html><head><meta charset="utf-8"/><base href="${baseHref}">${themedStyles}</head><body><div class="container">${htmlBody}</div></body></html>`;
            setMdHtml(documentHtml);
          } catch (e: any) {
            setMdError(e?.message || 'Ошибка парсинга Markdown');
          }
        })
        .catch((e: any) => { if (!aborted) setMdError(e.message || 'Ошибка загрузки'); })
        .finally(() => { if (!aborted) setMdLoading(false); });
    } else {
      // reset when not markdown
      setMdLoading(false);
      setMdError(null);
      setMdText('');
      setMdHtml('');
    }
    return () => { aborted = true; };
  }, [node]);

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
  const isMd = node.mime === 'text/markdown' || node.url?.toLowerCase().endsWith('.md');
  
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
            {/* <FileInfo> Отображение блока с информацией о файле
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
            </FileInfo> */}
            
            {isPdf && node.url ? (
              <PdfViewer src={node.url} title={node.name} />
            ) : isMd ? (
              <MdWrap>
                {mdLoading && <div>Загрузка Markdown…</div>}
                {mdError && <div style={{ color: '#ff6b6b' }}>Ошибка: {mdError}</div>}
                {!mdLoading && !mdError && (
                  <HtmlDoc srcDoc={mdHtml} title={node.name} />
                )}
              </MdWrap>
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


