import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { createFolder, setSearch } from '@/store/fsSlice';
import type { RootState } from '@/store/store';
import logoSrc from '/icon/featherIcon.svg';
import { useEffect, useState } from 'react';
import { useThemeMode } from '@/styles/ThemeMode';

const Bar = styled.div`
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 8px;
`;

const Logo = styled.img`
  width: 28px;
  height: 28px;
  display: block;
`;

const BrandTitle = styled.div`
  font-weight: 700;
  font-size: 18px;
`;

const Search = styled.input`
  flex: 1;
  height: 40px;
  border-radius: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  padding: 0 16px;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; box-shadow: 0 0 0 3px rgba(58,134,255,.15); }
`;

const Button = styled.button`
  height: 40px;
  padding: 0 16px;
  border-radius: 24px;
  background: linear-gradient(180deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.primaryAccent});
  color: #fff;
  border: none;
  cursor: pointer;
  transition: transform .06s ease, filter .2s ease;
  &:hover { filter: brightness(1.05); }
  &:active { transform: translateY(1px); }
`;

const Toggle = styled.button`
  height: 40px;
  padding: 0 12px;
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
`;

export function Header() {
  const dispatch = useDispatch();
  const search = useSelector((s: RootState) => s.fs.search);
  const selectedFolderId = useSelector((s: RootState) => s.fs.selectedFolderId);
  const { mode, toggle } = useThemeMode();

  return (
    <Bar>
      <Brand>
        <Logo src={logoSrc} alt="logo" />
        <BrandTitle>Wiki</BrandTitle>
      </Brand>
      <Search
        value={search}
        onChange={(e) => dispatch(setSearch(e.target.value))}
        placeholder="Поиск по названию..."
      />
      <Button onClick={() => dispatch(createFolder({ parentId: selectedFolderId }))}>
        + Папка
      </Button>
      <Toggle onClick={toggle} title="Сменить тему">
        {mode === 'light' ? '🌙 Тёмная' : '☀️ Светлая'}
      </Toggle>
    </Bar>
  );
}


