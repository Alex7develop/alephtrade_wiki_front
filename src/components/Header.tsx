import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { setSearch, createFolderAPI, uploadFileAPI } from '@/store/fsSlice';
import type { RootState } from '@/store/store';
import logoSrc from '/icon/featherIcon.svg';
import { useEffect, useState } from 'react';
import { useThemeMode } from '@/styles/ThemeMode';
import React, { useRef } from 'react';

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

const UploadModalBg = styled.div`
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(30,40,70,.34);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const UploadModal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.md};
  border-radius: 14px;
  padding: 32px 40px 24px;
  min-width: 300px; min-height: 120px;
  position: relative;
  display: flex; flex-direction: column; gap: 18px;
`;
const UploadTitle = styled.div`
  font-weight: 700;
  font-size: 20px;
`;
const UploadActions = styled.div`
  display: flex; gap: 14px; justify-content: flex-end;
`;
const UploadError = styled.div`
  color: #df2935; margin-top: -6px; font-size: 15px;
`;
const FileField = styled.input`
  font-size: 15px; display: block;
`;

export function Header() {
  const dispatch: any = useDispatch();
  const search = useSelector((s: RootState) => s.fs.search);
  const selectedFolderId = useSelector((s: RootState) => s.fs.selectedFolderId);
  const { mode, toggle } = useThemeMode();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const onChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setUploadError(null);
  };
  const onUpload = async () => {
    setUploadError(null);
    if (!file) { setUploadError('Выберите файл'); return; }
    if (!/\.(pdf|md)$/i.test(file.name)) {
      setUploadError('Можно загрузить только PDF или MD'); return;
    }
    setUploading(true);
    try {
      await dispatch(uploadFileAPI({ file, parentId: selectedFolderId }));
      setUploadOpen(false); setFile(null);
    } catch (e: any) {
      setUploadError(e?.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };
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
      <Button
        onClick={() => dispatch(createFolderAPI({ parentId: selectedFolderId }))}
      >
        + Папка
      </Button>
      <Button
        style={{ background: 'linear-gradient(180deg, #16c2ff, #478afd)', marginLeft: 4 }}
        onClick={() => setUploadOpen(true)}
      >
        ⬆ Загрузить файл
      </Button>
      <Toggle onClick={toggle} title="Сменить тему">
        {mode === 'light' ? '🌙 Тёмная' : '☀️ Светлая'}
      </Toggle>
      {uploadOpen && (
        <UploadModalBg onClick={() => !uploading && setUploadOpen(false)}>
          <UploadModal onClick={e => e.stopPropagation()}>
            <UploadTitle>Загрузка файла</UploadTitle>
            <FileField
              type="file"
              accept=".md,.pdf"
              ref={fileInput}
              disabled={uploading}
              onChange={onChooseFile}
            />
            {file && <div style={{fontSize:15, color:'#888'}}>Файл: {file.name}</div>}
            {uploadError && <UploadError>{uploadError}</UploadError>}
            <UploadActions>
              <Button disabled={uploading} style={{ background: '#eee', color:'#223', fontWeight:500 }} onClick={()=>{if(!uploading)setUploadOpen(false);}}>Отмена</Button>
              <Button
                type="button"
                style={{ minWidth: 100, opacity: uploading ? 0.7 : 1 }}
                disabled={uploading}
                onClick={onUpload}
              >{uploading ? 'Загрузка...' : 'Загрузить'}</Button>
            </UploadActions>
          </UploadModal>
        </UploadModalBg>
      )}
    </Bar>
  );
}


