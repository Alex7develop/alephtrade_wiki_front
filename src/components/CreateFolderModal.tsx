import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../store/store';
import { createFolderAPI } from '../store/fsSlice';

const ModalBg = styled.div`
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    z-index: 2000;
    padding: 16px;
    align-items: flex-start;
    padding-top: 20%;
  }
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 6px;
  padding: 20px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
  border: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  z-index: 2001;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    width: 100%;
    max-width: calc(100vw - 32px);
    padding: 16px;
    border-radius: 6px;
  }
  
  @media (max-width: 480px) {
    padding: 16px;
    max-width: calc(100vw - 16px);
  }
`;

const Title = styled.h2`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 12px;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 12px;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Button = styled.button`
  flex: 1;
  padding: 8px 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: background-color 0.15s ease;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryAccent};
  }
  
  &:active:not(:disabled) {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Error = styled.div`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 13px;
  margin-top: 8px;
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 8px 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: background-color 0.15s ease;
  
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  }
  
  &:active {
    opacity: 0.8;
  }
`;

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ 
  isOpen, 
  onClose,
  parentId 
}) => {
  const dispatch = useDispatch<any>();
  const { loading } = useSelector((state: RootState) => state.fs);
  const [name, setName] = useState('');
  const [access, setAccess] = useState<0 | 1>(1);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Введите название папки');
      return;
    }
    
    try {
      const result = await dispatch(createFolderAPI({ 
        parentId, 
        name: name.trim(),
        access 
      }));
      
      if (createFolderAPI.fulfilled.match(result)) {
        // Успешно создано - закрываем модальное окно и очищаем форму
        setName('');
        setAccess(1);
        setError(null);
        onClose();
      } else {
        setError(result.payload as string || 'Ошибка создания папки');
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка создания папки');
    }
  };

  const handleClose = () => {
    setName('');
    setAccess(1);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalBg onClick={handleClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>Укажите название папки</Title>
        <form onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder="Название папки"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={255}
          />
          <Select
            value={access}
            onChange={(e) => setAccess(Number(e.target.value) as 0 | 1)}
          >
            <option value={1}>Приватная (1)</option>
            <option value={0}>Публичная (0)</option>
          </Select>
          {error && <Error>{error}</Error>}
          <ButtonGroup>
            <CancelButton type="button" onClick={handleClose}>
              Отмена
            </CancelButton>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Создание...' : 'Создать'}
            </Button>
          </ButtonGroup>
        </form>
      </Modal>
    </ModalBg>
  );
};

