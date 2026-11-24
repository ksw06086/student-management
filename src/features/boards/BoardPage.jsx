import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  File,
  FileArchive,
  FileImage,
  FileText,
  Heart,
  Image,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { formatKoreanDateTime } from '../../shared/dateFormat.js';
import { logUiTiming } from '../../services/api.js';
import {
  BOARD_DEFINITIONS,
  BOARD_DRAFT_KEY,
  BOARD_FILE_TYPES,
  BOARD_PAGE_SIZE,
  BOARD_UPLOAD_LIMIT,
  boardUploadSessionMatches,
  boardFileExtension,
  boardFileType,
  boardLabel,
  formatBoardBytes,
  highlightText,
  isBoardImageFile,
} from './boards.js';
import './boards.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';
const CHUNK_SIZE = 8 * 1024 * 1024;

export default function BoardPage({ auth, api, isAdmin, notify }) {
  const [boardId, setBoardId] = useState('board_1');
  const [view, setView] = useState('list');
  const [initialized, setInitialized] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadedListKey, setLoadedListKey] = useState('');
  const [listError, setListError] = useState(null);
  const [listErrorKey, setListErrorKey] = useState('');
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    query: '',
    searchField: 'all',
    authorName: '',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
    sort: 'newest',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [moveTarget, setMoveTarget] = useState('board_1');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previews, setPreviews] = useState({});
  const [documentPreview, setDocumentPreview] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [draft, setDraft] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [removedFileIds, setRemovedFileIds] = useState([]);
  const [uploadSessions, setUploadSessions] = useState([]);
  const [progress, setProgress] = useState({});
  const [activeUploadId, setActiveUploadId] = useState('');
  const [failedUploadIds, setFailedUploadIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [commentSort, setCommentSort] = useState('newest');
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const inputRef = useRef(null);
  const xhrRef = useRef(null);
  const touchStartRef = useRef(null);
  const listRequestRef = useRef(0);
  const loadedListKeyRef = useRef('');

  const board = BOARD_DEFINITIONS.find(item => item.id === boardId) || BOARD_DEFINITIONS[0];
  const draftStorageKey = `${BOARD_DRAFT_KEY}:${auth.user.userId}:${boardId}:${draft?.postId || 'new'}`;
  const isPhoto = board.type === 'photo';
  const unreadCount = notifications.filter(item => !item.readAt).length;
  const currentListKey = `${boardId}:${view}`;
  const hasCurrentList = loadedListKey === currentListKey;
  const currentListError = listErrorKey === currentListKey ? listError : null;
  const visiblePosts = hasCurrentList ? posts : [];
  const visibleTotal = hasCurrentList ? total : null;
  const visiblePageCount = hasCurrentList ? Math.max(1, Math.ceil(total / BOARD_PAGE_SIZE)) : 1;

  const loadStatus = useCallback(async () => {
    // 게시판 초기화 상태를 먼저 확인하며, 성공한 뒤 목록과 알림 조회가 이어집니다.
    try {
      const result = await api('boardStatus', { token: auth.token });
      setInitialized(result.initialized ? result : result);
    } catch (error) {
      setInitialized({ initialized: false, error: error.message });
    }
  }, [api, auth.token]);

  const loadList = useCallback(async () => {
    // 현재 게시판·보기·검색 조건·정렬·페이지를 API에 전달합니다. 새 요청 번호와 키로 이전 응답을 구분합니다.
    if (!initialized?.initialized || !['list', 'drafts', 'trash'].includes(view)) return;
    const requestId = ++listRequestRef.current;
    const requestKey = `${boardId}:${view}`;
    if (loadedListKeyRef.current !== requestKey) {
      setPosts([]);
      setTotal(0);
    }
    setLoading(true);
    setListError(null);
    setListErrorKey('');
    const startedAt = performance.now();
    let outcome = 'ok';
    try {
      const result = await api('boardPosts', {
        token: auth.token,
        boardId,
        page,
        pageSize: BOARD_PAGE_SIZE,
        ...appliedFilters,
        includeDeleted: view === 'trash',
        includeDrafts: view === 'drafts',
      });
      if (requestId !== listRequestRef.current) return;
      setPosts(result.posts || []);
      setTotal(result.total || 0);
      loadedListKeyRef.current = requestKey;
      setLoadedListKey(requestKey);
      setSelectedIds([]);
    } catch (error) {
      outcome = 'error';
      if (requestId !== listRequestRef.current) return;
      setListError(error);
      setListErrorKey(requestKey);
    } finally {
      if (requestId === listRequestRef.current) setLoading(false);
      logUiTiming('boards', 'list_load_flow', startedAt, outcome);
    }
  }, [api, appliedFilters, auth.token, boardId, initialized, page, view]);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await api('boardNotifications', { token: auth.token });
      setNotifications(result.notifications || []);
    } catch (_) {
      // 게시판 기능은 알림 API 오류와 별도로 계속 사용할 수 있습니다.
    }
  }, [api, auth.token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);
  useEffect(() => {
    loadList();
    return () => {
      listRequestRef.current += 1;
    };
  }, [loadList]);
  useEffect(() => {
    if (!initialized?.initialized) return undefined;
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 60000);
    return () => window.clearInterval(timer);
  }, [initialized, loadNotifications]);
  useEffect(() => {
    if (!isPhoto || !posts.length) return;
    const listPreviews = Object.fromEntries(
      posts
        .filter(post => post.coverFileId && post.previewUrl)
        .map(post => [post.coverFileId, post.previewUrl]),
    );
    if (Object.keys(listPreviews).length)
      setPreviews(current => ({ ...current, ...listPreviews }));
  }, [isPhoto, posts]);
  useEffect(() => {
    if (!detail) return;
    const imageIds = (detail.files || []).filter(isBoardImageFile).map(file => file.fileId);
    if (!imageIds.length) return;
    api('boardImagePreviews', { token: auth.token, fileIds: imageIds })
      .then(result => setPreviews(current => ({ ...current, ...result.previews })))
      .catch(() => {});
  }, [api, auth.token, detail, isPhoto]);
  useEffect(() => {
    if (!draft || saving) return undefined;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            title: draft.title,
            content: draft.content,
            postId: draft.postId || '',
            coverFileId: draft.coverFileId || '',
            fileOrder: draft.fileOrder || [],
            isNotice: !!draft.isNotice,
            isPinned: !!draft.isPinned,
            isImportant: !!draft.isImportant,
            uploadSessions,
          }),
        );
      } catch (_) {
        // 저장 공간이 가득 찬 경우에도 편집 화면 입력은 유지합니다.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft, draftStorageKey, saving, uploadSessions]);
  useEffect(
    () => () => {
      pendingFiles.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    },
    [pendingFiles],
  );
  useEffect(() => {
    if (lightboxIndex < 0) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setLightboxIndex(-1);
      if (event.key === 'ArrowRight') setLightboxIndex(index => (index + 1) % galleryImages.length);
      if (event.key === 'ArrowLeft')
        setLightboxIndex(index => (index - 1 + galleryImages.length) % galleryImages.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex]);
  useEffect(() => {
    if (!['stats', 'logs'].includes(view)) return;
    const action = view === 'stats' ? 'boardAdminStats' : 'boardActivityLogs';
    api(action, { token: auth.token })
      .then(result =>
        view === 'stats' ? setStats(result.stats) : setActivityLogs(result.logs || []),
      )
      .catch(error => notify(error.message, 'error'));
  }, [api, auth.token, notify, view]);

  const galleryImages = useMemo(
    () => (detail?.files || []).filter(isBoardImageFile).sort((a, b) => a.sortOrder - b.sortOrder),
    [detail],
  );
  const sortedComments = useMemo(() => {
    const items = [...(detail?.comments || [])];
    const compare = (a, b) => a.createdAt.localeCompare(b.createdAt);
    items.sort((a, b) => (commentSort === 'oldest' ? compare(a, b) : compare(b, a)));
    return items;
  }, [commentSort, detail]);

  async function initializeBoards() {
    setInitializing(true);
    try {
      const result = await api('initializeBoards', { token: auth.token });
      setInitialized({ initialized: true, missing: [] });
      notify(
        result.created?.length
          ? `게시판 시트 ${result.created.length}개를 만들었습니다.`
          : '게시판 시트가 준비되어 있습니다.',
      );
    } catch (error) {
      notify(error.message, 'error');
      await loadStatus();
    } finally {
      setInitializing(false);
    }
  }

  function applySearch(event) {
    event?.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function selectBoard(nextBoardId) {
    setBoardId(nextBoardId);
    setMoveTarget(nextBoardId);
    setPage(1);
    setView('list');
    setDetail(null);
    setSelectedIds([]);
    setFilters(current => ({ ...current, query: '', authorName: '' }));
    setAppliedFilters(current => ({ ...current, query: '', authorName: '' }));
  }

  async function openPost(post, selectedBoardId = boardId) {
    setBoardId(selectedBoardId);
    setMoveTarget(selectedBoardId);
    setDetailLoading(true);
    setView('detail');
    try {
      const result = await api('boardPost', {
        token: auth.token,
        boardId: selectedBoardId,
        postId: post.postId,
      });
      setDetail(result.post);
      setPosts(current =>
        current.map(item =>
          item.postId === post.postId ? { ...item, viewCount: result.post.viewCount } : item,
        ),
      );
    } catch (error) {
      notify(error.message, 'error');
      setView('list');
    } finally {
      setDetailLoading(false);
    }
  }

  function openEditor(post = null) {
    setPendingFiles([]);
    setRemovedFileIds([]);
    setProgress({});
    setActiveUploadId('');
    setFailedUploadIds([]);
    setPreviewMode(false);
    setDetail(null);
    setView('editor');
    const initial = post
      ? {
          postId: post.postId,
          boardId,
          title: post.title,
          content: post.content,
          existingFiles: [...(post.files || [])].sort((a, b) => a.sortOrder - b.sortOrder),
          coverFileId: post.coverFileId || '',
          status: post.status || 'active',
          fileOrder: [...(post.files || [])]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(file => file.fileId),
          isNotice: post.isNotice,
          isPinned: post.isPinned,
          isImportant: post.isImportant,
        }
      : {
          boardId,
          title: '',
          content: '',
          existingFiles: [],
          coverFileId: '',
          fileOrder: [],
          status: 'new',
        };
    let restored = null;
    try {
      restored = JSON.parse(
        localStorage.getItem(
          `${BOARD_DRAFT_KEY}:${auth.user.userId}:${boardId}:${post?.postId || 'new'}`,
        ) || 'null',
      );
    } catch (_) {}
    const restoredSessions = restored?.uploadSessions || [];
    const resumablePostIds = [
      ...new Set(
        restoredSessions
          .filter(session => session.boardId === boardId && session.postId)
          .map(session => session.postId),
      ),
    ];
    const recoveredPostId =
      post?.postId ||
      restored?.postId ||
      (resumablePostIds.length === 1 ? resumablePostIds[0] : '');
    setDraft(
      restored
        ? {
            ...initial,
            ...restored,
            postId: recoveredPostId,
            status:
              initial.status === 'active' ? 'active' : recoveredPostId ? 'draft' : initial.status,
            existingFiles: initial.existingFiles,
          }
        : initial,
    );
    setUploadSessions(restoredSessions);
  }

  function closeEditor() {
    if (saving && !window.confirm('업로드가 진행 중입니다. 화면을 닫을까요?')) return;
    xhrRef.current?.xhr?.abort();
    setDraft(null);
    setPendingFiles([]);
    setUploadSessions([]);
    setView('list');
  }

  function addFiles(fileList) {
    const incoming = [...fileList];
    const currentSize = pendingFiles.reduce((sum, item) => sum + item.file.size, 0);
    let addedSize = 0;
    for (const file of incoming) {
      const extension = boardFileExtension(file.name);
      const rule = BOARD_FILE_TYPES[extension];
      if (!rule || (isPhoto && rule.type !== 'image')) {
        notify(
          isPhoto
            ? '사진 게시판에는 이미지 파일만 첨부할 수 있습니다.'
            : `${file.name}: 허용되지 않는 파일 형식입니다.`,
          'warning',
        );
        return;
      }
      const mime = file.type || 'application/octet-stream';
      const csvAllowed =
        extension === 'csv' &&
        ['text/csv', 'text/plain', 'application/vnd.ms-excel'].includes(mime);
      if (mime !== 'application/octet-stream' && mime !== rule.mime && !csvAllowed) {
        notify(`${file.name}: 파일 형식과 MIME 정보가 일치하지 않습니다.`, 'warning');
        return;
      }
      addedSize += file.size;
    }
    if (currentSize + addedSize > BOARD_UPLOAD_LIMIT) {
      notify('신규 게시판은 한 번 업로드할 때 파일 합계 100MB까지 가능합니다.', 'warning');
      return;
    }
    const matchedSessionIds = new Set();
    const next = incoming.map(file => {
      const resume = uploadSessions.find(
        session =>
          boardUploadSessionMatches(session, session.clientId, boardId, draft?.postId) &&
          session.originalFilename === file.name &&
          session.fileSize === file.size &&
          !matchedSessionIds.has(session.uploadId) &&
          !pendingFiles.some(item => item.clientId === session.clientId),
      );
      if (resume) matchedSessionIds.add(resume.uploadId);
      return {
        clientId: resume?.clientId || crypto.randomUUID(),
        file,
        isCover: false,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      };
    });
    setPendingFiles(current => {
      if (isPhoto && !draft.coverFileId && !current.length && next.length) next[0].isCover = true;
      return [...current, ...next];
    });
    setDraft(current => ({
      ...current,
      coverFileId:
        isPhoto && !current.coverFileId && !pendingFiles.length && next.length
          ? `pending:${next[0].clientId}`
          : current.coverFileId,
      fileOrder: [...(current.fileOrder || []), ...next.map(item => item.clientId)],
    }));
  }

  function removePending(clientId) {
    setPendingFiles(current => {
      const removed = current.find(item => item.clientId === clientId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      setDraft(value => ({
        ...value,
        fileOrder: (value.fileOrder || []).filter(id => id !== clientId),
        coverFileId: value.coverFileId === `pending:${clientId}` ? '' : value.coverFileId,
      }));
      return current.filter(item => item.clientId !== clientId);
    });
  }

  async function uploadOne(upload, file) {
    // 각 파일을 8MiB 이하 Blob 청크로 나누어 순차 전송하고 Worker가 돌려준 실제 수신 위치로 이어갑니다.
    let offset = 0;
    setActiveUploadId(upload.uploadId);
    setFailedUploadIds(current => current.filter(id => id !== upload.uploadId));
    try {
      while (offset < file.size) {
        const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size));
        const result = await sendBoardChunk(
          {
            uploadId: upload.uploadId,
            token: auth.token,
            start: offset,
            chunk,
            onProgress: sent =>
              setProgress(current => ({ ...current, [upload.uploadId]: offset + sent })),
          },
          xhrRef,
        );
        if (!result.ok) throw new Error(result.error || '파일 업로드에 실패했습니다.');
        if (result.done) {
          if (!result.file?.fileId || (isPhoto && result.file.fileType !== 'image'))
            throw new Error('사진 업로드 완료 정보를 확인하지 못했습니다. 다시 시도해 주세요.');
          return result.file;
        }
        if (result.received < offset || result.received > file.size)
          throw new Error('파일 업로드 위치 정보가 올바르지 않습니다.');
        offset = result.received;
      }
    } catch (error) {
      setFailedUploadIds(current => [...new Set([...current, upload.uploadId])]);
      throw error;
    } finally {
      setActiveUploadId(current => (current === upload.uploadId ? '' : current));
    }
    throw new Error('업로드가 완료되지 않았습니다. 파일을 다시 선택해 이어서 진행해 주세요.');
  }

  async function uploadPending(postId) {
    const matchingSession = (item, session) =>
      boardUploadSessionMatches(session, item.clientId, boardId, postId);
    const newFiles = pendingFiles.filter(
      item => !uploadSessions.some(session => matchingSession(item, session)),
    );
    let sessions = [...uploadSessions];
    if (newFiles.length) {
      const result = await api('boardUploadStart', {
        token: auth.token,
        boardId,
        postId,
        files: newFiles.map(item => ({
          clientId: item.clientId,
          name: item.file.name,
          size: item.file.size,
          mimeType: BOARD_FILE_TYPES[boardFileExtension(item.file.name)].mime,
          isCover: item.isCover,
        })),
      });
      sessions = [...sessions, ...(result.uploads || [])];
      setUploadSessions(sessions);
    }
    const uploaded = [];
    const orderedFiles = [...pendingFiles].sort(
      (a, b) =>
        (draft.fileOrder || []).indexOf(a.clientId) - (draft.fileOrder || []).indexOf(b.clientId),
    );
    for (const item of orderedFiles) {
      const session = sessions.find(value => matchingSession(item, value));
      if (!session)
        throw new Error(
          `${item.file.name}: 업로드 세션을 준비하지 못했습니다. 다시 시도해 주세요.`,
        );
      const file = await uploadOne(session, item.file);
      if (!file?.fileId || (isPhoto && file.fileType !== 'image'))
        throw new Error(`${item.file.name}: 서버에 저장된 사진 정보를 확인하지 못했습니다.`);
      uploaded.push({ ...file, clientId: item.clientId });
      setFailedUploadIds(current => current.filter(id => id !== session.uploadId));
      setDraft(current => {
        if (!current) return current;
        const pendingCoverId = `pending:${item.clientId}`;
        return {
          ...current,
          existingFiles: [
            ...current.existingFiles.filter(existing => existing.fileId !== file.fileId),
            {
              fileId: file.fileId,
              originalFilename: file.originalFilename || item.file.name,
              fileType: file.fileType,
              mimeType: file.mimeType,
              fileSize: file.fileSize || item.file.size,
              sortOrder: current.existingFiles.length,
            },
          ],
          fileOrder: (current.fileOrder || []).map(id => (id === item.clientId ? file.fileId : id)),
          coverFileId: current.coverFileId === pendingCoverId ? file.fileId : current.coverFileId,
        };
      });
      sessions = sessions.filter(value => value.uploadId !== session.uploadId);
      setUploadSessions(sessions);
      setPendingFiles(current => current.filter(value => value.clientId !== item.clientId));
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      setProgress(current => ({ ...current, [session.uploadId]: item.file.size }));
    }
    if (orderedFiles.some(item => !uploaded.some(file => file.clientId === item.clientId)))
      throw new Error('선택한 파일 중 업로드가 완료되지 않은 파일이 있습니다.');
    return uploaded;
  }

  async function saveEditor(publish) {
    if (!draft || saving) return;
    const title = String(draft.title || '').trim();
    if (!title) return notify('제목을 입력해 주세요.', 'warning');
    if (isPhoto && String(draft.content || '').length > 200)
      return notify('사진 설명은 200자 이내로 입력해 주세요.', 'warning');
    const hasPhotoAttachment =
      pendingFiles.some(isBoardImageFile) ||
      draft.existingFiles.some(
        file => !removedFileIds.includes(file.fileId) && isBoardImageFile(file),
      );
    const orphanPhotoSessions = uploadSessions.filter(
      session =>
        session.boardId === boardId &&
        !!draft.postId &&
        session.postId === draft.postId &&
        boardFileType(session.originalFilename) === 'image' &&
        !pendingFiles.some(item => item.clientId === session.clientId),
    );
    if (isPhoto && publish && orphanPhotoSessions.length) {
      return notify(
        '이전 사진 업로드가 중단되어 있습니다. 같은 사진 파일을 다시 선택해 이어서 업로드하거나, 업로드 취소 후 등록해 주세요.',
        'warning',
      );
    }
    if (isPhoto && publish && !hasPhotoAttachment) {
      const hasInterruptedImageUpload = uploadSessions.some(
        session =>
          boardFileType(session.originalFilename) === 'image' &&
          !pendingFiles.some(item => item.clientId === session.clientId),
      );
      return notify(
        hasInterruptedImageUpload
          ? '사진 업로드가 중단되어 있습니다. 같은 사진 파일을 다시 선택해 업로드를 이어간 뒤 등록해 주세요.'
          : '사진 게시글은 이미지를 한 장 이상 첨부해야 등록할 수 있습니다.',
        'warning',
      );
    }
    setSaving(true);
    try {
      const result = await api('saveBoardPost', {
        token: auth.token,
        post: {
          postId: draft.postId,
          boardId,
          title,
          content: String(draft.content || ''),
          publish: false,
          isNotice: draft.isNotice,
          isPinned: draft.isPinned,
          isImportant: draft.isImportant,
        },
      });
      const postId = result.postId;
      if (!draft.postId) setDraft(current => ({ ...current, postId, status: 'draft' }));
      const uploaded = await uploadPending(postId);
      for (const fileId of removedFileIds)
        await api('deleteBoardFile', { token: auth.token, fileId });
      const remaining = draft.existingFiles
        .filter(file => !removedFileIds.includes(file.fileId))
        .map(file => file.fileId);
      const uploadedByClientId = new Map(uploaded.map(file => [file.clientId, file.fileId]));
      const fallbackOrder = [...remaining, ...uploaded.map(file => file.fileId)];
      const allFileIds = (draft.fileOrder || [])
        .map(id => (remaining.includes(id) ? id : uploadedByClientId.get(id)))
        .filter(Boolean);
      if (!allFileIds.length) allFileIds.push(...fallbackOrder);
      if (
        isPhoto &&
        publish &&
        !draft.existingFiles.some(
          file => !removedFileIds.includes(file.fileId) && isBoardImageFile(file),
        ) &&
        !uploaded.some(isBoardImageFile)
      ) {
        throw new Error('사진 업로드가 완료되지 않았습니다. 사진을 다시 선택해 업로드해 주세요.');
      }
      if (draft.status === 'active' && allFileIds.length) {
        await api('reorderBoardFiles', { token: auth.token, postId, fileIds: allFileIds });
      }
      const selectedExistingCover =
        draft.coverFileId &&
        !String(draft.coverFileId).startsWith('pending:') &&
        !removedFileIds.includes(draft.coverFileId);
      if (isPhoto && selectedExistingCover) {
        await api('setBoardCoverFile', { token: auth.token, postId, fileId: draft.coverFileId });
      } else if (isPhoto && draft.coverFileId && String(draft.coverFileId).startsWith('pending:')) {
        const clientId = String(draft.coverFileId).slice('pending:'.length);
        const cover = uploaded.find(file => file.clientId === clientId);
        if (cover)
          await api('setBoardCoverFile', { token: auth.token, postId, fileId: cover.fileId });
      } else if (isPhoto && allFileIds.length) {
        const coverId = allFileIds.find(
          id =>
            draft.existingFiles.some(file => file.fileId === id && isBoardImageFile(file)) ||
            uploaded.some(file => file.fileId === id && isBoardImageFile(file)),
        );
        if (coverId) await api('setBoardCoverFile', { token: auth.token, postId, fileId: coverId });
      }
      if (publish && draft.status !== 'active')
        await api('publishBoardPost', { token: auth.token, postId });
      try {
        localStorage.removeItem(draftStorageKey);
        localStorage.removeItem(`${BOARD_DRAFT_KEY}:${auth.user.userId}:${boardId}:${postId}`);
      } catch (_) {}
      setDraft(null);
      setPendingFiles([]);
      setUploadSessions([]);
      setRemovedFileIds([]);
      setSaving(false);
      if (publish) {
        notify(draft.status === 'active' ? '게시글을 수정했습니다.' : '게시글을 등록했습니다.');
        const opened = await api('boardPost', { token: auth.token, boardId, postId });
        setDetail(opened.post);
        setView('detail');
      } else if (draft.status === 'active') {
        notify('게시글 수정 내용을 저장했습니다.');
        const opened = await api('boardPost', { token: auth.token, boardId, postId });
        setDetail(opened.post);
        setView('detail');
      } else {
        notify('임시저장했습니다.');
        setView('drafts');
      }
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function cancelUpload(session) {
    if (xhrRef.current?.uploadId === session.uploadId) xhrRef.current.xhr.abort();
    try {
      await fetch(`${API_URL}/boards/cancel`, {
        method: 'POST',
        headers: { 'X-Upload-Id': session.uploadId, 'X-Session-Token': auth.token },
      });
      setUploadSessions(current => current.filter(item => item.uploadId !== session.uploadId));
      setFailedUploadIds(current => current.filter(id => id !== session.uploadId));
      notify('파일 업로드를 취소했습니다.');
    } catch (error) {
      notify(error.message || '업로드 취소에 실패했습니다.', 'error');
    }
  }

  async function downloadFile(file) {
    try {
      const result = await api('boardDownload', { token: auth.token, fileId: file.fileId });
      window.location.assign(result.downloadUrl);
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function downloadAllFiles() {
    try {
      const result = await api('boardZipDownload', {
        token: auth.token,
        boardId,
        postId: detail.postId,
      });
      window.location.assign(result.downloadUrl);
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function previewTextFile(file) {
    try {
      const result = await api('boardImagePreviews', {
        token: auth.token,
        fileIds: [file.fileId],
      });
      const url = result.previews?.[file.fileId];
      if (!url) throw new Error('파일 미리보기를 준비하지 못했습니다.');
      setDocumentPreview({ url, filename: file.originalFilename });
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function deletePost(post) {
    if (!window.confirm(`“${post.title}” 게시글을 삭제함으로 이동할까요?`)) return;
    try {
      await api('deleteBoardPost', { token: auth.token, postId: post.postId });
      notify('게시글을 삭제함으로 이동했습니다.');
      if (view === 'detail') {
        setDetail(null);
        setView('list');
      }
      await loadList();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function restorePost(post) {
    try {
      await api('restoreBoardPost', { token: auth.token, postId: post.postId });
      notify('게시글을 복구했습니다.');
      await loadList();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function purgePost(post) {
    if (
      !window.confirm(
        `“${post.title}” 게시글과 Drive 파일을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
      )
    )
      return;
    try {
      await api('purgeBoardPost', { token: auth.token, postId: post.postId });
      notify('게시글을 영구 삭제했습니다.');
      await loadList();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function bulkAction(action) {
    if (!selectedIds.length) return notify('게시글을 선택해 주세요.', 'warning');
    if (
      action === 'delete' &&
      !window.confirm(`선택한 ${selectedIds.length}개 게시글을 삭제함으로 이동할까요?`)
    )
      return;
    try {
      await api('bulkBoardPosts', {
        token: auth.token,
        actionType: action,
        postIds: selectedIds,
        targetBoardId: moveTarget,
      });
      notify(
        action === 'delete'
          ? '선택한 게시글을 삭제함으로 이동했습니다.'
          : `${boardLabel(moveTarget)}로 게시글을 이동했습니다.`,
      );
      await loadList();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function movePost(post, targetBoardId) {
    try {
      await api('bulkBoardPosts', {
        token: auth.token,
        actionType: 'move',
        postIds: [post.postId],
        targetBoardId,
      });
      setBoardId(targetBoardId);
      setPage(1);
      setDetail(null);
      setView('list');
      notify(`${boardLabel(targetBoardId)}로 게시글을 이동했습니다.`);
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function saveComment(event) {
    event.preventDefault();
    const content = commentText;
    if (!String(content || '').trim()) return;
    try {
      await api('saveBoardComment', {
        token: auth.token,
        comment: {
          postId: detail.postId,
          parentId: editingComment?.parentId || replyTo?.commentId || '',
          commentId: editingComment?.commentId,
          content,
        },
      });
      setCommentText('');
      setReplyTo(null);
      setEditingComment(null);
      const result = await api('boardPost', { token: auth.token, boardId, postId: detail.postId });
      setDetail(result.post);
      loadNotifications();
      notify(editingComment ? '댓글을 수정했습니다.' : '댓글을 등록했습니다.');
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function removeComment(comment) {
    if (!window.confirm('댓글을 삭제할까요?')) return;
    try {
      await api('deleteBoardComment', { token: auth.token, commentId: comment.commentId });
      const result = await api('boardPost', { token: auth.token, boardId, postId: detail.postId });
      setDetail(result.post);
      notify('댓글을 삭제했습니다.');
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function likeComment(comment) {
    try {
      const result = await api('toggleBoardCommentLike', {
        token: auth.token,
        commentId: comment.commentId,
      });
      setDetail(current => ({
        ...current,
        comments: current.comments.map(item =>
          item.commentId === comment.commentId
            ? { ...item, likedByMe: result.liked, likeCount: result.likeCount }
            : item,
        ),
      }));
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function toggleCommentLock() {
    try {
      await api('setBoardCommentLock', {
        token: auth.token,
        postId: detail.postId,
        locked: !detail.commentsLocked,
      });
      setDetail(current => ({ ...current, commentsLocked: !current.commentsLocked }));
      notify(detail.commentsLocked ? '댓글 잠금을 해제했습니다.' : '댓글을 잠갔습니다.');
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function toggleNotifications() {
    if (!notificationsOpen) {
      try {
        await api('markBoardNotificationsRead', { token: auth.token });
        setNotifications(current =>
          current.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
        );
      } catch (_) {}
    }
    setNotificationsOpen(value => !value);
  }

  function selectAll(checked) {
    setSelectedIds(checked ? posts.map(post => post.postId) : []);
  }

  async function exportBoardPosts(boardIds, filters = {}) {
    try {
      const allPosts = [];
      for (const targetBoardId of boardIds) {
        let currentPage = 1;
        let totalPages = 1;
        while (currentPage <= totalPages) {
          const result = await api('boardPosts', {
            token: auth.token,
            boardId: targetBoardId,
            page: currentPage,
            pageSize: 50,
            ...filters,
          });
          allPosts.push(...(result.posts || []));
          totalPages = Math.ceil((result.total || 0) / 50);
          currentPage += 1;
        }
      }
      exportPosts(allPosts);
    } catch (error) {
      notify(error.message, 'error');
    }
  }
  function toggleSelected(postId) {
    setSelectedIds(current =>
      current.includes(postId) ? current.filter(id => id !== postId) : [...current, postId],
    );
  }

  const renderMarkers = post => (
    <span className="board-markers">
      {post.isNotice && <b className="board-marker notice">공지</b>}
      {post.isPinned && (
        <b className="board-marker pinned">
          <Pin size={11} /> 고정
        </b>
      )}
      {post.isImportant && <b className="board-marker important">중요</b>}
      {post.commentsLocked && <LockKeyhole size={14} aria-label="댓글 잠금" />}
    </span>
  );

  function renderTitle(post) {
    return (
      <>
        {renderMarkers(post)}
        <span>{renderHighlight(post.title, appliedFilters.query)}</span>
      </>
    );
  }

  function renderListState(emptyMessage) {
    if (currentListError) {
      return (
        <BoardContentState type="error" onRetry={loadList}>
          게시글을 불러오지 못했습니다.
        </BoardContentState>
      );
    }
    if (!hasCurrentList || (loading && !visiblePosts.length)) {
      return (
        <BoardContentState type="loading">
          {isPhoto ? '사진 게시글을 불러오는 중입니다…' : '게시글을 불러오는 중입니다…'}
        </BoardContentState>
      );
    }
    if (!visiblePosts.length) {
      return <BoardContentState type="empty">{emptyMessage}</BoardContentState>;
    }
    return null;
  }

  const hasSearchCriteria = Object.entries(appliedFilters).some(
    ([key, value]) => key !== 'sort' && String(value || '').trim(),
  );
  const emptyListMessage = hasSearchCriteria
    ? '검색 결과가 없습니다.'
    : view === 'trash'
      ? '삭제된 게시글이 없습니다.'
      : view === 'drafts'
        ? '임시저장한 게시글이 없습니다.'
        : isPhoto
          ? '등록된 사진 게시글이 없습니다.'
          : '등록된 게시글이 없습니다.';

  function renderPostTable() {
    const columnCount =
      6 + (isAdmin && view === 'list' ? 1 : 0) + (isAdmin && view === 'trash' ? 1 : 0);
    return (
      <div className="board-table-wrap">
        <table className="board-table">
          <thead>
            <tr>
              {isAdmin && view === 'list' && (
                <th className="board-check-col">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={posts.length > 0 && selectedIds.length === posts.length}
                    onChange={event => selectAll(event.target.checked)}
                  />
                </th>
              )}
              <th className="board-number-col">번호</th>
              <th>제목</th>
              <th>작성자</th>
              <th>작성일</th>
              <th>조회</th>
              <th>댓글</th>
              {isAdmin && view === 'trash' && <th>관리</th>}
            </tr>
          </thead>
          <tbody>
            {visiblePosts.length ? (
              visiblePosts.map((post, index) => (
                <tr
                  key={post.postId}
                  className={`${post.isImportant ? 'board-row-important' : ''} ${post.status === 'deleted' ? 'board-row-deleted' : ''}`}
                >
                  {isAdmin && view === 'list' && (
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`${post.title} 선택`}
                        checked={selectedIds.includes(post.postId)}
                        onChange={() => toggleSelected(post.postId)}
                      />
                    </td>
                  )}
                  <td>
                    {post.isNotice ? (
                      <span className="board-notice-number">공지</span>
                    ) : (
                      total - ((page - 1) * BOARD_PAGE_SIZE + index)
                    )}
                  </td>
                  <td>
                    <button
                      className="board-title-button"
                      onClick={() =>
                        view === 'trash'
                          ? null
                          : view === 'drafts'
                            ? openEditor(post)
                            : openPost(post)
                      }
                    >
                      {renderTitle(post)}
                      <span className="board-comment-count">
                        {post.commentCount > 0 ? ` [${post.commentCount}]` : ''}
                      </span>
                    </button>
                  </td>
                  <td>{renderHighlight(post.authorName, appliedFilters.query)}</td>
                  <td>{formatKoreanDateTime(post.createdAt) || '-'}</td>
                  <td>{post.viewCount}</td>
                  <td>{post.commentCount}</td>
                  {isAdmin && view === 'trash' && (
                    <td className="board-trash-actions">
                      <button className="outline-button" onClick={() => restorePost(post)}>
                        <Undo2 size={14} /> 복구
                      </button>
                      <button className="danger-button" onClick={() => purgePost(post)}>
                        <Trash2 size={14} /> 영구 삭제
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td className="board-table-state-cell" colSpan={columnCount}>
                  {renderListState(emptyListMessage)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderMobilePosts() {
    return (
      <div className="board-mobile-list">
        {visiblePosts.map(post => (
          <article className="board-mobile-card" key={post.postId}>
            <div className="board-mobile-card-head">
              {isAdmin && view === 'list' && (
                <input
                  type="checkbox"
                  aria-label={`${post.title} 선택`}
                  checked={selectedIds.includes(post.postId)}
                  onChange={() => toggleSelected(post.postId)}
                />
              )}
              <button
                className="board-title-button"
                onClick={() =>
                  view === 'trash' ? null : view === 'drafts' ? openEditor(post) : openPost(post)
                }
              >
                {renderTitle(post)}
                <span className="board-comment-count">
                  {post.commentCount > 0 ? ` [${post.commentCount}]` : ''}
                </span>
              </button>
            </div>
            <div className="board-mobile-meta">
              <span>{post.authorName}</span>
              <span>{formatKoreanDateTime(post.createdAt) || '-'}</span>
              <span>조회 {post.viewCount}</span>
              <span>댓글 {post.commentCount}</span>
            </div>
            {isAdmin && view === 'trash' && (
              <div className="board-mobile-actions">
                <button className="outline-button" onClick={() => restorePost(post)}>
                  <Undo2 size={14} /> 복구
                </button>
                <button className="danger-button" onClick={() => purgePost(post)}>
                  <Trash2 size={14} /> 영구 삭제
                </button>
              </div>
            )}
          </article>
        ))}
        {!visiblePosts.length && renderListState(emptyListMessage)}
      </div>
    );
  }

  function renderPhotoGrid() {
    if (!visiblePosts.length) {
      return <div className="board-photo-grid">{renderListState(emptyListMessage)}</div>;
    }
    return (
      <div className="board-photo-grid">
        {visiblePosts.map(post => {
          const imageUrl = previews[post.coverFileId] || post.previewUrl || '';
          return (
            <article className="board-photo-entry" key={post.postId}>
              {isAdmin && view === 'list' && (
                <input
                  className="board-photo-select"
                  type="checkbox"
                  aria-label={`${post.title} 선택`}
                  checked={selectedIds.includes(post.postId)}
                  onChange={() => toggleSelected(post.postId)}
                />
              )}
              <button
                className="board-photo-card"
                onClick={() => (view === 'drafts' ? openEditor(post) : openPost(post))}
              >
                <span className="board-photo-thumb">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      onError={event => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Image size={34} aria-hidden="true" />
                  )}
                  {renderMarkers(post)}
                </span>
                <span className="board-photo-card-body">
                  <strong>{renderHighlight(post.title, appliedFilters.query)}</strong>
                  <span className="board-photo-excerpt">
                    {post.content || '사진 설명이 없습니다.'}
                  </span>
                  <small>
                    {post.authorName} · {formatKoreanDateTime(post.createdAt) || '-'}
                  </small>
                  <small>
                    조회 {post.viewCount} · 댓글 {post.commentCount}
                  </small>
                </span>
              </button>
            </article>
          );
        })}
      </div>
    );
  }

  function renderFilters() {
    return (
      <form className="board-toolbar" onSubmit={applySearch}>
        <div className="board-search-row">
          <label className="board-search">
            <Search size={17} aria-hidden="true" />
            <input
              value={filters.query}
              onChange={event => setFilters(current => ({ ...current, query: event.target.value }))}
              placeholder={isPhoto ? '사진 제목, 설명, 작성자 검색' : '제목, 내용, 작성자 검색'}
            />
            <button type="submit" className="board-tool-button" aria-label="검색">
              <Search size={16} />
            </button>
          </label>
          {!isPhoto && (
            <select
              value={filters.searchField}
              onChange={event =>
                setFilters(current => ({ ...current, searchField: event.target.value }))
              }
              aria-label="검색 범위"
            >
              <option value="all">전체 검색</option>
              <option value="title">제목</option>
              <option value="content">내용</option>
              <option value="author">작성자</option>
            </select>
          )}
          <select
            value={filters.sort}
            onChange={event => {
              setFilters(current => ({ ...current, sort: event.target.value }));
              setAppliedFilters(current => ({ ...current, sort: event.target.value }));
              setPage(1);
            }}
            aria-label="정렬"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="views">조회수순</option>
          </select>
          {!isPhoto && (
            <button
              type="button"
              className={`outline-button board-advanced-toggle ${advancedOpen ? 'active' : ''}`}
              onClick={() => setAdvancedOpen(value => !value)}
            >
              상세 검색
            </button>
          )}
        </div>
        {advancedOpen && !isPhoto && (
          <div className="board-advanced-search">
            <label>
              작성자
              <input
                value={filters.authorName}
                onChange={event =>
                  setFilters(current => ({ ...current, authorName: event.target.value }))
                }
                placeholder="작성자 이름"
              />
            </label>
            <fieldset>
              <legend>작성일</legend>
              <input
                type="date"
                aria-label="작성 시작일"
                value={filters.createdFrom}
                onChange={event =>
                  setFilters(current => ({ ...current, createdFrom: event.target.value }))
                }
              />
              <span>~</span>
              <input
                type="date"
                aria-label="작성 종료일"
                value={filters.createdTo}
                onChange={event =>
                  setFilters(current => ({ ...current, createdTo: event.target.value }))
                }
              />
            </fieldset>
            <fieldset>
              <legend>수정일</legend>
              <input
                type="date"
                aria-label="수정 시작일"
                value={filters.updatedFrom}
                onChange={event =>
                  setFilters(current => ({ ...current, updatedFrom: event.target.value }))
                }
              />
              <span>~</span>
              <input
                type="date"
                aria-label="수정 종료일"
                value={filters.updatedTo}
                onChange={event =>
                  setFilters(current => ({ ...current, updatedTo: event.target.value }))
                }
              />
            </fieldset>
            <button
              type="button"
              className="outline-button"
              onClick={() => {
                const clear = {
                  ...filters,
                  authorName: '',
                  createdFrom: '',
                  createdTo: '',
                  updatedFrom: '',
                  updatedTo: '',
                };
                setFilters(clear);
                setPage(1);
                setAppliedFilters(clear);
              }}
            >
              조건 초기화
            </button>
          </div>
        )}
      </form>
    );
  }

  function renderAdminTools() {
    if (!isAdmin || view === 'trash' || view === 'drafts') return null;
    return (
      <div className="board-admin-tools">
        <label className="board-select-all">
          <input
            type="checkbox"
            checked={posts.length > 0 && selectedIds.length === posts.length}
            onChange={event => selectAll(event.target.checked)}
          />{' '}
          게시글 선택
        </label>
        <select
          value={moveTarget}
          onChange={event => setMoveTarget(event.target.value)}
          aria-label="이동할 게시판"
        >
          {BOARD_DEFINITIONS.map(item => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          className="outline-button"
          onClick={() => bulkAction('move')}
          disabled={!selectedIds.length}
        >
          선택 이동
        </button>
        <button
          className="danger-button"
          onClick={() => bulkAction('delete')}
          disabled={!selectedIds.length}
        >
          <Trash2 size={14} /> 선택 삭제
        </button>
        <button
          className="outline-button"
          onClick={() => {
            setView('trash');
            setPage(1);
          }}
        >
          삭제함
        </button>
        <button
          className="outline-button"
          onClick={() => {
            setView('drafts');
            setPage(1);
          }}
        >
          임시저장함
        </button>
        <button className="outline-button" onClick={() => setView('stats')}>
          통계
        </button>
        <button className="outline-button" onClick={() => setView('logs')}>
          활동 로그
        </button>
        <button
          className="outline-button"
          onClick={() => exportBoardPosts([boardId], appliedFilters)}
        >
          <Download size={14} /> Excel 호환 CSV
        </button>
      </div>
    );
  }

  if (initialized && !initialized.initialized) {
    return (
      <section className="panel board-setup-panel">
        <Shield size={28} />
        <h2>게시판 저장 공간 준비</h2>
        <p>신규 게시판용 시트가 아직 준비되지 않았습니다. 기존 자료실 시트는 변경하지 않습니다.</p>
        {initialized.invalid?.length > 0 && (
          <p className="board-error">헤더 확인이 필요한 시트: {initialized.invalid.join(', ')}</p>
        )}
        {initialized.missing?.length > 0 && (
          <p className="board-muted">생성 예정: {initialized.missing.join(', ')}</p>
        )}
        {initialized.error && <p className="board-error">{initialized.error}</p>}
        {isAdmin ? (
          <button className="primary-button" onClick={initializeBoards} disabled={initializing}>
            {initializing ? <LoaderCircle className="board-spin" size={16} /> : <Plus size={16} />}{' '}
            게시판 시트 초기화
          </button>
        ) : (
          <p>관리자에게 게시판 시트 초기화를 요청해 주세요.</p>
        )}
      </section>
    );
  }

  return (
    <section className="panel board-page">
      <header className="panel-title board-page-heading">
        <div>
          <div className="board-title-line">
            <Archive size={20} />
            <h1>게시판</h1>
          </div>
          <p>공지와 사진, 구성원 소식을 나눕니다.</p>
        </div>
        <div className="board-heading-actions">
          <button
            className="board-notification-button"
            onClick={toggleNotifications}
            aria-label={`알림 ${unreadCount}개`}
          >
            <Bell size={18} />
            {unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}
          </button>
          {view === 'list' && (
            <>
              <button
                className="outline-button"
                onClick={() => {
                  setView('drafts');
                  setPage(1);
                }}
              >
                임시저장함
              </button>
              <button className="primary-button" onClick={() => openEditor()}>
                <Plus size={16} /> 글쓰기
              </button>
            </>
          )}
        </div>
        {notificationsOpen && (
          <div className="board-notifications">
            <div>
              <b>게시판 알림</b>
              <button
                className="icon-button"
                onClick={() => setNotificationsOpen(false)}
                aria-label="알림 닫기"
              >
                <X size={16} />
              </button>
            </div>
            {notifications.length ? (
              notifications.slice(0, 12).map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    openPost({ postId: item.postId }, item.boardId);
                    setNotificationsOpen(false);
                  }}
                >
                  {item.message} · {formatKoreanDateTime(item.createdAt)}
                </button>
              ))
            ) : (
              <p>새 알림이 없습니다.</p>
            )}
          </div>
        )}
      </header>

      <nav className="board-tabs" aria-label="게시판 선택">
        {BOARD_DEFINITIONS.map(item => (
          <button
            key={item.id}
            className={item.id === boardId ? 'active' : ''}
            onClick={() => selectBoard(item.id)}
          >
            {item.type === 'photo' ? <Image size={16} /> : <MessageCircle size={16} />}
            {item.label}
          </button>
        ))}
      </nav>

      {view === 'list' || view === 'trash' || view === 'drafts' ? (
        <>
          <div className="board-list-heading">
            <div>
              <h2>
                {view === 'trash' ? '삭제함' : view === 'drafts' ? '임시저장함' : board.label}
              </h2>
              <span>
                {visibleTotal === null
                  ? currentListError
                    ? '불러오기 실패'
                    : '불러오는 중…'
                  : `${visibleTotal}개 게시글`}
              </span>
            </div>
            {view !== 'list' && (
              <button className="outline-button" onClick={() => setView('list')}>
                <ArrowLeft size={15} /> 목록
              </button>
            )}
          </div>
          {view === 'list' && renderFilters()}
          {renderAdminTools()}
          {currentListError && hasCurrentList && visiblePosts.length > 0 && (
            <BoardContentState type="error" compact onRetry={loadList}>
              게시글을 불러오지 못했습니다.
            </BoardContentState>
          )}
          {view === 'list' && isPhoto ? (
            renderPhotoGrid()
          ) : (
            <>
              {renderPostTable()}
              {renderMobilePosts()}
            </>
          )}
          {visiblePageCount > 1 && (
            <nav className="board-pagination" aria-label="게시글 페이지">
              <button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>
                <ChevronLeft size={16} /> 이전
              </button>
              <span>
                {page} / {visiblePageCount}
              </span>
              <button
                disabled={page >= visiblePageCount}
                onClick={() => setPage(value => value + 1)}
              >
                다음 <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </>
      ) : null}

      {view === 'detail' && (
        <BoardDetail
          board={board}
          detail={detail}
          loading={detailLoading}
          isAdmin={isAdmin}
          userId={auth.user.userId}
          previews={previews}
          comments={sortedComments}
          commentText={commentText}
          setCommentText={setCommentText}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          editingComment={editingComment}
          setEditingComment={setEditingComment}
          commentSort={commentSort}
          setCommentSort={setCommentSort}
          onBack={() => {
            setDetail(null);
            setView('list');
          }}
          onEdit={() => openEditor(detail)}
          onDelete={() => deletePost(detail)}
          onMove={targetBoardId => movePost(detail, targetBoardId)}
          moveTarget={moveTarget}
          onMoveTargetChange={setMoveTarget}
          onDownload={downloadFile}
          onDownloadAll={downloadAllFiles}
          onOpenImage={setLightboxIndex}
          onPreviewText={previewTextFile}
          onCommentSave={saveComment}
          onCommentDelete={removeComment}
          onLike={likeComment}
          onToggleLock={toggleCommentLock}
          onRefresh={async () => {
            const result = await api('boardPost', {
              token: auth.token,
              boardId,
              postId: detail.postId,
            });
            setDetail(result.post);
          }}
          notify={notify}
        />
      )}

      {view === 'editor' && (
        <BoardEditor
          board={board}
          draft={draft}
          setDraft={setDraft}
          isAdmin={isAdmin}
          saving={saving}
          pendingFiles={pendingFiles}
          uploadSessions={uploadSessions}
          progress={progress}
          activeUploadId={activeUploadId}
          failedUploadIds={failedUploadIds}
          removedFileIds={removedFileIds}
          setRemovedFileIds={setRemovedFileIds}
          onAddFiles={addFiles}
          onRemovePending={removePending}
          onCancelUpload={cancelUpload}
          onClose={closeEditor}
          onSaveDraft={() => saveEditor(false)}
          onPublish={() => saveEditor(true)}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          previews={previews}
          onSetCover={fileId => {
            const clientId = String(fileId).startsWith('pending:')
              ? String(fileId).slice('pending:'.length)
              : '';
            setPendingFiles(current =>
              current.map(item => ({ ...item, isCover: item.clientId === clientId })),
            );
            setDraft(current => ({ ...current, coverFileId: fileId }));
          }}
          onReorder={(fromId, toId) =>
            setDraft(current => {
              const order = [...(current.fileOrder || [])];
              const from = order.indexOf(fromId);
              const to = order.indexOf(toId);
              return { ...current, fileOrder: moveItem(order, from, to) };
            })
          }
          inputRef={inputRef}
        />
      )}

      {view === 'stats' && (
        <BoardAdminStats
          stats={stats}
          onBack={() => setView('list')}
          onExport={() => exportBoardPosts(BOARD_DEFINITIONS.map(item => item.id))}
        />
      )}
      {view === 'logs' && <BoardActivityLogs logs={activityLogs} onBack={() => setView('list')} />}

      {lightboxIndex >= 0 && galleryImages[lightboxIndex] && (
        <div
          className="board-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
          onClick={() => setLightboxIndex(-1)}
          onTouchStart={event => {
            touchStartRef.current = event.touches[0].clientX;
          }}
          onTouchEnd={event => {
            const delta = event.changedTouches[0].clientX - (touchStartRef.current || 0);
            if (Math.abs(delta) > 45)
              setLightboxIndex(
                index =>
                  (index + (delta < 0 ? 1 : -1) + galleryImages.length) % galleryImages.length,
              );
          }}
        >
          <button
            className="board-lightbox-close"
            onClick={() => setLightboxIndex(-1)}
            aria-label="닫기"
          >
            <X />
          </button>
          <button
            className="board-lightbox-prev"
            onClick={event => {
              event.stopPropagation();
              setLightboxIndex(index => (index - 1 + galleryImages.length) % galleryImages.length);
            }}
            aria-label="이전 사진"
          >
            <ChevronLeft />
          </button>
          <img
            src={previews[galleryImages[lightboxIndex].fileId] || ''}
            alt={galleryImages[lightboxIndex].originalFilename}
            onClick={event => event.stopPropagation()}
          />
          <button
            className="board-lightbox-next"
            onClick={event => {
              event.stopPropagation();
              setLightboxIndex(index => (index + 1) % galleryImages.length);
            }}
            aria-label="다음 사진"
          >
            <ChevronRight />
          </button>
          <span>
            {lightboxIndex + 1} / {galleryImages.length}
          </span>
        </div>
      )}
      {documentPreview && (
        <div
          className="board-file-preview"
          role="dialog"
          aria-modal="true"
          aria-label="첨부파일 미리보기"
        >
          <header>
            <b>{documentPreview.filename}</b>
            <button
              className="icon-button"
              onClick={() => setDocumentPreview(null)}
              aria-label="미리보기 닫기"
            >
              <X size={18} />
            </button>
          </header>
          <iframe src={documentPreview.url} title={documentPreview.filename} sandbox="" />
        </div>
      )}
    </section>
  );
}

function BoardContentState({ type, children, onRetry, compact = false }) {
  return (
    <div
      className={`board-content-state ${type === 'error' ? 'is-error' : ''} ${compact ? 'is-compact' : ''}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {type === 'loading' && <LoaderCircle className="board-spin" size={20} />}
      <span>{children}</span>
      {type === 'error' && (
        <button type="button" className="outline-button" onClick={onRetry}>
          <RefreshCw size={14} /> 다시 시도
        </button>
      )}
    </div>
  );
}

function BoardDetail({
  board,
  detail,
  loading,
  isAdmin,
  userId,
  previews,
  comments,
  commentText,
  setCommentText,
  replyTo,
  setReplyTo,
  editingComment,
  setEditingComment,
  commentSort,
  setCommentSort,
  onBack,
  onEdit,
  onDelete,
  onMove,
  moveTarget,
  onMoveTargetChange,
  onDownload,
  onDownloadAll,
  onOpenImage,
  onPreviewText,
  onCommentSave,
  onCommentDelete,
  onLike,
  onToggleLock,
  onRefresh,
  notify,
}) {
  const canManage = detail?.canManage || isAdmin;
  const images = (detail?.files || [])
    .filter(isBoardImageFile)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const tree = buildCommentTree(comments);
  const renderBranch = (comment, depth = 0) => (
    <div
      className={`board-comment ${depth ? 'is-reply' : ''} ${comment.status === 'deleted' ? 'is-deleted' : ''}`}
      key={comment.commentId}
      style={{ '--comment-depth': Math.min(depth, 4) }}
    >
      <div className="board-comment-head">
        <b>{comment.authorName}</b>
        <time>{formatKoreanDateTime(comment.createdAt)}</time>
        {comment.updatedAt !== comment.createdAt && <small>수정됨</small>}
      </div>
      <p>{comment.content}</p>
      <div className="board-comment-actions">
        {comment.status === 'active' && (
          <button className={comment.likedByMe ? 'liked' : ''} onClick={() => onLike(comment)}>
            <Heart size={14} fill={comment.likedByMe ? 'currentColor' : 'none'} />{' '}
            {comment.likeCount}
          </button>
        )}
        {comment.status === 'active' && !detail.commentsLocked && (
          <button
            onClick={() => {
              setReplyTo(comment);
              setEditingComment(null);
              setCommentText('');
            }}
          >
            답글
          </button>
        )}
        {comment.status === 'active' && (isAdmin || comment.authorId === userId) && (
          <button
            onClick={() => {
              setEditingComment({ ...comment });
              setReplyTo(null);
              setCommentText(comment.content);
            }}
          >
            수정
          </button>
        )}
        {comment.status === 'active' && (isAdmin || comment.authorId === userId) && (
          <button onClick={() => onCommentDelete(comment)}>삭제</button>
        )}
      </div>
      {replyTo?.commentId === comment.commentId && (
        <form className="board-reply-form" onSubmit={onCommentSave}>
          <textarea
            value={commentText}
            onChange={event => setCommentText(event.target.value)}
            placeholder={`${comment.authorName}님에게 답글`}
            maxLength={5000}
          />
          <div>
            <button
              type="button"
              className="outline-button"
              onClick={() => {
                setReplyTo(null);
                setCommentText('');
              }}
            >
              취소
            </button>
            <button className="primary-button">답글 등록</button>
          </div>
        </form>
      )}
      {editingComment?.commentId === comment.commentId && (
        <form className="board-reply-form" onSubmit={onCommentSave}>
          <textarea
            value={commentText}
            onChange={event => setCommentText(event.target.value)}
            maxLength={5000}
          />
          <div>
            <button
              type="button"
              className="outline-button"
              onClick={() => {
                setEditingComment(null);
                setCommentText('');
              }}
            >
              취소
            </button>
            <button className="primary-button">수정 저장</button>
          </div>
        </form>
      )}
      {comment.children.map(child => renderBranch(child, depth + 1))}
    </div>
  );
  if (loading || !detail)
    return (
      <div className="board-loading board-detail-loading">
        <LoaderCircle className="board-spin" /> 게시글을 불러오는 중입니다…
      </div>
    );
  return (
    <div className="board-detail-view">
      <div className="board-detail-top">
        <button className="outline-button" onClick={onBack}>
          <ArrowLeft size={15} /> 목록으로
        </button>
        <div>
          {isAdmin && (
            <>
              <select
                className="board-detail-move-select"
                value={moveTarget}
                onChange={event => onMoveTargetChange(event.target.value)}
                aria-label="게시글 이동 게시판"
              >
                {BOARD_DEFINITIONS.map(item => (
                  <option key={item.id} value={item.id} disabled={item.id === board.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                className="outline-button"
                onClick={() => onMove(moveTarget)}
                disabled={moveTarget === board.id}
              >
                이동
              </button>
            </>
          )}
          {canManage && (
            <button className="outline-button" onClick={onEdit}>
              <Pencil size={15} /> 수정
            </button>
          )}
          {canManage && (
            <button className="danger-button" onClick={onDelete}>
              <Trash2 size={15} /> 삭제
            </button>
          )}
          {isAdmin && (
            <button className="outline-button" onClick={onToggleLock}>
              <LockKeyhole size={15} /> 댓글 {detail.commentsLocked ? '잠금 해제' : '잠금'}
            </button>
          )}
        </div>
      </div>
      <article className="board-post-detail">
        <div className="board-post-title">
          <h2>{detail.title}</h2>
          <span className="board-markers">
            {detail.isNotice && <b className="board-marker notice">공지</b>}
            {detail.isPinned && (
              <b className="board-marker pinned">
                <Pin size={11} /> 상단 고정
              </b>
            )}
            {detail.isImportant && <b className="board-marker important">중요</b>}
          </span>
        </div>
        <div className="board-post-meta">
          <span>{detail.authorName}</span>
          <span>작성 {formatKoreanDateTime(detail.createdAt) || '-'}</span>
          <span>수정 {formatKoreanDateTime(detail.updatedAt) || '-'}</span>
          <span>조회 {detail.viewCount}</span>
        </div>
        {board.type === 'photo' && (
          <p className="board-photo-description">{detail.content || '사진 설명이 없습니다.'}</p>
        )}
        {board.type !== 'photo' && (
          <div className="board-post-content">{detail.content || '내용이 없습니다.'}</div>
        )}
        {!!images.length && (
          <div className="board-detail-gallery">
            {images.map((file, index) => (
              <figure key={file.fileId}>
                <button className="board-detail-image" onClick={() => onOpenImage(index)}>
                  <img
                    src={previews[file.fileId] || ''}
                    alt={file.originalFilename}
                    loading="lazy"
                    onError={event => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                  <span>
                    <Image size={26} />
                  </span>
                </button>
                <figcaption>
                  {file.originalFilename}
                  <button onClick={() => onDownload(file)}>
                    <Download size={14} /> 다운로드
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {!!detail.files?.length && (
          <section className="board-attachments">
            <div>
              <h3>
                첨부파일 <small>{detail.files.length}</small>
              </h3>
              {detail.files.length > 1 && (
                <button className="outline-button" onClick={onDownloadAll}>
                  <FileArchive size={15} /> 전체 ZIP 다운로드
                </button>
              )}
            </div>
            {detail.files.map(file => (
              <div className="board-attachment" key={file.fileId}>
                <FileIcon type={file.fileType} />
                <span>
                  <b>{file.originalFilename}</b>
                  <small>
                    {file.mimeType} · {formatBoardBytes(file.fileSize)}
                  </small>
                </span>
                {canPreview(file) && (
                  <button
                    className="outline-button"
                    onClick={() =>
                      isBoardImageFile(file)
                        ? onOpenImage(images.findIndex(item => item.fileId === file.fileId))
                        : onPreviewText(file)
                    }
                  >
                    미리보기
                  </button>
                )}
                <button className="outline-button" onClick={() => onDownload(file)}>
                  <Download size={14} /> 다운로드
                </button>
              </div>
            ))}
          </section>
        )}
      </article>
      <section className="board-comments">
        <header>
          <div>
            <h3>댓글</h3>
            <span>{detail.commentCount}개</span>
          </div>
          <select
            value={commentSort}
            onChange={event => setCommentSort(event.target.value)}
            aria-label="댓글 정렬"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
        </header>
        {detail.commentsLocked && (
          <div className="board-comment-locked">
            <LockKeyhole size={16} /> 관리자가 댓글을 잠갔습니다.
          </div>
        )}
        {!detail.commentsLocked && !editingComment && !replyTo && (
          <form className="board-comment-form" onSubmit={onCommentSave}>
            <textarea
              value={commentText}
              onChange={event => setCommentText(event.target.value)}
              placeholder="댓글을 입력해 주세요"
              maxLength={5000}
            />
            <button className="primary-button" disabled={!commentText.trim()}>
              댓글 등록
            </button>
          </form>
        )}
        <div className="board-comment-list">
          {tree.map(comment => renderBranch(comment))}
          {!tree.length && <p className="board-empty">첫 댓글을 남겨 보세요.</p>}
        </div>
      </section>
      <button className="board-detail-refresh" onClick={onRefresh}>
        <RefreshCw size={14} /> 새로고침
      </button>
    </div>
  );
}

function BoardEditor({
  board,
  draft,
  setDraft,
  isAdmin,
  saving,
  pendingFiles,
  uploadSessions,
  progress,
  activeUploadId,
  failedUploadIds,
  removedFileIds,
  setRemovedFileIds,
  onAddFiles,
  onRemovePending,
  onCancelUpload,
  onClose,
  onSaveDraft,
  onPublish,
  previewMode,
  setPreviewMode,
  previews,
  onSetCover,
  onReorder,
  inputRef,
}) {
  if (!draft) return null;
  const photo = board.type === 'photo';
  const currentFiles = draft.existingFiles.filter(file => !removedFileIds.includes(file.fileId));
  const fileById = new Map(
    currentFiles.map(file => [file.fileId, { ...file, pending: false, key: file.fileId }]),
  );
  const pendingById = new Map(
    pendingFiles.map(item => [item.clientId, { ...item, pending: true, key: item.clientId }]),
  );
  const photoItems = (draft.fileOrder || [])
    .map(id => fileById.get(id) || pendingById.get(id))
    .filter(Boolean);
  [...fileById.values(), ...pendingById.values()].forEach(item => {
    if (!photoItems.some(current => current.key === item.key)) photoItems.push(item);
  });
  const orphanSessions = uploadSessions.filter(
    session => !pendingFiles.some(item => item.clientId === session.clientId),
  );
  const totalPending = pendingFiles.reduce((sum, item) => sum + item.file.size, 0);
  const fileAccept = Object.keys(BOARD_FILE_TYPES)
    .filter(extension => !photo || BOARD_FILE_TYPES[extension].type === 'image')
    .map(extension => `.${extension}`)
    .join(',');
  const content = draft.content || '';
  return (
    <div className="board-editor-view">
      <header className="board-editor-head">
        <div className="board-editor-heading">
          <div>
            <h2>{draft.status === 'active' ? '게시글 수정' : '새 게시글 작성'}</h2>
            <p>
              {board.label} · {photo ? '사진 설명은 최대 200자' : '텍스트 게시글과 첨부파일'}
            </p>
          </div>
        </div>
        <div className="board-editor-actions">
          <button className="outline-button" onClick={onClose}>
            취소
          </button>
          <button
            className={`outline-button ${previewMode ? 'active' : ''}`}
            onClick={() => setPreviewMode(value => !value)}
          >
            미리보기
          </button>
          <button className="outline-button" onClick={onSaveDraft} disabled={saving}>
            임시저장
          </button>
          <button className="primary-button" onClick={onPublish} disabled={saving}>
            {saving ? (
              <>
                <LoaderCircle className="board-spin" size={15} /> 저장 중
              </>
            ) : draft.status === 'active' ? (
              '수정 저장'
            ) : (
              '게시글 등록'
            )}
          </button>
        </div>
      </header>
      <div className="board-editor-form">
        <label className="board-editor-field">
          제목
          <input
            value={draft.title}
            maxLength={200}
            onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
            placeholder="제목을 입력해 주세요"
          />
        </label>
        {!previewMode ? (
          <label className="board-editor-field">
            {photo ? '짧은 설명' : '본문'}
            <textarea
              rows={photo ? 4 : 16}
              maxLength={photo ? 200 : 50000}
              value={content}
              onChange={event => setDraft(current => ({ ...current, content: event.target.value }))}
              placeholder={
                photo ? '사진을 설명하는 문장을 입력해 주세요.' : '본문을 입력해 주세요.'
              }
            />
            <small>
              {content.length} / {photo ? 200 : 50000}
            </small>
          </label>
        ) : (
          <div className="board-editor-preview">
            <h3>{draft.title || '제목 미리보기'}</h3>
            <p>{content || '내용이 없습니다.'}</p>
          </div>
        )}
        {isAdmin && (
          <fieldset className="board-post-options">
            <legend>관리자 표시 설정</legend>
            <label>
              <input
                type="checkbox"
                checked={!!draft.isNotice}
                onChange={event =>
                  setDraft(current => ({ ...current, isNotice: event.target.checked }))
                }
              />{' '}
              공지
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!draft.isPinned}
                onChange={event =>
                  setDraft(current => ({ ...current, isPinned: event.target.checked }))
                }
              />{' '}
              상단 고정
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!draft.isImportant}
                onChange={event =>
                  setDraft(current => ({ ...current, isImportant: event.target.checked }))
                }
              />{' '}
              중요 표시
            </label>
          </fieldset>
        )}
        {photo && (
          <div className="board-photo-upload-list">
            <h3>사진 순서와 대표 사진</h3>
            {photoItems.map((item, index) => {
              const fileId = item.pending ? '' : item.fileId;
              const name = item.pending ? item.file.name : item.originalFilename;
              const coverId = item.pending ? `pending:${item.clientId}` : fileId;
              const session = item.pending
                ? uploadSessions.find(value => value.clientId === item.clientId)
                : null;
              const percent = session
                ? Math.min(
                    100,
                    Math.round(((progress[session.uploadId] || 0) / item.file.size) * 100),
                  )
                : 0;
              return (
                <div key={item.key} className="board-upload-item">
                  <img src={item.pending ? item.previewUrl : previews[fileId] || ''} alt="" />
                  <b>{name}</b>
                  <button
                    type="button"
                    className={draft.coverFileId === coverId ? 'cover-selected' : ''}
                    onClick={() => onSetCover(coverId)}
                  >
                    {draft.coverFileId === coverId ? '대표 사진' : '대표로 지정'}
                  </button>
                  {item.pending ? (
                    <button type="button" onClick={() => onRemovePending(item.clientId)}>
                      삭제
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRemovedFileIds(ids => [...ids, fileId])}
                    >
                      삭제
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="앞으로 이동"
                    disabled={index === 0}
                    onClick={() => onReorder(item.key, photoItems[index - 1].key)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="뒤로 이동"
                    disabled={index === photoItems.length - 1}
                    onClick={() => onReorder(item.key, photoItems[index + 1].key)}
                  >
                    <ArrowDown size={14} />
                  </button>
                  {item.pending ? (
                    <>
                      <small>
                        {session
                          ? activeUploadId === session.uploadId
                            ? `업로드 중 · ${percent}%`
                            : failedUploadIds.includes(session.uploadId)
                              ? '업로드 실패 · 재시도 가능'
                              : '업로드 대기 · 재시도 가능'
                          : '업로드 대기'}
                      </small>
                      {session && activeUploadId === session.uploadId && (
                        <progress max="100" value={percent} />
                      )}
                      {session && activeUploadId === session.uploadId ? (
                        <button type="button" onClick={() => onCancelUpload(session)}>
                          업로드 취소
                        </button>
                      ) : session ? (
                        <>
                          <button type="button" onClick={onPublish} disabled={saving}>
                            다시 시도
                          </button>
                          <button type="button" onClick={() => onCancelUpload(session)}>
                            세션 취소
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => onRemovePending(item.clientId)}>
                          제거
                        </button>
                      )}
                    </>
                  ) : (
                    <small>{index + 1}번째 · 업로드 완료</small>
                  )}
                </div>
              );
            })}
            {orphanSessions.map(session => (
              <div className="board-resume-prompt" key={session.uploadId}>
                중단된 업로드: {session.originalFilename} ({formatBoardBytes(session.fileSize)}) —
                같은 파일을 다시 선택하면 이어서 업로드합니다.
                <button type="button" onClick={() => onCancelUpload(session)}>
                  업로드 취소
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          className="board-dropzone"
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            onAddFiles([...event.dataTransfer.files]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
          }}
        >
          <FileImage size={22} />
          <b>{photo ? '사진을 끌어 놓거나 선택하세요' : '첨부파일을 끌어 놓거나 선택하세요'}</b>
          <span>
            {photo ? '이미지 파일만 · ' : '이미지·문서·압축파일 · '}한 번 업로드 합계 100MB · 동영상
            미지원
          </span>
          <small>현재 선택 {formatBoardBytes(totalPending)} / 100MB</small>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={fileAccept}
            onChange={event => {
              onAddFiles([...event.target.files]);
              event.target.value = '';
            }}
          />
        </div>
        {!photo && (
          <div className="board-file-list">
            {currentFiles.map(file => (
              <div className="board-upload-item" key={file.fileId}>
                <FileIcon type={file.fileType} />
                <b>{file.originalFilename}</b>
                <small>{formatBoardBytes(file.fileSize)}</small>
                <button
                  type="button"
                  onClick={() => setRemovedFileIds(ids => [...ids, file.fileId])}
                >
                  삭제
                </button>
              </div>
            ))}
            {pendingFiles.map(item => {
              const session = uploadSessions.find(value => value.clientId === item.clientId);
              const percent = session
                ? Math.min(
                    100,
                    Math.round(((progress[session.uploadId] || 0) / item.file.size) * 100),
                  )
                : 0;
              return (
                <div className="board-upload-item" key={item.clientId}>
                  <FileIcon type={boardFileType(item.file.name)} />
                  <b>{item.file.name}</b>
                  <small>
                    {formatBoardBytes(item.file.size)}
                    {session ? ` · ${percent}%` : ''}
                  </small>
                  {session ? <progress max="100" value={percent} /> : null}
                  {session ? (
                    <button type="button" onClick={() => onCancelUpload(session)}>
                      취소
                    </button>
                  ) : (
                    <button type="button" onClick={() => onRemovePending(item.clientId)}>
                      제거
                    </button>
                  )}
                </div>
              );
            })}
            {orphanSessions.map(session => (
              <div className="board-resume-prompt" key={session.uploadId}>
                중단된 업로드: {session.originalFilename} ({formatBoardBytes(session.fileSize)}) —
                같은 파일을 다시 선택하면 이어서 업로드합니다.
                <button type="button" onClick={() => onCancelUpload(session)}>
                  업로드 취소
                </button>
              </div>
            ))}
          </div>
        )}
        {draft.status === 'active' && (
          <p className="board-editor-warning">
            저장 전 삭제 표시한 첨부파일은 게시글 저장이 완료된 뒤 Drive에서도 삭제됩니다.
          </p>
        )}
      </div>
      <footer className="board-editor-footer">
        <button className="outline-button" onClick={onSaveDraft} disabled={saving}>
          임시저장
        </button>
        <button className="primary-button" onClick={onPublish} disabled={saving}>
          {saving ? '처리 중…' : draft.status === 'active' ? '수정 저장' : '등록'}
        </button>
      </footer>
    </div>
  );
}

function BoardAdminStats({ stats, onBack, onExport }) {
  if (!stats)
    return (
      <div className="board-loading">
        <LoaderCircle className="board-spin" /> 통계를 불러오는 중입니다.
      </div>
    );
  return (
    <div className="board-admin-page">
      <header>
        <button className="outline-button" onClick={onBack}>
          <ArrowLeft size={15} /> 게시판
        </button>
        <button className="outline-button" onClick={onExport}>
          <Download size={14} /> Excel 호환 CSV
        </button>
      </header>
      <h2>게시판 통계</h2>
      <div className="board-stat-cards">
        <article>
          <span>게시글</span>
          <b>{stats.totalPosts}</b>
        </article>
        <article>
          <span>조회</span>
          <b>{stats.totalViews}</b>
        </article>
        <article>
          <span>댓글</span>
          <b>{stats.totalComments}</b>
        </article>
        <article>
          <span>첨부파일 사용량</span>
          <b>{formatBoardBytes(stats.totalFileBytes)}</b>
        </article>
      </div>
      <h3>게시판별 게시글</h3>
      {stats.byBoard.map(item => (
        <p key={item.boardId}>
          {boardLabel(item.boardId)} <b>{item.postCount}</b>
        </p>
      ))}
      <h3>작성자별 게시글</h3>
      {stats.byAuthor.map(item => (
        <p key={item.name}>
          {item.name} <b>{item.count}</b>
        </p>
      ))}
    </div>
  );
}

function BoardActivityLogs({ logs, onBack }) {
  return (
    <div className="board-admin-page">
      <header>
        <button className="outline-button" onClick={onBack}>
          <ArrowLeft size={15} /> 게시판
        </button>
      </header>
      <h2>게시판 활동 로그</h2>
      <div className="board-table-wrap">
        <table className="board-table">
          <thead>
            <tr>
              <th>일시</th>
              <th>사용자</th>
              <th>작업</th>
              <th>게시판</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{formatKoreanDateTime(log.createdAt)}</td>
                <td>{log.userName}</td>
                <td>{log.action}</td>
                <td>{boardLabel(log.boardId)}</td>
                <td>{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FileIcon({ type }) {
  const Icon =
    type === 'image'
      ? FileImage
      : type === 'archive'
        ? FileArchive
        : type === 'document'
          ? FileText
          : File;
  return <Icon size={17} aria-hidden="true" />;
}

function buildCommentTree(comments) {
  const byParent = new Map();
  comments.forEach(comment => {
    const key = comment.parentId || '';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push({ ...comment, children: [] });
  });
  const make = comment => ({
    ...comment,
    children: (byParent.get(comment.commentId) || []).map(make),
  });
  return (byParent.get('') || []).map(make);
}

function renderHighlight(value, query) {
  const parts = highlightText(value, query);
  if (typeof parts === 'string') return parts;
  return parts.map(part =>
    typeof part === 'string' ? part : <mark key={part.key}>{part.match}</mark>,
  );
}

function canPreview(file) {
  return file.fileType === 'image' || file.mimeType === 'text/plain';
}
function moveItem(items, from, to) {
  const copy = [...items];
  if (to < 0 || to >= copy.length) return items;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function sendBoardChunk({ uploadId, token, start, chunk, onProgress }, xhrRef) {
  return new Promise((resolve, reject) => {
    if (!API_URL) return reject(new Error('API 주소가 설정되지 않았습니다.'));
    const xhr = new XMLHttpRequest();
    const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    xhrRef.current = { xhr, uploadId };
    xhr.open('POST', `${API_URL}/boards/chunk`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-Upload-Id', uploadId);
    xhr.setRequestHeader('X-Session-Token', token);
    xhr.setRequestHeader('X-Chunk-Start', String(start));
    xhr.setRequestHeader('X-Request-ID', requestId);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch (_) {
        reject(new Error(`서버 응답을 읽지 못했습니다. (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () =>
      reject(new Error('네트워크 오류로 업로드가 중단되었습니다. 다시 시도해 주세요.'));
    xhr.onabort = () => reject(new Error('파일 업로드가 취소되었습니다.'));
    xhr.send(chunk);
  });
}

function exportPosts(posts) {
  const headers = ['게시판', '제목', '작성자', '작성일', '조회수', '댓글 수'];
  const rows = posts.map(post => [
    boardLabel(post.boardId),
    post.title,
    post.authorName,
    post.createdAt,
    post.viewCount,
    post.commentCount,
  ]);
  const csv = `\uFEFF${[headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = '게시판_목록.csv';
  link.click();
  URL.revokeObjectURL(url);
}
