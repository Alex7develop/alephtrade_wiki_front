import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef, useState, useMemo } from 'react';
import type { RootState } from '@/store/store';
import { selectFile, selectFolder, moveNodeAPI } from '@/store/fsSlice';
import { renameFileAPI } from '@/store/fsSlice';

const Wrap = styled.div`
  padding: 20px;
  background: ${({ theme }) => theme.colors.surface};
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    padding: 12px;
    padding-bottom: 80px; /* Место для bottom navigation */
  }
  
  @media (max-width: 480px) {
    padding: 8px;
    padding-bottom: 70px;
  }
`;

const Row = styled.div<{ selected?: boolean; $dragging?: boolean }>`
  display: grid;
  grid-template-columns: 1fr 100px;
  align-items: center;
  min-height: 48px;
  height: auto;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  background: ${({ selected, theme }) => (selected ? theme.colors.primary : theme.colors.surface)};
  color: ${({ selected, theme }) => (selected ? '#fff' : theme.colors.text)};
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-bottom: 8px;
  border: 1px solid ${({ theme, selected }) => selected ? 'transparent' : theme.colors.border};
  box-shadow: ${({ $dragging, selected, theme }) => 
    $dragging ? `0 4px 12px rgba(0,0,0,0.15)` : 
    selected ? `0 2px 8px rgba(0,0,0,0.1)` : 
    `0 1px 3px rgba(0,0,0,0.05)`};
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  
  &:hover { 
    background: ${({ selected, theme }) => (selected ? theme.colors.primary : theme.colors.surfaceAlt)};
    transform: translateY(-1px);
    box-shadow: ${({ selected, theme }) => selected ? 
      `0 2px 8px rgba(0,0,0,0.15)` : 
      `0 4px 12px rgba(0,0,0,0.1)`};
  }
  
  &:active {
    transform: scale(0.98);
    box-shadow: ${({ theme }) => `0 2px 4px rgba(0,0,0,0.1)`};
  }
  
  /* Мобильные устройства - увеличенные touch targets */
  @media (max-width: 768px) {
    min-height: 56px;
    padding: 14px 16px;
    margin-bottom: 10px;
    border-radius: ${({ theme }) => theme.radius.md};
    box-shadow: ${({ $dragging, selected, theme }) => 
      $dragging ? `0 4px 16px rgba(0,0,0,0.2)` : 
      selected ? `0 2px 12px rgba(0,0,0,0.15)` : 
      `0 2px 8px rgba(0,0,0,0.08)`};
    width: 100%;
    max-width: 100%;
  }
  
  @media (max-width: 480px) {
    min-height: 60px;
    padding: 16px;
    margin-bottom: 12px;
    grid-template-columns: 1fr auto;
    gap: 12px;
    width: 100%;
    max-width: 100%;
  }
`;

const Title = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
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

// Функция для поиска родительской папки файла
function findParentFolder(node: any, targetId: string, parent: any = null): any | null {
  if (node.id === targetId) return parent;
  if (node.children) {
    for (const child of node.children) {
      const found = findParentFolder(child, targetId, node);
      if (found !== null) return found;
    }
  }
  return null;
}

// Функция для рекурсивного поиска всех файлов в дереве
function findAllFiles(node: any, query: string): any[] {
  if (!node) return [];
  
  let results: any[] = [];
  const searchQuery = query.trim().toLowerCase();
  
  if (!searchQuery) return [];
  
  // Если это файл, проверяем название
  if (node.type === 'file') {
    if (node.name && typeof node.name === 'string') {
      const fileName = node.name.toLowerCase();
      if (fileName.includes(searchQuery)) {
        results.push(node);
      }
    }
  }
  
  // Рекурсивно ищем в дочерних элементах (для папок и корневого узла)
  // Корневой узел тоже может иметь children, поэтому обрабатываем его
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      if (child) {
        const childResults = findAllFiles(child, query);
        results = results.concat(childResults);
      }
    }
  }
  
  return results;
}

export function FilesList() {
  const dispatch: any = useDispatch();
  const { root, selectedFolderId, selectedFileId, search, searchType, searchResults, searchLoading, searchError } = useSelector((s: RootState) => s.fs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const folder = find(root, selectedFolderId);
  
  // Определяем отображаемые файлы в зависимости от типа поиска
  // Используем useMemo для оптимизации и отслеживания изменений
  const filtered = useMemo(() => {
    let result: any[] = [];
    
    if (search && search.trim().length > 0) {
      console.log('🔍 Поиск активен:', { search, searchType, rootExists: !!root, rootChildren: root?.children?.length });
      
      if (searchType === 'ai') {
        // AI поиск - используем результаты серверного поиска (по всему дереву)
        result = Array.isArray(searchResults) 
          ? searchResults.filter((item: any) => item && item.type === 'file')
          : [];
        console.log('🤖 AI поиск результатов:', result.length);
      } else {
        // Локальный поиск - ищем по всему дереву файлов по названию
        try {
          if (root && root.children) {
            result = findAllFiles(root, search);
            console.log('📄 Локальный поиск результатов:', result.length, result.map((f: any) => f.name));
            // Убеждаемся, что получили массив
            if (!Array.isArray(result)) {
              result = [];
            }
          } else {
            console.warn('⚠️ Root или root.children не определены', { root, hasChildren: !!root?.children });
            result = [];
          }
        } catch (error) {
          console.error('❌ Ошибка поиска файлов:', error);
          result = [];
        }
      }
    } else {
      // Обычный режим - показываем все элементы (папки и файлы) из текущей папки
      result = (folder?.children ?? []).filter((c: any) => c && (c.type === 'file' || c.type === 'folder'));
    }
    
    return result;
  }, [search, searchType, root, searchResults, folder]);
  
  // Отладочный useEffect для отслеживания изменений
  useEffect(() => {
    if (search && search.trim().length > 0) {
      console.log('📝 Поиск изменился:', { search, searchType, filteredCount: filtered.length });
    }
  }, [search, searchType, filtered.length]);

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
  
  function getItemIcon(item: any): string {
    if (item.type === 'folder') {
      return '📁';
    }
    return getFileIcon(item.mime);
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
      {search && search.trim().length > 0 && searchType === 'ai' && searchLoading && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          AI поиск...
        </div>
      )}
      {searchError && search && search.trim().length > 0 && searchType === 'ai' && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#e74c3c' }}>
          Ошибка поиска: {searchError}
        </div>
      )}
      {filtered.length === 0 && search && search.trim().length > 0 && 
       (searchType === 'local' || (!searchLoading && !searchError)) && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          Ничего не найдено по запросу "{search}"
          {searchType === 'local' && (
            <div style={{ fontSize: '12px', marginTop: '8px', color: '#aaa' }}>
              Поиск выполнен по всему дереву файлов
            </div>
          )}
        </div>
      )}
      {filtered.map((f: any) => (
        <Row
          key={f.id}
          selected={f.type === 'folder' ? selectedFolderId === f.id : selectedFileId === f.id}
          $dragging={draggingId === f.id}
          style={{
            boxShadow: draggingId === f.id ? '0 0 8px #3178ff' :
              dropTargetId === f.id ? 'inset 0 0 0 2px #31a8ff' : undefined
          }}
          draggable
          onDragStart={e => {
            console.log('🚀 onDragStart вызван для файла:', f.id, f.name);
            setDraggingId(f.id);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', f.id);
          }}
          onDragEnd={() => {
            console.log('🏁 onDragEnd вызван');
            setDraggingId(null);
            setDropTargetId(null);
          }}
          onDragOver={e => {
            e.preventDefault();
            e.stopPropagation();
            // Показываем визуальную обратную связь при наведении на файл
            if (draggingId && draggingId !== f.id) {
              setDropTargetId(f.id);
            }
            // Логируем для отладки
            if (draggingId && draggingId !== f.id) {
              console.log('📍 onDragOver над файлом:', f.id, f.name, 'перетаскиваем:', draggingId);
            }
          }}
          onDragLeave={() => {
            // Убираем визуальную обратную связь только если покидаем элемент
            setDropTargetId(null);
          }}
          onDrop={e => {
            e.preventDefault();
            e.stopPropagation(); // Предотвращаем всплытие события
            const draggedId = draggingId || e.dataTransfer.getData('text/plain');
            
            console.log('🎯 onDrop вызван на файле:', {
              draggedId,
              draggingId,
              targetFileId: f.id,
              folderId: folder?.id,
              search,
              filteredLength: filtered.length
            });
            
            // Если перетаскиваем файл на другой файл
            if (draggedId && draggedId !== f.id && folder?.id) {
              console.log('✅ Условия выполнены, вызываем moveNodeAPI');
              // Определяем индексы файлов в списке
              const draggedIndex = filtered.findIndex((item: any) => item.id === draggedId);
              const targetIndex = filtered.findIndex((item: any) => item.id === f.id);
              
              console.log('📍 Индексы файлов:', {
                draggedIndex,
                targetIndex,
                draggedId,
                targetId: f.id
              });
              
              // Проверяем, находятся ли файлы в одной папке
              // При обычном просмотре (без поиска) все файлы из текущей папки
              const isSameFolder = !search || search.trim().length === 0;
              
              console.log('📁 Проверка условий:', {
                isSameFolder,
                draggedIndexValid: draggedIndex !== -1,
                targetIndexValid: targetIndex !== -1,
                folderId: folder.id,
                search
              });
              
              if (isSameFolder && draggedIndex !== -1 && targetIndex !== -1) {
                // Файлы в одной папке - изменяем порядок
                // Находим родительскую папку перетаскиваемого файла
                const draggedFileParent = findParentFolder(root, draggedId);
                const isAlreadyInFolder = draggedFileParent && draggedFileParent.id === folder.id;
                
                // Определяем позицию: если перетаскиваем вниз (draggedIndex > targetIndex),
                // файл должен быть после целевого. Если вверх (draggedIndex < targetIndex) - перед целевым
                const isMovingDown = draggedIndex > targetIndex;
                
                // Вычисляем новую позицию
                let newOrder: number;
                let beforeUuid: string | undefined;
                let afterUuid: string | undefined;
                
                if (isMovingDown) {
                  // Перетаскиваем вниз - файл должен быть после целевого
                  newOrder = targetIndex + 1;
                  afterUuid = f.id;
                  // Находим следующий файл после целевого для более точной позиции
                  if (targetIndex < filtered.length - 1) {
                    const nextFile = filtered[targetIndex + 1];
                    if (nextFile && nextFile.id !== draggedId) {
                      beforeUuid = nextFile.id;
                    }
                  }
                } else {
                  // Перетаскиваем вверх - файл должен быть перед целевым
                  newOrder = targetIndex;
                  beforeUuid = f.id;
                  // Находим предыдущий файл перед целевым для более точной позиции
                  if (targetIndex > 0) {
                    const prevFile = filtered[targetIndex - 1];
                    if (prevFile && prevFile.id !== draggedId) {
                      afterUuid = prevFile.id;
                    }
                  }
                }
                
                console.log('🔄 Изменение порядка файлов:', {
                  draggedId,
                  targetId: f.id,
                  draggedIndex,
                  targetIndex,
                  isMovingDown,
                  newOrder,
                  beforeUuid,
                  afterUuid,
                  folderId: folder.id,
                  isAlreadyInFolder,
                  draggedFileParent: draggedFileParent?.id
                });
                
                // Для изменения порядка в одной папке передаем parent_uuid явно
                // (даже если файл уже в этой папке) - это может помочь API понять намерение
                const params: any = {
                  uuid: draggedId,
                  parent_uuid: folder.id, // Явно указываем родителя для изменения порядка
                  order: newOrder, // Числовая позиция (индекс в списке, начиная с 0 или 1)
                  after_uuid: afterUuid || undefined, // UUID файла после которого вставить
                  before_uuid: beforeUuid || undefined // UUID файла перед которым вставить
                };
                
                // Убираем undefined значения
                Object.keys(params).forEach(key => {
                  if (params[key] === undefined) {
                    delete params[key];
                  }
                });
                
                console.log('📞 Вызываем moveNodeAPI с параметрами:', params);
                dispatch(moveNodeAPI(params));
              } else {
                // Перемещаем файл в эту папку (между папками)
                console.log('📞 Вызываем moveNodeAPI для перемещения между папками:', {
                  uuid: draggedId,
                  parent_uuid: folder.id
                });
                dispatch(moveNodeAPI({ 
                  uuid: draggedId, 
                  parent_uuid: folder.id 
                }));
              }
            } else {
              console.log('❌ Условия не выполнены:', {
                draggedId,
                fId: f.id,
                folderId: folder?.id,
                draggedIdExists: !!draggedId,
                differentFiles: draggedId !== f.id,
                folderExists: !!folder?.id
              });
            }
            
            setDraggingId(null);
            setDropTargetId(null);
          }}
          onClick={() => {
            if (f.type === 'folder') {
              dispatch(selectFolder(f.id));
              // Не сбрасываем selectedFileId - оставляем как есть
            } else {
              dispatch(selectFile(f.id));
            }
          }}
          onDoubleClick={() => {
            if (f.type === 'file') {
              setEditingId(f.id);
              setEditingValue(f.name);
            }
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
              <span>{getItemIcon(f)}</span>
              {f.name}
            </Title>
          )}
          <Type>{f.type === 'folder' ? 'папка' : getTypeLabel(f.mime)}</Type>
        </Row>
      ))}
      {/* Прокидываем drop на сам список — если drag file, drop на фон = file dvig в текущую папку (имеет смысл только при drag с другой вкладки/уровня) */}
      <div
        style={{height:8, width:'100%'}}
        onDragOver={e => {
          e.preventDefault();
          console.log('📍 onDragOver на фоне списка');
        }}
        onDrop={e => {
          e.preventDefault();
          console.log('🎯 onDrop на фоне списка');
          // Определим id drag-элемента
          const id = e.dataTransfer.getData('text/plain');
          console.log('📦 Данные из dataTransfer:', id);
          if (id && id !== selectedFolderId && folder?.id) {
            console.log('📞 Вызываем moveNodeAPI с фона списка');
            dispatch(moveNodeAPI({ uuid: id, parent_uuid: folder.id }));
          }
        }}
      />
    </Wrap>
  );
}


