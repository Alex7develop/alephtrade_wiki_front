import styled, { useTheme } from 'styled-components';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { marked } from 'marked';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { deleteFileAPI, deleteFolderAPI, selectFile, selectFolder } from '@/store/fsSlice';

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

const ToolbarSpacer = styled.div`
  flex: 1;
`;

const ActionBtn = styled.button`
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background .15s ease, border-color .15s ease;
  &:hover { background: ${({ theme }) => theme.colors.surface}; }
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
  const dispatch: any = useDispatch();
  const { root, selectedFileId } = useSelector((s: RootState) => s.fs);
  const theme = useTheme();

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
      const mdUrl = node.url;
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
                body { margin: 0; font: 14px/1.6 -apple-system, Segoe UI, Roboto, Inter, Arial; color: ${theme.colors.text}; background: ${theme.colors.surfaceAlt}; }
                .container { padding: 16px; }
                h1,h2,h3 { color: ${theme.colors.text}; }
                a { color: ${theme.colors.primaryAccent}; text-decoration: none; }
                pre, code { background: rgba(0,0,0,.06); color: ${theme.colors.text}; }
                pre { padding: 12px; border-radius: 8px; overflow: auto; }
                img { max-width: 100%; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid ${theme.colors.border}; padding: 8px; }
                blockquote { border-left: 3px solid ${theme.colors.primary}; padding-left: 12px; color: ${theme.colors.textMuted}; }
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

  // Rebuild HTML when theme changes without refetching
  useEffect(() => {
    const isMd = !!(node && ((node.mime === 'text/markdown') || node.url?.toLowerCase().endsWith('.md')));
    if (!isMd || !mdText || !node?.url) return;
    try {
      const htmlBody = marked.parse(mdText);
      const baseHref = (node.url || '').replace(/([^/]+)$/,'');
      const themedStyles = `
        <style>
          body { margin: 0; font: 14px/1.6 -apple-system, Segoe UI, Roboto, Inter, Arial; color: ${theme.colors.text}; background: ${theme.colors.surfaceAlt}; }
          .container { padding: 16px; }
          h1,h2,h3 { color: ${theme.colors.text}; }
          a { color: ${theme.colors.primaryAccent}; text-decoration: none; }
          pre, code { background: rgba(0,0,0,.06); color: ${theme.colors.text}; }
          pre { padding: 12px; border-radius: 8px; overflow: auto; }
          img { max-width: 100%; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid ${theme.colors.border}; padding: 8px; }
          blockquote { border-left: 3px solid ${theme.colors.primary}; padding-left: 12px; color: ${theme.colors.textMuted}; }
        </style>`;
      const documentHtml = `<!doctype html><html><head><meta charset="utf-8"/><base href="${baseHref}">${themedStyles}</head><body><div class="container">${htmlBody}</div></body></html>`;
      setMdHtml(documentHtml);
    } catch { /* ignore */ }
  }, [theme, mdText, node]);

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
  
  function downloadMd() {
    if (!node?.url) return;
    if (isMd && mdText) {
      const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const name = (node.name?.endsWith('.md') ? node.name : `${node.name || 'document'}.md`);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else {
      // fallback: просто открыть исходный URL (браузер решит скачать/открыть)
      window.open(node.url, '_blank');
    }
  }
  
  const deleteFile = async () => {
    if (!node?.id) return;
    if (window.confirm('Удалить файл безвозвратно?')) {
      await dispatch(deleteFileAPI({ uuid: node.id }));
      dispatch(selectFile(''));
    }
  };

  const deleteFolder = async () => {
    if (!node?.id || node.id === 'root') return;
    if (window.confirm('Удалить папку со всем содержимым?')) {
      await dispatch(deleteFolderAPI({ uuid: node.id }));
      dispatch(selectFolder('root'));
    }
  };

  return (
    <Wrap>
      <Toolbar>
        <ToolbarSpacer />
        {!isFolder && (
          <ActionBtn onClick={deleteFile} title="Удалить файл" style={{ color:'#d4183a', marginRight:4 }}>
            ✖
          </ActionBtn>
        )}
        {isFolder && node.id !== 'root' && (
          <ActionBtn onClick={deleteFolder} title="Удалить папку" style={{ color:'#d4183a', marginRight:4 }}>
            ✖
          </ActionBtn>
        )}
        {isMd && (
          <ActionBtn onClick={downloadMd} title="Скачать .md">
            ⬇ Скачать
          </ActionBtn>
        )}
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


