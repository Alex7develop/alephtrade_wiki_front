import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import type { RootState } from '@/store/store';
import { fetchTree, FsNode } from '@/store/fsSlice';

const PageWrap = styled.div`
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.surface};
  padding: 32px 16px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
`;

const Card = styled.div`
  width: min(960px, 100%);
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const VideoWrapper = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: black;
`;

const VideoFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const InfoText = styled.div`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const PrimaryLink = styled.a`
  padding: 10px 20px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  font-weight: 600;
  text-align: center;
`;

const SecondaryLink = styled(Link)`
  padding: 10px 20px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
  text-align: center;
`;

const Message = styled.div`
  padding: 24px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
`;

const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 4px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

function extractUuidFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const clean = url.split('?')[0];
    const segments = clean.split('/');
    const last = segments.pop();
    if (!last) return null;
    const dotIndex = last.lastIndexOf('.');
    return dotIndex === -1 ? last : last.slice(0, dotIndex);
  } catch {
    return null;
  }
}

function findNodeByShareId(node: FsNode, targetId: string): FsNode | null {
  const normalizedTarget = targetId.toLowerCase();
  if (node.type === 'file') {
    const shareId = extractUuidFromUrl(node.url)?.toLowerCase();
    const nodeId = node.id?.toLowerCase?.() ?? node.id;
    if (nodeId === normalizedTarget || (!!shareId && shareId === normalizedTarget)) {
      return node;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByShareId(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

function isVideoNode(node?: FsNode | null): boolean {
  if (!node || node.type !== 'file') return false;
  const url = node.url?.toLowerCase() ?? '';
  return (
    node.mime?.startsWith('video') ||
    url.includes('runtime.video.cloud.yandex.net') ||
    /\.(mp4|mov|avi|mkv|webm)(\?|$)/i.test(node.url ?? '')
  );
}

type VideoSharePageProps = {
  uuidOverride?: string;
};

export function VideoSharePage({ uuidOverride }: VideoSharePageProps) {
  const params = useParams<{ uuid: string }>();
  const paramUuid = params.uuid;
  const uuid = uuidOverride ?? paramUuid;
  const dispatch = useDispatch();
  const { root, loading } = useSelector((state: RootState) => state.fs);
  const [requestedTree, setRequestedTree] = useState(false);

  useEffect(() => {
    if (requestedTree) return;
    const hasTree = Array.isArray(root.children) && root.children.length > 0;
    const load = async () => {
      if (!hasTree) {
        await dispatch(fetchTree(0) as any);
      }
      setRequestedTree(true);
    };
    load();
  }, [dispatch, requestedTree, root.children]);

  const node = useMemo(() => {
    if (!uuid) return null;
    return findNodeByShareId(root, uuid);
  }, [root, uuid]);

  const isVideo = isVideoNode(node);
  const isLoading = loading || !requestedTree || (!node && !requestedTree);

  return (
    <PageWrap>
      <Card>
        <Title>{node?.name || 'Загрузка видео...'}</Title>
        {isLoading && (
          <Message>
            <Spinner />
          </Message>
        )}
        {!isLoading && !node && (
          <Message>Файл не найден или больше недоступен.</Message>
        )}
        {!isLoading && node && !isVideo && (
          <Message>Для прямого просмотра доступны только видеофайлы.</Message>
        )}
        {!isLoading && node && isVideo && node.url && (
          <>
            <VideoWrapper>
              <VideoFrame
                src={node.url}
                allow="autoplay; fullscreen; accelerometer; gyroscope; picture-in-picture; encrypted-media"
                allowFullScreen
                scrolling="no"
                title={node.name}
              />
            </VideoWrapper>
            <InfoText>Ссылка можно делиться напрямую — видео доступно без лишних шагов.</InfoText>
            <Actions>
              <PrimaryLink href={node.url} target="_blank" rel="noopener noreferrer">
                Открыть оригинал
              </PrimaryLink>
              <SecondaryLink to={`/${node.id}`}>Открыть в Wiki</SecondaryLink>
            </Actions>
          </>
        )}
      </Card>
    </PageWrap>
  );
}

