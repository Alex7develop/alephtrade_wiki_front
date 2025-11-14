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
import editIcon from '/icon/edit.svg';
import keyIcon from '/icon/key.png';
import bigLogo from '/icon/big_logo.png';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  deleteFileAPI,
  deleteFolderAPI,
  renameFileAPI,
  updateFileAccessAPI,
  selectFile,
  selectFolder,
} from '@/store/fsSlice';
import { FilesList } from './FilesList';
import { Tooltip } from './Tooltip';

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
  gap: 10px;
  align-items: center;
  padding: 12px 38px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
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
  font-weight: 500;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const ToolbarSpacer = styled.div`
  flex: 1;
`;

const FileNameContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
  
  @media (max-width: 768px) {
    margin-right: 12px;
    gap: 6px;
  }
  
  @media (max-width: 480px) {
    margin-right: 8px;
    gap: 4px;
  }
`;

const FileName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
  
  @media (max-width: 768px) {
    font-size: 13px;
    max-width: 200px;
  }
  
  @media (max-width: 480px) {
    font-size: 12px;
    max-width: 150px;
  }
`;

const EditIcon = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  flex-shrink: 0;
  opacity: 0.6;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    opacity: 1;
  }
  
  &:active {
    opacity: 0.8;
  }
  
  @media (max-width: 480px) {
    width: 28px;
    height: 28px;
  }
`;

const EditIconImg = styled.img`
  width: 16px;
  height: 16px;
  filter: ${({ theme }) => theme.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'};
  
  @media (max-width: 480px) {
    width: 18px;
    height: 18px;
  }
`;

const EditInput = styled.input`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid darkblue;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  min-width: 400px;
  max-width: 400px;
  
  &:focus {
    border-color: darkblue;
  }
  
  @media (max-width: 768px) {
    font-size: 14px;
    min-width: 150px;
    max-width: 200px;
  }
  
  @media (max-width: 480px) {
    font-size: 13px;
    min-width: 120px;
    max-width: 150px;
  }
`;

const EditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const SaveBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: darkblue;
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  padding: 0;
  transition: background-color 0.15s ease;
  
  &:hover {
    background: #000075;
  }
  
  &:active {
    opacity: 0.9;
  }
  
  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
`;

const CancelBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  border-radius: 4px;
  font-size: 18px;
  padding: 0;
  transition: background-color 0.15s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.border};
  }
  
  &:active {
    opacity: 0.8;
  }
  
  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }
`;

const ActionBtn = styled.button`
  height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 400;
  transition: background-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  }
  &:active {
    opacity: 0.8;
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
  padding: 5px;
  color: ${({ theme }) => theme.colors.text};
  height: 100%;
  overflow: auto;
  overflow-x: hidden;
  background: ${({ theme }) => theme.mode === 'light' ? '#ffffff' : theme.colors.surface};
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

const RootWelcome = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  text-align: center;
  padding: 40px 20px;
`;

const RootLogo = styled.img`
  width: 200px;
  height: auto;
  margin-bottom: 12px;
  animation: logoAppear 1.2s ease-out forwards, logoPulse 3s ease-in-out 1.5s infinite;
  
  @keyframes logoAppear {
    0% {
      opacity: 0;
      transform: scale(0.85) translateY(15px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes logoPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.025);
    }
  }
  
  @media (max-width: 768px) {
    width: 150px;
    margin-bottom: 24px;
  }
  
  @media (max-width: 480px) {
    width: 120px;
    margin-bottom: 20px;
  }
`;

const RootTitle = styled.h1`
  font-size: 32px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 12px 0;
  
  @media (max-width: 768px) {
    font-size: 28px;
  }
  
  @media (max-width: 480px) {
    font-size: 24px;
  }
`;

const RootSubtitle = styled.p`
  font-size: 18px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 16px;
  }
  
  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

const MdWrap = styled.div`
  height: 100%;
  overflow: auto;
  background: ${({ theme }) => theme.mode === 'light' ? '#ffffff' : theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.sm};
  // border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 3px;

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
  const { root, selectedFileId, selectedFolderId, search, auth } = useSelector((s: RootState) => s.fs);
  const theme = useTheme();

  // Markdown preview state must be declared before any return to preserve hooks order
  const [mdLoading, setMdLoading] = useState(false);
  const [mdError, setMdError] = useState<string | null>(null);
  const [mdText, setMdText] = useState<string>('');
  const [mdHtml, setMdHtml] = useState<string>('');
  
  // Состояние для редактирования имени файла
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');

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
  
  // Сбрасываем режим редактирования при смене файла или при выходе
  useEffect(() => {
    setIsEditingName(false);
    setEditingNameValue('');
  }, [selectedFileId, selectedFolderId, auth.isAuthenticated, auth.token]);

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
                body { margin: 0; font: 14px/1.6 -apple-system, Segoe UI, Roboto, Inter, Arial; color: ${theme.colors.text}; background: ${theme.mode === 'light' ? '#ffffff' : theme.colors.surfaceAlt}; }
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
          body { margin: 0; font: 14px/1.6 -apple-system, Segoe UI, Roboto, Inter, Arial; color: ${theme.colors.text}; background: ${theme.mode === 'light' ? '#ffffff' : theme.colors.surfaceAlt}; }
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

  const changeFileAccess = async () => {
    if (!node?.id || isFolder) return;
    const currentAccess = node.access !== undefined ? node.access : 1;
    const newAccess: 0 | 1 = currentAccess === 0 ? 1 : 0;
    const accessText = newAccess === 0 ? 'публичным' : 'приватным';
    
    if (window.confirm(`Изменить уровень доступа файла на ${accessText}?`)) {
      const result = await dispatch(updateFileAccessAPI({ uuid: node.id, access: newAccess }));
      if (updateFileAccessAPI.fulfilled.match(result)) {
        // Дерево обновится автоматически через fetchTree в thunk
      }
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

  const handleStartEdit = () => {
    if (node && node.name && auth.isAuthenticated && auth.token) {
      setIsEditingName(true);
      setEditingNameValue(node.name);
    }
  };

  const handleSaveName = async () => {
    if (!node?.id || !editingNameValue.trim()) {
      setIsEditingName(false);
      setEditingNameValue('');
      return;
    }
    
    if (editingNameValue.trim() === node.name) {
      setIsEditingName(false);
      setEditingNameValue('');
      return;
    }
    
    try {
      await dispatch(renameFileAPI({ uuid: node.id, name: editingNameValue.trim() }));
      setIsEditingName(false);
      setEditingNameValue('');
    } catch (error) {
      console.error('Ошибка переименования файла:', error);
      alert('Не удалось переименовать файл');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditingNameValue('');
  };

  return (
    <Wrap>
      <Toolbar>
        {node && node.name && (
          <FileNameContainer>
            {isEditingName ? (
              <>
                <EditInput
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveName();
                    }
                    if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  autoFocus
                />
                <EditActions>
                  <Tooltip text="Сохранить">
                    <SaveBtn onClick={handleSaveName}>
                      ✓
                    </SaveBtn>
                  </Tooltip>
                  <Tooltip text="Отменить">
                    <CancelBtn onClick={handleCancelEdit}>
                      ×
                    </CancelBtn>
                  </Tooltip>
                </EditActions>
              </>
            ) : (
              <>
                <FileName title={node.name}>{node.name}</FileName>
                {auth.isAuthenticated && auth.token && node.type !== 'folder' && (
                  <Tooltip text="Редактировать имя файла">
                    <EditIcon onClick={handleStartEdit}>
                      <EditIconImg src={editIcon} alt="Редактировать" />
                    </EditIcon>
                  </Tooltip>
                )}
              </>
            )}
          </FileNameContainer>
        )}
        <ToolbarSpacer />
        {auth.isAuthenticated && auth.token && (
          <>
            {!isFolder && (
              <>
                <Tooltip text="Изменить уровень доступа">
                  <ActionBtn onClick={changeFileAccess}>
                    <Icon src={keyIcon} alt="Изменить доступ" />
                    
                  </ActionBtn>
                </Tooltip>
                <Tooltip text="Удалить файл">
                  <ActionBtn onClick={deleteFile}>
                    <Icon src={deleteIcon} alt="Удалить" />
                    
                  </ActionBtn>
                </Tooltip>
              </>
            )}
            {isFolder && node.id !== 'root' && (
              <Tooltip text="Удалить папку">
                <ActionBtn onClick={deleteFolder}>
                  <Icon src={deleteIcon} alt="Удалить папку" />
                  Удалить папку
                </ActionBtn>
              </Tooltip>
            )}
          </>
        )}
        {isMd && (
          <Tooltip text="Скачать как PDF">
            <ActionBtn onClick={downloadMd}>
              <Icon src={downloadIcon} alt="Скачать PDF" />
              
            </ActionBtn>
          </Tooltip>
        )}
      </Toolbar>
      <Body>
        {isFolder ? (
          node.id === 'root' ? (
            <RootWelcome>
              <RootLogo src={bigLogo} alt="Логотип" />
              <RootSubtitle>Ведущий поставщик чая, кофе и кофемашин в России</RootSubtitle>
            </RootWelcome>
          ) : (
            <div>Папка содержит: {(node.children ?? []).length} элементов</div>
          )
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
