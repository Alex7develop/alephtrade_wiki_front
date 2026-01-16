import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store/store';
import homeIcon from '/icon/home.png';
import cloudIcon from '/icon/cloud.png';
import actionIcon from '/icon/action.png';
import keyIcon from '/icon/key.png';
import deleteIcon from '/icon/dustbin_14492622.png';
import downloadIcon from '/icon/download_15545982.png';
import createMdIcon from '/icon/create_md.png';
import { useState } from 'react';
import type { FsNode } from '@/store/fsSlice';
import {
  deleteFileAPI,
  updateFileAccessAPI,
  selectFile,
} from '@/store/fsSlice';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import html2canvas from 'html2canvas';

const Nav = styled.nav`
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 100vw;
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom, 0);
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
  overflow: hidden;
  
  /* Показываем только на мобильных */
  @media (max-width: 768px) {
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: calc(64px + env(safe-area-inset-bottom, 0px));
    min-height: 64px;
  }
  
  @media (max-width: 480px) {
    height: calc(60px + env(safe-area-inset-bottom, 0px));
    min-height: 60px;
  }
`;

const NavButton = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
  font-size: 10px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  transition: all 0.2s ease;
  padding: 8px 4px;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  
  &:active {
    transform: scale(0.95);
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  
  @media (max-width: 480px) {
    font-size: 9px;
    gap: 2px;
    padding: 6px 2px;
  }
`;

const Icon = styled.img<{ $active?: boolean }>`
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: ${({ $active }) => ($active ? 1 : 0.6)};
  transition: opacity 0.2s ease;
  
  @media (max-width: 480px) {
    width: 22px;
    height: 22px;
  }
`;

const Label = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  font-size: 10px;
  
  @media (max-width: 480px) {
    font-size: 9px;
  }
`;

// Модальное окно для информации о файле
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: background-color 0.2s ease;
  
  &:active {
    background: ${({ theme }) => theme.colors.border};
  }
`;

const ModalContent = styled.div`
  padding: 20px;
`;

const FileInfoSection = styled.div`
  margin-top: 0;
`;

const FileInfoTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 16px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const FileInfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
  
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
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const RagStatusBadge = styled.div<{ $active?: boolean; $inProgress?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
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

// Секция с кнопками действий
const ActionsSection = styled.div`
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ActionsTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 16px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const ActionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  min-height: 80px;
  
  &:active {
    transform: scale(0.98);
    background: ${({ theme }) => theme.colors.border};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionIcon = styled.img`
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: 0.8;
`;

const ActionText = styled.span`
  font-size: 12px;
  text-align: center;
  line-height: 1.2;
`;

// Функция для поиска узла по ID
function findNodeById(node: FsNode, id: string | null): FsNode | null {
  if (!id) return null;
  if (node.id === id) return node;
  if (node.type === 'folder' && node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

// Функция для форматирования даты
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (diffDays === 0) {
      return `Сегодня в ${hours}:${minutes}`;
    }
    if (diffDays === 1) {
      return `Вчера в ${hours}:${minutes}`;
    }
    if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    }
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch (e) {
    return dateString;
  }
}

interface MobileBottomNavProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onUploadClick: () => void;
}

export function MobileBottomNav({ 
  sidebarOpen, 
  setSidebarOpen, 
  onUploadClick
}: MobileBottomNavProps) {
  const dispatch = useDispatch();
  const [actionsModalOpen, setActionsModalOpen] = useState(false);
  const auth = useSelector((s: RootState) => s.fs.auth);
  const { root, selectedFileId } = useSelector((s: RootState) => s.fs);
  
  // Проверяем, можно ли показывать кнопку загрузки
  // Показываем только если пользователь авторизован И имеет уровень доступа access: 2
  const canUpload = auth.isAuthenticated && auth.user && auth.user.access === 2;
  
  // Получаем текущий выбранный файл
  const currentNode = selectedFileId ? findNodeById(root, selectedFileId) : null;
  const isFile = currentNode && currentNode.type === 'file';
  const isMd = isFile && (currentNode?.mime === 'text/markdown' || currentNode?.url?.toLowerCase().endsWith('.md'));
  
  // Обработчик для кнопки "Меню" - открывает/закрывает sidebar
  const handleMenu = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Обработчик для кнопки "Загрузить файл" - загрузка файла
  const handleUpload = () => {
    onUploadClick();
  };
  
  // Обработчик для кнопки "Настройки" - открывает модальное окно с информацией о файле
  const handleActions = () => {
    setActionsModalOpen(true);
  };
  
  // Обработчик изменения уровня доступа
  const handleChangeAccess = async () => {
    if (!currentNode?.id || !isFile) return;
    const currentAccess = currentNode.access !== undefined ? currentNode.access : 1;
    const newAccess: 0 | 1 = currentAccess === 0 ? 1 : 0;
    const accessText = newAccess === 0 ? 'публичным' : 'приватным';
    
    if (window.confirm(`Изменить уровень доступа файла на ${accessText}?`)) {
      const result = await dispatch(updateFileAccessAPI({ uuid: currentNode.id, access: newAccess }) as any);
      if (updateFileAccessAPI.fulfilled.match(result)) {
        setActionsModalOpen(false);
      }
    }
  };
  
  // Обработчик удаления файла
  const handleDeleteFile = async () => {
    if (!currentNode?.id) return;
    if (window.confirm('Удалить файл безвозвратно?')) {
      await dispatch(deleteFileAPI({ uuid: currentNode.id }) as any);
      dispatch(selectFile(''));
      setActionsModalOpen(false);
    }
  };
  
  // Обработчик скачивания PDF
  const handleDownloadPdf = async () => {
    if (!currentNode?.url || !isMd) return;
    
    try {
      // Загружаем содержимое MD файла
      const response = await fetch(currentNode.url);
      if (!response.ok) {
        alert('Не удалось загрузить файл');
        return;
      }
      const mdText = await response.text();
      
      // Преобразуем Markdown в HTML
      const htmlBody = await marked.parse(mdText);
      const baseHref = (currentNode.url || '').replace(/([^/]+)$/, '');
      
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
            }
            code { padding: 2px 6px; }
            pre code { padding: 0; background: transparent; }
            img { max-width: 100%; height: auto; }
            blockquote { 
              border-left: 4px solid #ddd; 
              margin: 16px 0; 
              padding-left: 16px; 
              color: #666; 
            }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin: 16px 0; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px 12px; 
              text-align: left; 
            }
            th { 
              background: #f5f5f5; 
              font-weight: 600; 
            }
          </style>
        </head>
        <body>
          ${htmlBody}
        </body>
        </html>
      `;
      
      // Создаем временный iframe для рендеринга HTML
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '600px';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        alert('Не удалось создать PDF');
        return;
      }
      
      iframeDoc.open();
      iframeDoc.write(documentHtml);
      iframeDoc.close();
      
      // Ждем загрузки изображений
      await new Promise((resolve) => {
        const images = iframeDoc.querySelectorAll('img');
        if (images.length === 0) {
          resolve(undefined);
          return;
        }
        let loaded = 0;
        const checkComplete = () => {
          loaded++;
          if (loaded === images.length) {
            setTimeout(resolve, 500);
          }
        };
        images.forEach((img) => {
          if (img.complete) {
            checkComplete();
          } else {
            img.onload = checkComplete;
            img.onerror = checkComplete;
          }
        });
      });
      
      // Конвертируем в canvas и создаем PDF
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
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
      
      // Удаляем iframe
      document.body.removeChild(iframe);
      
      // Скачиваем PDF
      const fileName = (currentNode.name || 'file').replace(/\.md$/i, '') + '.pdf';
      pdf.save(fileName);
      setActionsModalOpen(false);
    } catch (error: any) {
      console.error('Ошибка при создании PDF:', error);
      alert('Не удалось создать PDF: ' + (error.message || 'Неизвестная ошибка'));
    }
  };
  
  // Обработчик открытия RAG
  const handleOpenRag = () => {
    if (currentNode?.chunk_result_url) {
      window.open(currentNode.chunk_result_url, '_blank');
      setActionsModalOpen(false);
    }
  };
  
  // Обработчик создания файла
  const handleCreateFile = () => {
    // Закрываем модальное окно действий
    setActionsModalOpen(false);
    // Показываем сообщение, что создание файла доступно через десктопную версию
    // Или можно добавить callback для открытия модального окна создания файла
    alert('Создание файла доступно через десктопную версию или через меню загрузки файлов');
  };
  
  return (
    <>
    <Nav>
      <NavButton $active={sidebarOpen} onClick={handleMenu} title="Меню с деревом файлов">
        <Icon src={homeIcon} alt="Главная" $active={sidebarOpen} />
        <Label>Меню</Label>
      </NavButton>
      
      {canUpload && (
        <NavButton onClick={handleUpload} title="Загрузить файл">
          <Icon src={cloudIcon} alt="Загрузить файл" />
          <Label>Загрузить файл</Label>
        </NavButton>
      )}
      
        <NavButton onClick={handleActions} title="Настройки">
          <Icon src={actionIcon} alt="Настройки" />
          <Label>Настройки</Label>
      </NavButton>
    </Nav>
      
      {actionsModalOpen && (
        <ModalOverlay onClick={() => setActionsModalOpen(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Настройки</ModalTitle>
              <CloseButton onClick={() => setActionsModalOpen(false)}>×</CloseButton>
            </ModalHeader>
            <ModalContent>
              {auth.isAuthenticated && auth.token && (
                <ActionsSection>
                  <ActionsTitle>Действия</ActionsTitle>
                  <ActionsGrid>
                    {isFile && (
                      <>
                        <ActionButton onClick={handleChangeAccess} title="Изменить уровень доступа">
                          <ActionIcon src={keyIcon} alt="Изменить доступ" />
                          <ActionText>Изменить уровень доступа</ActionText>
                        </ActionButton>
                        
                        <ActionButton onClick={handleDeleteFile} title="Удалить файл">
                          <ActionIcon src={deleteIcon} alt="Удалить" />
                          <ActionText>Удалить файл</ActionText>
                        </ActionButton>
                        
                        {isMd && (
                          <ActionButton onClick={handleDownloadPdf} title="Скачать как PDF">
                            <ActionIcon src={downloadIcon} alt="Скачать PDF" />
                            <ActionText>Скачать как PDF</ActionText>
                          </ActionButton>
                        )}
                        
                        {currentNode?.chunk_result_url && (
                          <ActionButton onClick={handleOpenRag} title="Открыть RAG">
                            <ActionText>RAG</ActionText>
                          </ActionButton>
                        )}
                      </>
                    )}
                    
                    <ActionButton onClick={handleCreateFile} title="Создать файл">
                      <ActionIcon src={createMdIcon} alt="Создать файл" />
                      <ActionText>Создать файл</ActionText>
                    </ActionButton>
                  </ActionsGrid>
                </ActionsSection>
              )}
              
              {isFile && currentNode ? (
                <FileInfoSection>
                  <FileInfoTitle>Информация о файле</FileInfoTitle>
                  
                  {currentNode.created_at && (
                    <FileInfoItem>
                      <FileInfoLabel>Создан</FileInfoLabel>
                      <FileInfoValue>{formatDate(currentNode.created_at)}</FileInfoValue>
                    </FileInfoItem>
                  )}
                  
                  {currentNode.updated_at && (
                    <FileInfoItem>
                      <FileInfoLabel>Обновлен</FileInfoLabel>
                      <FileInfoValue>{formatDate(currentNode.updated_at)}</FileInfoValue>
                    </FileInfoItem>
                  )}
                  
                  {currentNode.rag_actual !== undefined && (
                    <FileInfoItem>
                      <FileInfoLabel>RAG статус</FileInfoLabel>
                      <RagStatusBadge $active={currentNode.rag_actual}>
                        {currentNode.rag_actual && <RagStatusDot $active={true} />}
                        {currentNode.rag_actual ? 'Актуальный' : 'Не актуальный'}
                      </RagStatusBadge>
                    </FileInfoItem>
                  )}
                  
                  {currentNode.rag_in_progress !== undefined && currentNode.rag_in_progress && (
                    <FileInfoItem>
                      <FileInfoLabel>Обработка RAG</FileInfoLabel>
                      <RagStatusBadge $inProgress={true}>
                        <RagStatusDot $inProgress={true} />
                        В очереди
                      </RagStatusBadge>
                    </FileInfoItem>
                  )}
                  
                  {currentNode.rag_started && (
                    <FileInfoItem>
                      <FileInfoLabel>RAG начат</FileInfoLabel>
                      <FileInfoValue>{formatDate(currentNode.rag_started)}</FileInfoValue>
                    </FileInfoItem>
                  )}
                  
                  {currentNode.rag_finished && (
                    <FileInfoItem>
                      <FileInfoLabel>RAG завершен</FileInfoLabel>
                      <FileInfoValue>{formatDate(currentNode.rag_finished)}</FileInfoValue>
                    </FileInfoItem>
                  )}
                </FileInfoSection>
              ) : (
                <FileInfoSection>
                  <FileInfoTitle>Информация</FileInfoTitle>
                  <FileInfoValue>Выберите файл для просмотра информации</FileInfoValue>
                </FileInfoSection>
              )}
            </ModalContent>
          </ModalCard>
        </ModalOverlay>
      )}
    </>
  );
}

