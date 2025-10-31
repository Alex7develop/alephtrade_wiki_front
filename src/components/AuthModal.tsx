import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../store/store';
import { sendSms, confirmSms, getUser, logout } from '../store/fsSlice';

const ModalBg = styled.div`
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  
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
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0,0,0,.2);
  position: relative;
  z-index: 2001;
  
  /* Мобильные устройства */
  @media (max-width: 768px) {
    width: 100%;
    max-width: calc(100vw - 32px);
    padding: 20px;
    border-radius: 16px;
  }
  
  @media (max-width: 480px) {
    padding: 16px;
    max-width: calc(100vw - 16px);
  }
`;

const Title = styled.h2`
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 16px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 16px;
  transition: border-color 0.2s ease;
  
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
  padding: 12px 16px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryAccent};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(90,90,90,.2);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
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
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('7')) {
      const match = cleaned.match(/^7(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
      if (match) {
        const [, a, b, c, d] = match;
        return `+7 ${a ? `${a}` : ''}${b ? `-${b}` : ''}${c ? `-${c}` : ''}${d ? `-${d}` : ''}`;
      }
    }
    return value;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return;
    
    const cleanPhone = phone.replace(/\D/g, '');
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
    setStep('phone');
    setPhone('');
    setCode('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalBg onClick={handleClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {step === 'phone' && (
          <>
            <Title>Вход в систему</Title>
            <form onSubmit={handlePhoneSubmit}>
              <Input
                type="tel"
                placeholder="+7 ___-___-__-__"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                maxLength={18}
              />
              <Button type="submit" disabled={auth.loading || phone.length < 10}>
                {auth.loading ? 'Отправка...' : 'Отправить код'}
              </Button>
              {auth.error && <Error>{auth.error}</Error>}
            </form>
          </>
        )}

        {step === 'code' && (
          <>
            <BackButton onClick={() => setStep('phone')}>
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
