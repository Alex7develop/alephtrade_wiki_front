import styled, { useTheme } from 'styled-components';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import html2canvas from 'html2canvas';
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import downloadIcon from '/icon/download_15545982.png';
import deleteIcon from '/icon/dustbin_14492622.png';
import editIcon from '/icon/edit.svg';
import editIcon1 from '/icon/edit_file.png';
import createMdIcon from '/icon/create_md.png';
import keyIcon from '/icon/key.png';
import bigLogo from '/icon/big_logo.png';
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  deleteFileAPI,
  deleteFolderAPI,
  renameFileAPI,
  updateFileAccessAPI,
  updateFileContentAPI,
  uploadFileAPI,
  uploadFileImageAPI,
  fetchTree,
  selectFile,
  selectFolder,
} from '@/store/fsSlice';
import { FilesList } from './FilesList';
import { Tooltip } from './Tooltip';

// Функция для удаления расширения из имени файла
function removeFileExtension(name: string): string {
  if (!name) return name;
  const lastDotIndex = name.lastIndexOf('.');
  if (lastDotIndex === -1) return name;
  return name.substring(0, lastDotIndex);
}

function noCache(url: string) {
  const u = new URL(url);
  u.searchParams.set('_ts', Date.now().toString());
  return u.toString();
}
// Тип для сохранения оригинальных блоков изображений, которые заменяем заглушками
interface ImagePlaceholder {
  placeholder: string;
  original: string;
}

// Заменяем строки с base64-изображениями заглушками, чтобы не загружать огромные данные в редактор
function stripImagePlaceholders(content: string): { sanitizedContent: string; placeholders: ImagePlaceholder[] } {
  if (!content) {
    return { sanitizedContent: content, placeholders: [] };
  }

  const lines = content.split('\n');
  const placeholders: ImagePlaceholder[] = [];

  const sanitizedLines = lines.map((line) => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    const index = placeholders.length;
    const marker = `<!--IMAGE_PLACEHOLDER_${index}-->`;

    // Ссылочные изображения вида [image1]: data:image/png;base64,...
    const referenceMatch = trimmed.match(/^\[(image\d+)\]:\s*(.+)$/i);
    if (referenceMatch) {
      const [, label, targetRaw] = referenceMatch;
      const normalizedTarget = targetRaw?.trim() ?? '';
      const targetWithoutBrackets = normalizedTarget.replace(/^<|>$/g, '');
      if (targetWithoutBrackets.toLowerCase().startsWith('data:image')) {
        const placeholderLine = `[${label}]: (изображение скрыто) ${marker}`;
        placeholders.push({ placeholder: placeholderLine, original: line });
        return placeholderLine;
      }
    }

    // Блоки, начинающиеся на <data:image... или просто содержащие base64 без ссылки
    if (lower.startsWith('<data:image') || lower.startsWith('data:image')) {
      const placeholderLine = `> [встроенное изображение скрыто] ${marker}`;
      placeholders.push({ placeholder: placeholderLine, original: line });
      return placeholderLine;
    }

    return line;
  });

  return {
    sanitizedContent: sanitizedLines.join('\n'),
    placeholders,
  };
}

// Возвращаем оригинальные блоки изображений перед сохранением
function restoreImagePlaceholders(content: string, placeholders: ImagePlaceholder[]): string {
  if (!placeholders.length) return content;

  let restored = content;
  placeholders.forEach((entry) => {
    restored = restored.split(entry.placeholder).join(entry.original);
  });
  return restored;
}

const Wrap = styled.div`
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto 1fr;

  /* Мобильные устройства */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 38px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  position: sticky;
  top: 0;
  z-index: 10;
  grid-column: 1;

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
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
  max-width: 500px;
  
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
  grid-column: 1;
  
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

const RightSidebar = styled.div`
  width: 220px;
  background: ${({ theme }) => theme.colors.surface};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  padding: 20px 16px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  grid-column: 2;
  grid-row: 1 / -1;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    display: none;
  }
`;

const RightSidebarTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const RightSidebarButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  transition: background-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  }
  
  &:active {
    opacity: 0.8;
  }
`;

const RightSidebarButtonIcon = styled.img`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
`;

const FileInfoSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const FileInfoTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 12px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const FileInfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FileInfoLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const FileInfoValue = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const RagStatusBadge = styled.div<{ $active?: boolean; $inProgress?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  
  ${({ $active, theme }) =>
    $active
      ? `
    background: ${theme.mode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)'};
    color: ${theme.mode === 'dark' ? '#4ade80' : '#16a34a'};
    border: 1px solid ${theme.mode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'};
  `
      : ''}
  
  ${({ $inProgress, theme }) =>
    $inProgress
      ? `
    background: ${theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'};
    color: ${theme.mode === 'dark' ? '#60a5fa' : '#2563eb'};
    border: 1px solid ${theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'};
  `
      : ''}
`;

const RagStatusDot = styled.div<{ $active?: boolean; $inProgress?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  
  ${({ $active, theme }) =>
    $active
      ? `
    background: ${theme.mode === 'dark' ? '#4ade80' : '#16a34a'};
    box-shadow: 0 0 8px ${theme.mode === 'dark' ? 'rgba(74, 222, 128, 0.6)' : 'rgba(22, 163, 74, 0.4)'};
    animation: pulse 2s ease-in-out infinite;
  `
      : ''}
  
  ${({ $inProgress, theme }) =>
    $inProgress
      ? `
    background: ${theme.mode === 'dark' ? '#60a5fa' : '#2563eb'};
    box-shadow: 0 0 8px ${theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.6)' : 'rgba(37, 99, 235, 0.4)'};
    animation: pulse 2s ease-in-out infinite;
  `
      : ''}
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }
`;

const InlineEditorWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  
  .w-md-editor {
    flex: 1;
    height: 65vh;
  }
`;

const LoadingSpinner = styled.div`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  width: 40px;
  height: 40px;
  border: 4px solid ${({ theme }) => theme.colors.border};
  border-top: 4px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${({ theme }) => theme.colors.text};
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const LoadingText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 8px;
`;

const InlineEditorToolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

const InlineEditorButton = styled.button<{ $primary?: boolean }>`
  padding: 8px 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  transition: background-color 0.15s ease;
  position: relative;
  z-index: 10;
  
  ${({ $primary, theme }) =>
    $primary
      ? `
    background: ${theme.colors.primary};
    color: white;
    &:hover:not(:disabled) {
      background: ${theme.colors.primaryAccent};
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `
      : `
    background: ${theme.colors.surfaceAlt};
    color: ${theme.colors.text};
    &:hover:not(:disabled) {
      background: ${theme.colors.border};
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `}
`;

const PdfContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 600px;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    min-height: calc(100vh - 200px);
    height: calc(100vh - 200px);
    /* На мобильных убираем overflow у контейнера, чтобы embed мог скроллиться внутри */
    overflow: visible;
  }
  
  @media (max-width: 480px) {
    min-height: calc(100vh - 180px);
    height: calc(100vh - 180px);
    overflow: visible;
  }
`;

const PdfViewer = styled.iframe`
  width: 100%;
  height: 100%;
  min-height: 600px;
  border: none;
  background: white;
  display: block;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    min-height: calc(100vh - 200px);
    height: calc(100vh - 200px);
  }
  
  @media (max-width: 480px) {
    min-height: calc(100vh - 180px);
    height: calc(100vh - 180px);
  }
`;

const PdfObject = styled.object`
  width: 100%;
  height: 100%;
  min-height: 600px;
  border: none;
  display: block;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    min-height: calc(100vh - 200px);
    height: calc(100vh - 200px);
  }
  
  @media (max-width: 480px) {
    min-height: calc(100vh - 180px);
    height: calc(100vh - 180px);
  }
`;

const PdfEmbed = styled.embed`
  width: 100%;
  height: 100%;
  min-height: 600px;
  border: none;
  display: block;
  /* Важно для iOS: убираем ограничения скролла */
  overflow: visible;
  
  /* Мобильные устройства - используем фиксированную высоту для правильного скролла */
  @media (max-width: 768px) {
    min-height: calc(100vh - 200px);
    height: calc(100vh - 200px);
    /* На iOS нужно использовать абсолютное позиционирование для правильного скролла */
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    min-height: calc(100vh - 180px);
    height: calc(100vh - 180px);
  }
`;

const PdfOpenButton = styled.button`
  display: none;
  width: 100%;
  padding: 14px 20px;
  margin-top: 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  transition: all 0.2s ease;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryAccent};
  }
  
  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
  
  /* Показываем только на мобильных устройствах */
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  @media (max-width: 480px) {
    padding: 12px 16px;
    font-size: 14px;
  }
`;

const PdfOpenIcon = styled.svg`
  width: 18px;
  height: 18px;
  fill: currentColor;
  flex-shrink: 0;
`;

const VideoWrapper = styled.div`
  width: 100%;
  max-width: 960px;
  aspect-ratio: 16 / 9;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
`;

const VideoFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: inherit;
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
  // overflow: auto;
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

const AttachmentsSection = styled.div`
  margin-bottom: 20px;
  padding: 16px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: none
`;

const AttachmentsTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 12px;
`;

const AttachmentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

const AttachmentImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 16px;
  z-index: 999;
  overflow-y: auto;
`;

const ModalCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  max-width: 980px;
  // width: 100%;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const ModalTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const CloseButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  padding: 6px 8px;
  border-radius: 6px;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const FieldRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const TextInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const SelectInput = styled.select`
  min-width: 140px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ErrorText = styled.div`
  color: #ff6b6b;
  font-size: 13px;
`;

// Функция для форматирования даты в читаемый формат
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Форматируем дату
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // Если сегодня - показываем время
    if (diffDays === 0) {
      return `Сегодня в ${hours}:${minutes}`;
    }
    // Если вчера
    if (diffDays === 1) {
      return `Вчера в ${hours}:${minutes}`;
    }
    // Если меньше недели
    if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    }
    // Иначе полная дата
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch (e) {
    return dateString;
  }
}

export function Preview() {
  const dispatch: any = useDispatch();
  const store = useStore<RootState>();
  const { root, selectedFileId, selectedFolderId, search, searchResults, auth } = useSelector((s: RootState) => s.fs);
  const theme = useTheme();

  // Markdown preview state must be declared before any return to preserve hooks order
  const [mdLoading, setMdLoading] = useState(false);
  const [mdError, setMdError] = useState<string | null>(null);
  const [mdText, setMdText] = useState<string>('');
  const [mdHtml, setMdHtml] = useState<string>('');
  
  // Состояние для редактирования имени файла
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  
  // Состояние для редактирования содержимого файла
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [loadingAbortController, setLoadingAbortController] = useState<AbortController | null>(null);
  const [imagePlaceholders, setImagePlaceholders] = useState<ImagePlaceholder[]>([]);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('Новый файл');
  const [newFileAccess, setNewFileAccess] = useState<0 | 1>(1);
  const [newFileType, setNewFileType] = useState<'md' | 'pdf'>('md');
  const [newPdfFile, setNewPdfFile] = useState<File | null>(null);
  const [isSavingNewFile, setIsSavingNewFile] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Функция для получения команд редактора с кастомной иконкой загрузки в начале
  const getEditorCommands = (): ICommand[] => {
    // Иконка загрузки картинки - перемещена влево
    const uploadImageCommand: ICommand = {
      name: 'upload-image',
      keyCommand: 'upload-image',
      buttonProps: { 'aria-label': 'Загрузить изображение' },
      icon: (
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm0 2v8l3-3 2.5 2.5L14 9l2 2V5H4zm0 10h12v-2.5l-2-2-2.5 2.5L7 9.5 4 12v3z" />
        </svg>
      ),
      execute: () => imageUploadInputRef.current?.click(),
    };

    // Получаем все дефолтные команды
    const defaultCommands: ICommand[] = [
      commands.bold,
      commands.italic,
      commands.strikethrough,
      commands.hr,
      commands.title,
      commands.divider,
      commands.link,
      commands.quote,
      commands.code,
      commands.codeBlock,
      commands.comment,
      commands.image,
      commands.table,
      commands.divider,
      commands.unorderedListCommand,
      commands.orderedListCommand,
      commands.checkedListCommand,
    ];

    // Возвращаем команды с нашей иконкой в начале
    return [uploadImageCommand, commands.divider, ...defaultCommands];
  };

  function find(node: any, id: string | null): any | null {
    if (!id) return null;
    if (node.id === id) return node;
    for (const c of node.children ?? []) {
      const f = find(c, id);
      if (f) return f;
    }
    return null;
  }

  function findParent(node: any, targetId: string | null, parent: any = null): any | null {
    if (!targetId || !node) return null;
    if (node.id === targetId) return parent;
    if (node.children) {
      for (const child of node.children) {
        const found = findParent(child, targetId, node);
        if (found) return found;
      }
    }
    return null;
  }

  // Функция для поиска файла по имени во всем дереве
  function findFileByName(node: any, fileName: string): any | null {
    if (!node) return null;
    if (node.type === 'file' && node.name === fileName) {
      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const found = findFileByName(child, fileName);
        if (found) return found;
      }
    }
    return null;
  }

  // Ищем узел по selectedFileId или selectedFolderId
  // Приоритет у selectedFileId (если выбран файл) - файл остается открытым даже при клике на папку
  // Сначала ищем в дереве, затем в результатах поиска
  let node: any = null;
  
  // Если выбран файл, всегда показываем его, даже если выбрана папка
  if (selectedFileId) {
    node = find(root, selectedFileId);
    // Если файл не найден в дереве, ищем в результатах поиска
    if (!node && Array.isArray(searchResults)) {
      node = searchResults.find((item: any) => item.id === selectedFileId) || null;
    }
  } else if (selectedFolderId) {
    // Если файл не выбран, но выбрана папка - показываем папку
    node = find(root, selectedFolderId);
  }
  
  // Сбрасываем режим редактирования имени при смене файла или при выходе
  // НЕ сбрасываем isEditingContent здесь, чтобы не прерывать загрузку
  useEffect(() => {
    setIsEditingName(false);
    setEditingNameValue('');
    // НЕ сбрасываем isEditingContent здесь - это делается отдельно
  }, [selectedFileId, selectedFolderId, auth.isAuthenticated, auth.token]);
  
  // Загружаем содержимое файла при открытии режима редактирования
  useEffect(() => {
    // Отменяем предыдущую загрузку, если она была
    if (loadingAbortController) {
      loadingAbortController.abort();
    }
    
    if (isEditingContent && node && node.type === 'file' && node.url) {
      const isMd = node.mime === 'text/markdown' || node.url?.toLowerCase().endsWith('.md');
      if (isMd) {
        // Создаем AbortController для возможности отмены загрузки
        const abortController = new AbortController();
        setLoadingAbortController(abortController);
        
        // Всегда загружаем содержимое напрямую из URL, чтобы получить актуальную версию
        setIsLoadingContent(true);
        setEditingContent(''); // Сбрасываем перед загрузкой
        
        console.log('Начинаем загрузку файла для редактирования:', node.url);
        
        fetch(noCache(node.url), { signal: abortController.signal, cache: 'no-store', })
          .then((r) => {
            if (!r.ok) throw new Error('Не удалось загрузить файл');
            return r.text();
          })
          .then((t) => {
            if (!abortController.signal.aborted) {
              console.log('Файл успешно загружен, размер:', t.length);
              const { sanitizedContent, placeholders } = stripImagePlaceholders(t);
              setEditingContent(sanitizedContent);
              setImagePlaceholders(placeholders);
              setIsLoadingContent(false);
              setLoadingAbortController(null);
            }
          })
          .catch((e: any) => {
            if (e.name === 'AbortError') {
              // Загрузка была отменена - это нормально
              console.log('Загрузка файла отменена');
              return;
            }
            console.error('Ошибка загрузки файла для редактирования:', e);
            if (!abortController.signal.aborted) {
              setEditingContent('');
              setImagePlaceholders([]);
              setIsLoadingContent(false);
              setLoadingAbortController(null);
              alert('Не удалось загрузить содержимое файла для редактирования: ' + (e.message || 'Неизвестная ошибка'));
            }
          });
      } else {
        console.log('Файл не является Markdown, пропускаем загрузку');
        setIsLoadingContent(false);
        setEditingContent('');
        setImagePlaceholders([]);
      }
    } else if (!isEditingContent) {
      // Отменяем загрузку при закрытии модального окна
      if (loadingAbortController) {
        loadingAbortController.abort();
        setLoadingAbortController(null);
      }
      // Сбрасываем содержимое при закрытии модального окна
      setEditingContent('');
      setImagePlaceholders([]);
      setIsLoadingContent(false);
    }
    
    // Cleanup при размонтировании или изменении зависимостей
    return () => {
      // Не отменяем здесь, так как это может прервать текущую загрузку
      // Отмена происходит явно при закрытии модального окна
    };
  }, [isEditingContent, node?.id, node?.url]);

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
      fetch(noCache(mdUrl), { cache: 'no-store' })
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
  const isVideo = !!(
    node &&
    node.type === 'file' &&
    (
      node.mime?.startsWith('video') ||
      node.url?.match(/\.(mp4|mov|avi|mkv|webm)(\?|$)/i) ||
      node.url?.includes('runtime.video.cloud.yandex.net')
    )
  );

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

  const targetFolderForCreate = () => {
    if (isFolder && node) return node.id;
    if (selectedFolderId) return selectedFolderId;
    if (selectedFileId) {
      const parent = findParent(root, selectedFileId);
      if (parent?.id) return parent.id;
    }
    return 'root';
  };

  const handleOpenCreateFile = () => {
    if (!auth.isAuthenticated || !auth.token) {
      alert('Создание доступно только авторизованным пользователям');
      return;
    }
    setNewFileName('Имя файла');
    setNewFileAccess(1);
    setNewFileType('md');
    setNewPdfFile(null);
    setCreateError(null);
    setIsCreatingFile(true);
  };

  const handleFileTypeChange = (type: 'md' | 'pdf') => {
    setNewFileType(type);
    setCreateError(null);
    setNewPdfFile(null);
  };

  const handlePdfChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
        setCreateError('Выберите PDF файл');
        setNewPdfFile(null);
      } else {
        setNewPdfFile(file);
        setCreateError(null);
        if (!newFileName.trim()) {
          setNewFileName(file.name);
        }
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleSaveNewFile = async () => {
    if (!auth.isAuthenticated || !auth.token) {
      setCreateError('Авторизуйтесь, чтобы сохранить файл');
      return;
    }
    const parentId = targetFolderForCreate();
    const baseName = (newFileName || '').trim() || 'Имя файла';
    const normalizedName =
      newFileType === 'md'
        ? (baseName.toLowerCase().endsWith('.md') ? baseName : `${baseName}.md`)
        : (baseName.toLowerCase().endsWith('.pdf') ? baseName : `${baseName}.pdf`);

    setIsSavingNewFile(true);
    setCreateError(null);
    try {
      let fileToUpload: File | null = null;
      if (newFileType === 'md') {
        const blob = new Blob([''], { type: 'text/markdown' });
        fileToUpload = new File([blob], normalizedName, { type: 'text/markdown' });
      } else {
        if (!newPdfFile) {
          setCreateError('Выберите PDF файл');
          return;
        }
        const pdfBlob = new Blob([newPdfFile], { type: 'application/pdf' });
        fileToUpload = new File([pdfBlob], normalizedName, { type: 'application/pdf' });
      }

      const result = await dispatch(uploadFileAPI({ file: fileToUpload, parentId, access: newFileAccess }));
      if (uploadFileAPI.rejected.match(result)) {
        const errorMessage = (result.payload as string) || 'Ошибка создания файла';
        setCreateError(errorMessage);
      } else {
        // Обновляем дерево, чтобы получить актуальную информацию о созданном файле
        await dispatch(fetchTree());
        
        // Получаем обновленное состояние
        const updatedState = store.getState();
        const updatedRoot = updatedState.fs.root;
        
        // Ищем созданный файл по имени
        const createdFile = findFileByName(updatedRoot, normalizedName);
        
        setIsCreatingFile(false);
        setNewFileName('Имя файла');
        setNewFileAccess(1);
        setNewFileType('md');
        setNewPdfFile(null);
        
        // Если файл найден, выбираем его для отображения
        if (createdFile) {
          console.log('✅ Файл создан и найден:', createdFile.id, createdFile.name, createdFile.url);
          dispatch(selectFile(createdFile.id));
        } else {
          // Если файл не найден, возвращаемся к родительской папке
          const targetParentId = parentId && parentId !== 'root' ? parentId : 'root';
          dispatch(selectFolder(targetParentId));
        }
      }
    } catch (e: any) {
      setCreateError(e?.message || 'Ошибка создания файла');
    } finally {
      setIsSavingNewFile(false);
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
  
  // Обработчики для редактирования содержимого файла
  const handleStartEditContent = () => {
    console.log('handleStartEditContent вызван', { node, nodeType: node?.type, nodeUrl: node?.url });
    if (node && node.type === 'file' && (node.mime === 'text/markdown' || node.url?.toLowerCase().endsWith('.md'))) {
      console.log('Открываем модальное окно редактирования');
      setIsEditingContent(true);
    } else {
      console.warn('Нельзя редактировать этот файл', { node, nodeType: node?.type, nodeMime: node?.mime, nodeUrl: node?.url });
    }
  };
  
  const handleCloseEditContent = () => {
    // Отменяем загрузку, если она идет
    if (loadingAbortController) {
      loadingAbortController.abort();
      setLoadingAbortController(null);
    }
    setIsEditingContent(false);
    setEditingContent('');
    setImagePlaceholders([]);
    setIsLoadingContent(false);
  };
  
  const handleSaveContent = async () => {
    if (!node || !node.id || !editingContent.trim()) {
      return;
    }
    
    const restoredContent = restoreImagePlaceholders(editingContent, imagePlaceholders);
    
    // Сохраняем информацию о файле до сохранения
    const fileName = node.name;
    const parentFolderId = findParent(root, node.id)?.id || 'root';

    setIsSavingContent(true);
    try {
      await dispatch(updateFileContentAPI({
        uuid: node.id,
        content: restoredContent,
        fileName: node.name
      })).unwrap();
      
      // Ждем обновления дерева (fetchTree вызывается внутри updateFileContentAPI, но нужно убедиться)
      await dispatch(fetchTree());
      
      // Получаем обновленное состояние после fetchTree
      const updatedState = store.getState();
      const updatedRoot = updatedState.fs.root;
      
      // Закрываем модальное окно после успешного сохранения
      handleCloseEditContent();
      
      // Находим обновленный файл по имени во всем дереве
      // После updateFileContentAPI файл получает новый UUID, поэтому ищем по имени
      const updatedFile = findFileByName(updatedRoot, fileName);
      
      if (updatedFile) {
        console.log('✅ Найден обновленный файл:', updatedFile.id, updatedFile.name, updatedFile.url);
        dispatch(selectFile(updatedFile.id));
      } else {
        // Если файл не найден, возвращаемся к родительской папке
        console.warn('⚠️ Файл не найден после сохранения, возвращаемся к папке:', parentFolderId);
        dispatch(selectFolder(parentFolderId));
      }
    } catch (error: any) {
      console.error('Ошибка сохранения файла:', error);
      alert(error || 'Ошибка сохранения файла');
    } finally {
      setIsSavingContent(false);
    }
  };

  // Обработчик загрузки изображения в MD файл
  const handleUploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Можно загрузить только изображения');
      return;
    }

    if (!auth.isAuthenticated || !auth.token) {
      alert('Требуется авторизация для загрузки изображений');
      return;
    }

    // Проверяем, что редактируется MD файл
    if (!node || !node.id || node.type !== 'file') {
      alert('Изображения можно прикреплять только к файлу');
      return;
    }

    // Проверяем, что это действительно MD файл
    const isMdFile = node.mime === 'text/markdown' || node.url?.toLowerCase().endsWith('.md') || node.name?.toLowerCase().endsWith('.md');
    if (!isMdFile) {
      alert('Изображения можно прикреплять только к Markdown файлам');
      return;
    }

    console.log('📤 Загрузка изображения в MD файл:', {
      fileId: node.id,
      fileName: node.name,
      imageName: file.name,
      imageType: file.type
    });

    setIsUploadingImage(true);
    try {
      const result = await dispatch(uploadFileImageAPI({ 
        parentUuid: node.id, // parent_uuid - это uuid MD файла
        file 
      }));
      
      if (uploadFileImageAPI.fulfilled.match(result)) {
        const response = result.payload as any;
        console.log('📥 Ответ от API загрузки изображения:', response);
        
        // URL изображения находится в response.attachments.images
        // Берем последний элемент массива (самое новое загруженное изображение)
        let imageUrl: string | undefined;
        if (response.attachments?.images && Array.isArray(response.attachments.images) && response.attachments.images.length > 0) {
          // Берем последний элемент - это самое новое загруженное изображение
          imageUrl = response.attachments.images[response.attachments.images.length - 1];
        } else {
          // Fallback: проверяем другие возможные поля
          imageUrl = response.url || response.image_url || response.file_url || response.s3_url;
        }
        
        const imageName = response.fileName || response.filename || file.name;
        
        if (imageUrl) {
          // Вставляем изображение в markdown
          const imageMarkdown = `![${imageName}](${imageUrl})\n`;
          setEditingContent((prev) => `${prev ? `${prev.trim()}\n\n` : ''}${imageMarkdown}`);
          console.log('✅ Изображение успешно добавлено в MD:', imageUrl);
          
          // Обновляем дерево файлов, чтобы получить обновленные attachments
          dispatch(fetchTree());
        } else {
          console.error('Не удалось получить URL изображения из ответа:', response);
          alert('Не удалось получить URL изображения');
        }
      } else {
        const errorMessage = (result.payload as string) || 'Ошибка загрузки изображения';
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки изображения:', error);
      alert(error?.message || 'Ошибка загрузки изображения');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadImage(file);
    }
    if (e.target) {
      e.target.value = '';
    }
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
                <FileName title={node.name}>
                  {node.type === 'file' ? removeFileExtension(node.name) : node.name}
                </FileName>
                {auth.isAuthenticated && auth.token && node.type !== 'folder' && (
                  <>
                  <Tooltip text="Редактировать имя файла">
                    <EditIcon onClick={handleStartEdit}>
                        <EditIconImg src={editIcon} alt="Редактировать имя" />
                      </EditIcon>
                    </Tooltip>
                    {(node.mime === 'text/markdown' || node.url?.toLowerCase().endsWith('.md')) && (
                      <Tooltip text="Редактировать содержимое файла">
                        <EditIcon onClick={handleStartEditContent}>
                          <EditIconImg src={editIcon1} alt="Редактировать содержимое" />
                    </EditIcon>
                  </Tooltip>
                )}
              </>
            )}
              </>
            )}
          </FileNameContainer>
            )}
        <ToolbarSpacer />
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

            {isVideo && node.url ? (
              <VideoWrapper>
                <VideoFrame
                  src={node.url}
                  title={node.name || 'video'}
                  allow="autoplay; fullscreen; accelerometer; gyroscope; picture-in-picture; encrypted-media"
                  allowFullScreen
                  scrolling="no"
                />
              </VideoWrapper>
            ) : isPdf && node.url ? (
              <>
                <PdfContainer>
                  {/* На мобильных устройствах используем embed для лучшей поддержки скролла на iOS */}
                  {isMobile ? (
                    <PdfEmbed
                      src={`${noCache(node.url)}#toolbar=1&navpanes=1&scrollbar=1`}
                      type="application/pdf"
                      title={node.name}
                    />
                  ) : (
                    <PdfObject
                      data={`${noCache(node.url)}#toolbar=1&navpanes=1&scrollbar=1`}
                      type="application/pdf"
                      title={node.name}
                    >
                      <p style={{ padding: '20px', textAlign: 'center', color: theme.colors.text }}>
                        Ваш браузер не поддерживает просмотр PDF. 
                        <a href={node.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.primary, marginLeft: '8px' }}>
                          Открыть в новой вкладке
                        </a>
                      </p>
                    </PdfObject>
                  )}
                </PdfContainer>
                {/* Кнопка для открытия PDF в новой вкладке на мобильных */}
                {isMobile && node.url && (
                  <PdfOpenButton onClick={() => window.open(node.url, '_blank')}>
                    <PdfOpenIcon viewBox="0 0 24 24">
                      <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
                    </PdfOpenIcon>
                    Открыть файл полностью
                  </PdfOpenButton>
                )}
              </>
            ) : isMd ? (
              isEditingContent ? (
                <InlineEditorWrap>
                  {isLoadingContent ? (
                    <LoadingContainer>
                      <LoadingSpinner />
                      <LoadingText>Загрузка содержимого файла...</LoadingText>
                    </LoadingContainer>
                  ) : (
                    <>
                      <MDEditor
                        value={editingContent}
                        onChange={(value) => setEditingContent(value || '')}
                        preview="live"
                        hideToolbar={false}
                        visibleDragbar={true}
                        data-color-mode={theme.mode}
                        commands={getEditorCommands()}
                      />
                      <input
                        ref={imageUploadInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageInputChange}
                        disabled={isUploadingImage}
                      />
                      {isUploadingImage && (
                        <div style={{ padding: '12px', textAlign: 'center', color: theme.colors.textMuted }}>
                          Загрузка изображения...
                        </div>
                      )}
                      <InlineEditorToolbar>
                        <InlineEditorButton
                          onClick={handleCloseEditContent}
                          disabled={isSavingContent}
                        >
                          Отмена
                        </InlineEditorButton>
                        <InlineEditorButton
                          $primary
                          onClick={handleSaveContent}
                          disabled={isSavingContent || !editingContent.trim()}
                        >
                          {isSavingContent ? 'Сохранение...' : 'Сохранить'}
                        </InlineEditorButton>
                      </InlineEditorToolbar>
                    </>
                  )}
                </InlineEditorWrap>
              ) : (
              <MdWrap>
                {mdLoading && <div>Загрузка Markdown…</div>}
                {mdError && (
                  <div style={{ color: '#ff6b6b' }}>Ошибка: {mdError}</div>
                )}
                {!mdLoading && !mdError && (
                  <>
                    {node.attachments?.images && node.attachments.images.length > 0 && (
                      <AttachmentsSection>
                        <AttachmentsTitle>Вложения</AttachmentsTitle>
                        <AttachmentsGrid>
                          {node.attachments.images.map((imageUrl: string, index: number) => (
                            <AttachmentImage
                              key={index}
                              src={imageUrl}
                              alt={`Вложение ${index + 1}`}
                              onClick={() => window.open(imageUrl, '_blank')}
                            />
                          ))}
                        </AttachmentsGrid>
                      </AttachmentsSection>
                    )}
                    <HtmlDoc srcDoc={mdHtml} title={node.name} />
                  </>
                )}
              </MdWrap>
              )
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
      <RightSidebar>
        <RightSidebarTitle>Действия</RightSidebarTitle>
        {auth.isAuthenticated && auth.token && (
          <>
            {!isFolder && (
              <>
                <Tooltip text="Изменить уровень доступа">
                  <RightSidebarButton onClick={changeFileAccess}>
                    <RightSidebarButtonIcon src={keyIcon} alt="Изменить доступ" />
                  </RightSidebarButton>
                </Tooltip>
                <Tooltip text="Удалить файл">
                  <RightSidebarButton onClick={deleteFile}>
                    <RightSidebarButtonIcon src={deleteIcon} alt="Удалить" />
                  </RightSidebarButton>
                </Tooltip>
              </>
            )}
            {isFolder && node.id !== 'root' && (
              <Tooltip text="Удалить папку">
                <RightSidebarButton onClick={deleteFolder}>
                  <RightSidebarButtonIcon src={deleteIcon} alt="Удалить папку" />
                </RightSidebarButton>
              </Tooltip>
            )}
          </>
        )}
        {isMd && (
          <Tooltip text="Скачать как PDF">
            <RightSidebarButton onClick={downloadMd}>
              <RightSidebarButtonIcon src={downloadIcon} alt="Скачать PDF" />
            </RightSidebarButton>
          </Tooltip>
        )}
        {!isFolder && node?.chunk_result_url && (
          <Tooltip text="Открыть RAG">
            <RightSidebarButton 
              onClick={() => window.open(node.chunk_result_url!, '_blank')}
              style={{ width: 'auto', padding: '0 12px', fontSize: '13px' }}
            >
              RAG
            </RightSidebarButton>
          </Tooltip>
        )}
        {auth.isAuthenticated && auth.token && (
          <Tooltip text="Создать файл">
            <RightSidebarButton onClick={handleOpenCreateFile}>
              <RightSidebarButtonIcon src={createMdIcon} alt="Создать файл" />
            </RightSidebarButton>
          </Tooltip>
        )}
        {!isFolder && node && (
          <FileInfoSection>
            <FileInfoTitle>Информация о файле</FileInfoTitle>
            
            {node.created_at && (
              <FileInfoItem>
                <FileInfoLabel>Создан</FileInfoLabel>
                <FileInfoValue>{formatDate(node.created_at)}</FileInfoValue>
              </FileInfoItem>
            )}
            
            {node.updated_at && (
              <FileInfoItem>
                <FileInfoLabel>Обновлен</FileInfoLabel>
                <FileInfoValue>{formatDate(node.updated_at)}</FileInfoValue>
              </FileInfoItem>
            )}
            
            {node.rag_actual !== undefined && (
              <FileInfoItem>
                <FileInfoLabel>RAG статус</FileInfoLabel>
                <RagStatusBadge $active={node.rag_actual}>
                  {node.rag_actual && <RagStatusDot $active={true} />}
                  {node.rag_actual ? 'Актуальный' : 'Не актуальный'}
                </RagStatusBadge>
              </FileInfoItem>
            )}
            
            {node.rag_in_progress !== undefined && node.rag_in_progress && (
              <FileInfoItem>
                <FileInfoLabel>Обработка RAG</FileInfoLabel>
                <RagStatusBadge $inProgress={true}>
                  <RagStatusDot $inProgress={true} />
                  В очереди
                </RagStatusBadge>
              </FileInfoItem>
            )}
            
            {node.rag_started && (
              <FileInfoItem>
                <FileInfoLabel>RAG начат</FileInfoLabel>
                <FileInfoValue>{formatDate(node.rag_started)}</FileInfoValue>
              </FileInfoItem>
            )}
            
            {node.rag_finished && (
              <FileInfoItem>
                <FileInfoLabel>RAG завершен</FileInfoLabel>
                <FileInfoValue>{formatDate(node.rag_finished)}</FileInfoValue>
              </FileInfoItem>
            )}
          </FileInfoSection>
        )}
      </RightSidebar>
      {isCreatingFile && (
        <ModalOverlay>
          <ModalCard>
            <ModalHeader>
              <ModalTitle>Новый файл</ModalTitle>
              <CloseButton onClick={() => setIsCreatingFile(false)}>×</CloseButton>
            </ModalHeader>
            <FieldRow>
              <TextInput
                placeholder="Имя файла"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
              <SelectInput
                value={newFileAccess}
                onChange={(e) => setNewFileAccess(Number(e.target.value) as 0 | 1)}
              >
                <option value={0}>Публичный (0)</option>
                <option value={1}>Приватный (1)</option>
              </SelectInput>
              <SelectInput
                value={newFileType}
                onChange={(e) => handleFileTypeChange(e.target.value as 'md' | 'pdf')}
              >
                <option value="md">Markdown (.md)</option>
                <option value="pdf">PDF (.pdf)</option>
              </SelectInput>
              {newFileType === 'pdf' && (
                <InlineEditorButton
                  onClick={() => document.getElementById('new-pdf-input')?.click()}
                  disabled={isSavingNewFile}
                >
                  {newPdfFile ? 'Выбран PDF' : 'Выбрать PDF'}
                </InlineEditorButton>
              )}
              <input
                id="new-pdf-input"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handlePdfChange}
              />
            </FieldRow>
            {newFileType === 'pdf' && newPdfFile && (
              <div style={{ fontSize: '13px', color: theme.colors.textMuted }}>
                Выбран файл: {newPdfFile.name}
              </div>
            )}
            <InlineEditorToolbar>
              <InlineEditorButton onClick={() => setIsCreatingFile(false)} disabled={isSavingNewFile}>
                Отмена
              </InlineEditorButton>
              <InlineEditorButton
                $primary
                onClick={handleSaveNewFile}
                disabled={isSavingNewFile || (newFileType === 'pdf' && !newPdfFile)}
              >
                {isSavingNewFile ? 'Сохранение...' : 'Сохранить'}
              </InlineEditorButton>
            </InlineEditorToolbar>
            {createError && <ErrorText>{createError}</ErrorText>}
          </ModalCard>
        </ModalOverlay>
      )}
      
    </Wrap>
  );
}
