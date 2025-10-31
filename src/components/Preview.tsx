import styled, { useTheme } from 'styled-components';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import html2canvas from 'html2canvas';
import downloadIcon from '/icon/download_15545982.png';
import deleteIcon from '/icon/dustbin_14492622.png';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  deleteFileAPI,
  deleteFolderAPI,
  selectFile,
  selectFolder,
} from '@/store/fsSlice';
import { FilesList } from './FilesList';

const Wrap = styled.div`
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;

  /* Мобильные устройства */
  @media (max-width: 768px) {
    grid-template-rows: auto 1fr;
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
  position: sticky;
  top: 0;
  z-index: 10;

  /* Мобильные устройства */
  @media (max-width: 768px) {
    padding: 12px 16px;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Очень маленькие экраны */
  @media (max-width: 480px) {
    padding: 10px 12px;
    gap: 6px;
    flex-wrap: wrap;
  }
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
`;

const ToolbarSpacer = styled.div`
  flex: 1;
`;

const ActionBtn = styled.button`
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-1px);
  }
  &:active {
    transform: scale(0.95);
  }
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    min-height: 44px;
    padding: 0 14px;
    gap: 6px;
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    min-height: 48px;
    padding: 0 12px;
    gap: 6px;
    font-size: 12px;
  }
`;

const Icon = styled.img`
  width: 16px;
  height: 16px;
`;

const Body = styled.div`
  padding: 24px;
  color: ${({ theme }) => theme.colors.text};
  height: 100%;
  overflow: auto;
  overflow-x: hidden;
  background: ${({ theme }) => theme.colors.surface};
  -webkit-overflow-scrolling: touch;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    padding: 16px;
    padding-bottom: 80px; /* Место для bottom navigation */
  }
  
  @media (max-width: 480px) {
    padding: 12px;
    padding-bottom: 70px;
  }
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
  h1,
  h2,
  h3 {
    margin: 16px 0 8px;
  }
  p {
    margin: 8px 0;
  }
  code {
    background: rgba(255, 255, 255, 0.06);
    padding: 2px 6px;
    border-radius: 6px;
  }
  pre {
    background: rgba(255, 255, 255, 0.06);
    padding: 12px;
    border-radius: 8px;
    overflow: auto;
  }
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    border: 1px solid ${({ theme }) => theme.colors.border};
    padding: 8px;
  }
  blockquote {
    border-left: 3px solid ${({ theme }) => theme.colors.primary};
    padding-left: 12px;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

export function Preview() {
  const dispatch: any = useDispatch();
  const { root, selectedFileId, selectedFolderId, search } = useSelector((s: RootState) => s.fs);
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

  // Ищем узел по selectedFileId или selectedFolderId
  // Приоритет у selectedFileId (если выбран файл)
  const node = find(root, selectedFileId || selectedFolderId);

  // Load markdown content when applicable. The hook is always called.
  useEffect(() => {
    let aborted = false;
    const isMd = !!(
      node &&
      (node.mime === 'text/markdown' || node.url?.toLowerCase().endsWith('.md'))
    );
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
            const baseHref = (node.url || '').replace(/([^/]+)$/, ''); // directory of the file
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
        .catch((e: any) => {
          if (!aborted) setMdError(e.message || 'Ошибка загрузки');
        })
        .finally(() => {
          if (!aborted) setMdLoading(false);
        });
    } else {
      // reset when not markdown
      setMdLoading(false);
      setMdError(null);
      setMdText('');
      setMdHtml('');
    }
    return () => {
      aborted = true;
    };
  }, [node]);

  // Rebuild HTML when theme changes without refetching
  useEffect(() => {
    const isMd = !!(
      node &&
      (node.mime === 'text/markdown' || node.url?.toLowerCase().endsWith('.md'))
    );
    if (!isMd || !mdText || !node?.url) return;
    try {
      const htmlBody = marked.parse(mdText);
      const baseHref = (node.url || '').replace(/([^/]+)$/, '');
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
    } catch {
      /* ignore */
    }
  }, [theme, mdText, node]);

  // Определяем, находимся ли мы на мобильном устройстве
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 768
  );
  
  // Отслеживаем изменение размера окна
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Если есть активный поиск, но файл не выбран - показываем список результатов поиска
  if (search && search.trim().length > 0 && !selectedFileId) {
    return <FilesList />;
  }

  // Если ничего не выбрано (без активного поиска), показываем список файлов
  if (!node) {
    return <FilesList />;
  }

  const isFolder = node.type === 'folder';
  
  // На мобильных устройствах, если выбрана папка (не файл), показываем список файлов
  if (isMobile && isFolder && !selectedFileId) {
    return <FilesList />;
  }
  const isPdf = node.mime === 'application/pdf';
  const isMd =
    node.mime === 'text/markdown' || node.url?.toLowerCase().endsWith('.md');

  async function downloadMd() {
    if (!node?.url) return;
    if (isMd && mdText) {
      try {
        // Преобразуем Markdown в HTML с правильной кодировкой
        const htmlBody = await marked.parse(mdText);
        const baseHref = (node.url || '').replace(/([^/]+)$/, '');
        
        const documentHtml = `
          <!doctype html>
          <html lang="ru">
          <head>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <base href="${baseHref}">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
              body { 
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                font-size: 14px; 
                line-height: 1.6; 
                color: #333; 
                background: white; 
                padding: 20px;
                margin: 0;
                max-width: 800px;
                margin: 0 auto;
              }
              h1, h2, h3, h4, h5, h6 { 
                color: #333; 
                font-weight: 600;
                margin: 20px 0 10px 0;
              }
              h1 { font-size: 28px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
              h2 { font-size: 24px; }
              h3 { font-size: 20px; }
              h4 { font-size: 18px; }
              p { margin: 12px 0; }
              a { color: #0066cc; text-decoration: none; }
              a:hover { text-decoration: underline; }
              pre, code { 
                background: #f5f5f5; 
                color: #333; 
                font-family: 'Courier New', 'Monaco', monospace;
                border-radius: 4px;
              }
              pre { 
                padding: 16px; 
                overflow: auto; 
                white-space: pre-wrap;
                border: 1px solid #ddd;
              }
              code { 
                padding: 2px 6px; 
                font-size: 13px;
              }
              img { 
                max-width: 100%; 
                height: auto; 
                display: block;
                margin: 10px 0;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 16px 0;
                border: 1px solid #ddd;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 12px; 
                text-align: left;
              }
              th { 
                background: #f8f9fa; 
                font-weight: 600;
              }
              blockquote { 
                border-left: 4px solid #0066cc; 
                padding-left: 16px; 
                color: #666; 
                margin: 16px 0;
                font-style: italic;
              }
              ul, ol { 
                margin: 12px 0; 
                padding-left: 24px; 
              }
              li { 
                margin: 6px 0; 
              }
              hr {
                border: none;
                border-top: 1px solid #eee;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="markdown-content">${htmlBody}</div>
          </body>
          </html>`;

        // Создаем временный элемент для рендеринга HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = documentHtml;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = '800px';
        tempDiv.style.background = 'white';
        document.body.appendChild(tempDiv);

        // Ждем загрузки шрифтов
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Конвертируем в canvas
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 800,
          height: tempDiv.scrollHeight
        });

        // Удаляем временный элемент
        document.body.removeChild(tempDiv);

        // Создаем PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Сохраняем PDF
        const name = node.name?.endsWith('.md')
          ? node.name.replace('.md', '.pdf')
          : `${node.name || 'document'}.pdf`;
        pdf.save(name);

      } catch (error) {
        console.error('Ошибка генерации PDF:', error);
        // Fallback - скачиваем как HTML
        const htmlBody = await marked.parse(mdText);
        const baseHref = (node.url || '').replace(/([^/]+)$/, '');
        const documentHtml = `
          <!doctype html>
          <html lang="ru">
          <head>
            <meta charset="utf-8"/>
            <base href="${baseHref}">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1, h2, h3 { color: #333; }
              pre { background: #f5f5f5; padding: 10px; }
            </style>
          </head>
          <body>${htmlBody}</body>
          </html>`;
        
        const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = node.name?.endsWith('.md')
          ? node.name.replace('.md', '.html')
          : `${node.name || 'document'}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } else {
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
      try {
        const result = await dispatch(deleteFolderAPI({ uuid: node.id }));
        if (deleteFolderAPI.fulfilled.match(result)) {
          dispatch(selectFolder('root'));
        } else {
          const errorMessage = result.payload as string || 'Не удалось удалить папку';
          alert(`Ошибка: ${errorMessage}`);
        }
      } catch (error: any) {
        console.error('Ошибка при удалении папки:', error);
        alert(`Ошибка: ${error.message || 'Не удалось удалить папку'}`);
      }
    }
  };

  return (
    <Wrap>
      <Toolbar>
        <ToolbarSpacer />
        {!isFolder && (
          <ActionBtn
            onClick={deleteFile}
            title="Удалить файл"
            style={{ color: '#fff', background: '#8a8a8a', borderColor: '#8a8a8a' }}
          >
            <Icon src={deleteIcon} alt="Удалить" />
            Удалить
          </ActionBtn>
        )}
        {isFolder && node.id !== 'root' && (
          <ActionBtn
            onClick={deleteFolder}
            title="Удалить папку"
            style={{ color: '#fff', background: '#8a8a8a', borderColor: '#8a8a8a' }}
          >
            <Icon src={deleteIcon} alt="Удалить папку" />
            Удалить папку
          </ActionBtn>
        )}
        {isMd && (
          <ActionBtn onClick={downloadMd} title="Скачать как PDF">
            <Icon src={downloadIcon} alt="Скачать PDF" />
            Скачать PDF
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
                {mdError && (
                  <div style={{ color: '#ff6b6b' }}>Ошибка: {mdError}</div>
                )}
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
                    <a
                      href={node.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3a86ff', textDecoration: 'none' }}
                    >
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
