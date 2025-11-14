import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../store/store';
import { sendSms, confirmSms, getUser, logout } from '../store/fsSlice';

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

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.text};
  }
  
  &:active {
    opacity: 0.8;
  }
`;

const Title = styled.h2`
  margin: 0 0 16px 0;
  padding-right: 32px;
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

const Button = styled.button`
  width: 100%;
  padding: 8px 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 400;
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
  color: #e74c3c;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
`;

const Success = styled.div`
  color: #27ae60;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 16px;
  padding: 0;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const UserInfo = styled.div`
  text-align: center;
  margin-bottom: 20px;
`;

const UserName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`;

const UserPhone = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<any>();
  const { auth } = useSelector((state: RootState) => state.fs);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'user'>('phone');

  // Автоматически закрываем модальное окно после успешной авторизации
  useEffect(() => {
    if (auth.user && auth.isAuthenticated) {
      // Небольшая задержка для показа успешного состояния
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [auth.user, auth.isAuthenticated, onClose]);

  const formatPhone = (value: string) => {
    // Удаляем все нецифровые символы
    const cleaned = value.replace(/\D/g, '');
    
    // Если начинается с 7 или 8, заменяем на 7
    let phoneNumber = cleaned;
    if (phoneNumber.startsWith('8')) {
      phoneNumber = '7' + phoneNumber.slice(1);
    } else if (!phoneNumber.startsWith('7') && phoneNumber.length > 0) {
      // Если не начинается с 7 или 8, добавляем 7
      phoneNumber = '7' + phoneNumber;
    }
    
    // Форматируем номер
    if (phoneNumber.startsWith('7')) {
      const match = phoneNumber.match(/^7(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
      if (match) {
        const [, a, b, c, d] = match;
        let formatted = '+7';
        if (a) formatted += ` ${a}`;
        if (b) formatted += `-${b}`;
        if (c) formatted += `-${c}`;
        if (d) formatted += `-${d}`;
        return formatted;
      }
    }
    
    // Если пусто, возвращаем +7
    if (cleaned.length === 0) {
      return '+7';
    }
    
    return '+7 ' + phoneNumber.slice(1);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    // Проверяем, что есть код страны (7) и минимум 10 цифр всего
    if (cleanPhone.length < 11) return;
    
    const phoneWithPrefix = cleanPhone.startsWith('7') ? `+${cleanPhone}` : `+7${cleanPhone}`;
    const result = await dispatch(sendSms(phoneWithPrefix));
    
    if (sendSms.fulfilled.match(result)) {
      setStep('code');
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) return;
    
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithPrefix = cleanPhone.startsWith('7') ? `+${cleanPhone}` : `+7${cleanPhone}`;
    const result = await dispatch(confirmSms({ phone: phoneWithPrefix, code }));
    
    if (confirmSms.fulfilled.match(result)) {
      // Пользователь уже приходит в confirmSms, getUser не нужен
    }
  };

  const handleLogout = async () => {
    if (auth.token) {
      await dispatch(logout(auth.token));
    }
    setStep('phone');
    setPhone('');
    setCode('');
    onClose();
  };

  const handleClose = () => {
    // Позволяем закрыть модальное окно в любой момент
    setStep('phone');
    setPhone('');
    setCode('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalBg onClick={handleClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseButton 
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }} 
          title="Закрыть"
        >
          ×
        </CloseButton>
        {step === 'phone' && (
          <>
            <Title>Вход в систему</Title>
            <form onSubmit={handlePhoneSubmit}>
              <Input
                type="tel"
                placeholder="+7 ___-___-__-__"
                value={phone}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Если поле пустое или начинается с +7, форматируем
                  if (newValue.length === 0 || newValue.startsWith('+7')) {
                    setPhone(formatPhone(newValue));
                  } else {
                    // Если пользователь удалил +7, добавляем обратно
                    setPhone(formatPhone(newValue));
                  }
                }}
                onFocus={(e) => {
                  // При фокусе, если поле пустое или не начинается с +7, устанавливаем +7
                  if (!e.target.value || !e.target.value.startsWith('+7')) {
                    setPhone('+7');
                  }
                }}
                maxLength={18}
              />
              <Button type="submit" disabled={auth.loading || phone.replace(/\D/g, '').length < 11}>
                {auth.loading ? 'Отправка...' : 'Отправить код'}
              </Button>
              {auth.error && <Error>{auth.error}</Error>}
            </form>
          </>
        )}

        {step === 'code' && (
          <>
            <BackButton onClick={() => {
              setStep('phone');
              setCode('');
            }}>
              ← Назад
            </BackButton>
            <Title>Введите код</Title>
            <form onSubmit={handleCodeSubmit}>
              <Input
                type="text"
                placeholder="Код из SMS"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
              <Button type="submit" disabled={auth.loading || code.length < 4}>
                {auth.loading ? 'Проверка...' : 'Подтвердить'}
              </Button>
              {auth.error && <Error>{auth.error}</Error>}
            </form>
          </>
        )}

        {step === 'user' && auth.user && (
          <>
            <Title>Добро пожаловать!</Title>
            <UserInfo>
              <UserName>{`${auth.user.name} ${auth.user.second_name} ${auth.user.patronymic}`}</UserName>
              <UserPhone>{auth.user.phone}</UserPhone>
            </UserInfo>
            <Button onClick={handleLogout}>
              Выйти
            </Button>
          </>
        )}
      </Modal>
    </ModalBg>
  );
};

