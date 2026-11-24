import React, { useEffect, useRef, useState } from 'react';
import { Archive, Download, File, FilePlus2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { formatKoreanDateTime } from '../../shared/dateFormat.js';
import { logUiTiming } from '../../services/api.js';

const PAGE_SIZE = 10;
const CHUNK_SIZE = 8 * 1024 * 1024;
const API_URL = import.meta.env.VITE_API_BASE_URL || '';
const EXTENSIONS = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  bmp: 'image',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  avi: 'video',
  pdf: 'document',
  txt: 'document',
  csv: 'document',
  xlsx: 'document',
  xls: 'document',
  doc: 'document',
  docx: 'document',
  hwp: 'document',
  hwpx: 'document',
  ppt: 'document',
  pptx: 'document',
  zip: 'archive',
};
const TYPE_LABELS = { image: '이미지', video: '동영상', document: '문서', archive: '압축파일' };

export default function ArchivePage({ auth, api, isAdmin, setMessage }) {
  const [posts, setPosts] = useState([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(''),
    [sort, setSort] = useState('newest'),
    [typeFilter, setTypeFilter] = useState('all'),
    [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null),
    [draft, setDraft] = useState(null),
    [pendingFiles, setPendingFiles] = useState([]),
    [uploadSessions, setUploadSessions] = useState([]);
  const [saving, setSaving] = useState(false),
    [progress, setProgress] = useState({});
  const xhrRef = useRef(null);
  const listRequestRef = useRef(0);

  const reload = async (taskId = '') => {
    // 게시글과 첨부파일 메타데이터 목록을 한 번 요청합니다. 검색·유형 필터·페이지 분할은 받은 목록에서 처리합니다.
    setLoading(true);
    const requestId = ++listRequestRef.current;
    const startedAt = performance.now();
    let outcome = 'ok';
    try {
      const result = await api('archivePosts', {
        token: auth.token, taskId, query, sort, typeFilter, page, pageSize: PAGE_SIZE,
      });
      if (requestId !== listRequestRef.current) return;
      setPosts(result.posts || []);
      setTotal(Number(result.total) || 0);
    } catch (error) {
      outcome = 'error';
      if (requestId === listRequestRef.current) setMessage(error.message);
    } finally {
      if (requestId === listRequestRef.current) setLoading(false);
      logUiTiming('archive', 'list_load_flow', startedAt, outcome);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => reload(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [auth.token, query, sort, typeFilter, page]);
  useEffect(() => {
    if (!saving) return undefined;
    const warn = event => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saving]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible = posts;

  const openPost = async post => {
    setSelected(post);
    try {
      const result = await api('archivePostView', { token: auth.token, postId: post.postId });
      setPosts(current =>
        current.map(item =>
          item.postId === post.postId ? { ...item, viewCount: result.viewCount } : item,
        ),
      );
      setSelected(current =>
        current?.postId === post.postId ? { ...current, viewCount: result.viewCount } : current,
      );
    } catch (error) {
      setMessage(error.message);
    }
  };
  const startCreate = () => {
    setSelected(null);
    setPendingFiles([]);
    setUploadSessions([]);
    setProgress({});
    setDraft({ title: '', content: '', existingFiles: [] });
  };
  const startEdit = post => {
    setDraft({
      postId: post.postId,
      title: post.title,
      content: post.content,
      existingFiles: [...(post.files || [])],
    });
    setPendingFiles([]);
    setUploadSessions([]);
    setProgress({});
    setSelected(null);
  };

  const addFiles = fileList => {
    const previous = pendingFiles;
    const added = [...fileList];
    const next = [...previous, ...added];
    if (next.length > 30) return setMessage('한 번에 첨부할 수 있는 파일은 최대 30개입니다.');
    const totals = { video: 0, other: 0 };
    for (const file of next) {
      const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
      const group = EXTENSIONS[extension];
      if (!group) return setMessage(`${file.name}: 허용되지 않는 파일 형식입니다.`);
      const declaredMime = file.type || 'application/octet-stream';
      if (declaredMime !== 'application/octet-stream' && !mimeMatches(extension, declaredMime))
        return setMessage(`${file.name}: 파일 형식과 MIME 정보가 일치하지 않습니다.`);
      totals[group === 'video' ? 'video' : 'other'] += file.size;
    }
    if (totals.video > 500000000)
      return setMessage('동영상 파일은 한 번에 최대 500MB까지 업로드할 수 있습니다.');
    if (totals.other > 200000000)
      return setMessage('이미지·문서·압축파일은 합계 200MB까지 업로드할 수 있습니다.');
    setPendingFiles(next);
  };

  const uploadOne = async (session, file, taskId) => {
    // 파일 본문을 Base64로 바꾸지 않고 8MiB Blob 조각으로 나누어 Worker에 순차 전송합니다.
    let offset = 0;
    while (offset < file.size) {
      const end = Math.min(offset + CHUNK_SIZE, file.size);
      const chunk = file.slice(offset, end);
      const response = await sendChunk(
        {
          uploadId: session.uploadId,
          token: auth.token,
          taskId,
          start: offset,
          chunk,
          onProgress: value =>
            setProgress(state => ({
              ...state,
              [session.uploadId]: offset + Math.min(value, chunk.size),
            })),
        },
        xhrRef,
      );
      if (!response.ok) throw new Error(response.error || '파일 업로드에 실패했습니다.');
      if (response.done) {
        setProgress(state => ({ ...state, [session.uploadId]: file.size }));
        return response.file;
      }
      if (response.received === offset)
        throw new Error('업로드 위치가 진행되지 않았습니다. 다시 시도해 주세요.');
      offset = response.received;
      setProgress(state => ({ ...state, [session.uploadId]: offset }));
    }
    return null;
  };

  const save = async event => {
    // 게시글 초안/수정, 업로드 세션 생성, 파일 청크 전송, 메타데이터 확정과 목록 재조회가 순서대로 수행됩니다.
    event.preventDefault();
    if (saving) return;
    const title = String(draft?.title || '').trim();
    if (!title) return setMessage('제목을 입력해 주세요.');
    const taskId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setSaving(true);
    try {
      let postId = draft.postId;
      if (!postId) {
        const created = await api('saveArchivePost', {
          token: auth.token,
          taskId,
          post: { title, content: String(draft.content || ''), publish: pendingFiles.length === 0 },
        });
        postId = created.postId;
        setDraft(current => ({ ...current, postId }));
      } else {
        await api('saveArchivePost', {
          token: auth.token,
          taskId,
          post: { postId, title, content: String(draft.content || '') },
        });
      }

      let sessions = uploadSessions;
      if (pendingFiles.length && !sessions.length) {
        const result = await api('archiveUploadStart', {
          token: auth.token,
          taskId,
          postId,
          files: pendingFiles.map(file => ({
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
          })),
        });
        sessions = result.uploads || [];
        setUploadSessions(sessions);
      }
      for (const session of sessions) {
        const file = pendingFiles.find(
          item => item.name === session.originalFilename && item.size === session.fileSize,
        );
        if (!file) throw new Error('업로드할 원본 파일이 없습니다. 파일을 다시 선택해 주세요.');
        await uploadOne(session, file, taskId);
        setUploadSessions(current => current.filter(item => item.uploadId !== session.uploadId));
        setPendingFiles(current => current.filter(item => item !== file));
      }
      if (postId && (draft.postId || pendingFiles.length))
        await api('publishArchivePost', { token: auth.token, postId, taskId });
      for (const file of draft.existingFiles || []) {
        if (file._remove)
          await api('deleteArchiveFile', { token: auth.token, fileId: file.fileId });
      }
      setDraft(null);
      setPendingFiles([]);
      setUploadSessions([]);
      setProgress({});
      await reload(taskId);
      setMessage('자료를 등록했습니다.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      xhrRef.current = null;
      setSaving(false);
    }
  };

  const cancelUpload = async uploadId => {
    xhrRef.current?.abort();
    try {
      await fetch(`${API_URL}/archive/cancel`, {
        method: 'POST',
        headers: { 'X-Upload-Id': uploadId, 'X-Session-Token': auth.token },
      });
    } catch (_) {}
    setUploadSessions(current => current.filter(item => item.uploadId !== uploadId));
    setMessage('파일 업로드를 취소했습니다.');
  };

  const download = async file => {
    try {
      const result = await api('archiveDownload', { token: auth.token, fileId: file.fileId });
      window.location.assign(result.downloadUrl);
    } catch (error) {
      setMessage(error.message);
    }
  };
  const removePost = async post => {
    if (!window.confirm(`“${post.title}” 게시글과 첨부파일을 삭제할까요?`)) return;
    try {
      await api('deleteArchivePost', { token: auth.token, postId: post.postId });
      setSelected(null);
      await reload();
      setMessage('자료 게시글과 첨부파일을 삭제했습니다.');
    } catch (error) {
      setMessage(error.message);
    }
  };
  const removeFile = async file => {
    if (!window.confirm(`“${file.originalFilename}” 파일을 삭제할까요?`)) return;
    try {
      await api('deleteArchiveFile', { token: auth.token, fileId: file.fileId });
      setSelected(current => ({
        ...current,
        files: current.files.filter(item => item.fileId !== file.fileId),
      }));
      await reload();
      setMessage('첨부파일을 삭제했습니다.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <>
      <section className="panel archive-panel">
        <div className="panel-title archive-heading">
          <div>
            <h2>
              <Archive size={19} /> 자료실
            </h2>
            <span>공지와 공유 자료를 확인합니다.</span>
          </div>
          {isAdmin && (
            <button className="primary-button" onClick={startCreate}>
              <Plus size={16} /> 자료 등록
            </button>
          )}
        </div>
        <div className="archive-toolbar">
          <label className="archive-search">
            <Search size={17} />
            <input
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="제목, 내용, 파일명, 작성자 검색"
            />
          </label>
          <select
            value={typeFilter}
            onChange={event => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
            aria-label="파일 유형"
          >
            <option value="all">전체 유형</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
          <select value={sort} onChange={event => setSort(event.target.value)} aria-label="정렬">
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="title">제목순</option>
          </select>
        </div>
        {loading ? (
          <div className="empty-detail">자료를 불러오는 중입니다.</div>
        ) : (
          <div className="table-wrap archive-table-wrap">
            <table className="archive-table">
              <thead>
                <tr>
                  <th>번호</th>
                  <th>자료 제목</th>
                  <th>첨부파일</th>
                  <th>작성자</th>
                  <th>작성일</th>
                  <th>조회</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((post, index) => (
                  <tr key={post.postId}>
                    <td>{total - ((page - 1) * PAGE_SIZE + index)}</td>
                    <td>
                      <button className="archive-title-link" onClick={() => openPost(post)}>
                        {post.title}
                      </button>
                    </td>
                    <td>{fileSummary(post.files)}</td>
                    <td>{post.authorName || '-'}</td>
                    <td>{formatKoreanDateTime(post.createdAt) || '-'}</td>
                    <td>{Number(post.viewCount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <div className="empty-detail">
                {query || typeFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 자료가 없습니다.'}
              </div>
            )}
          </div>
        )}
        {pageCount > 1 && (
          <nav className="archive-pagination" aria-label="자료실 페이지">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              이전
            </button>
            <span>
              {page} / {pageCount}
            </span>
            <button disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
              다음
            </button>
          </nav>
        )}
      </section>

      {draft && (
        <div
          className="archive-overlay"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !saving) setDraft(null);
          }}
        >
          <form className="archive-dialog" onSubmit={save} aria-label="자료 게시글 작성">
            <div className="archive-dialog-head">
              <h2>{draft.postId ? '자료 수정' : '자료 등록'}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => !saving && setDraft(null)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            <label className="archive-field">
              제목{' '}
              <input
                maxLength={200}
                required
                value={draft.title}
                onChange={event => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <label className="archive-field">
              내용{' '}
              <textarea
                rows={8}
                value={draft.content}
                onChange={event => setDraft({ ...draft, content: event.target.value })}
              />
            </label>
            {!!draft.existingFiles?.length && (
              <div className="archive-existing-files">
                <b>기존 첨부파일</b>
                {draft.existingFiles.map(file => (
                  <label key={file.fileId}>
                    <input
                      type="checkbox"
                      checked={!!file._remove}
                      onChange={event =>
                        setDraft({
                          ...draft,
                          existingFiles: draft.existingFiles.map(item =>
                            item.fileId === file.fileId
                              ? { ...item, _remove: event.target.checked }
                              : item,
                          ),
                        })
                      }
                    />
                    {file.originalFilename} <small>{formatBytes(file.fileSize)}</small>
                  </label>
                ))}
              </div>
            )}
            <label
              className="archive-dropzone"
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                addFiles([...event.dataTransfer.files]);
              }}
            >
              <FilePlus2 size={21} />
              <span>파일을 끌어 놓거나 선택하세요</span>
              <small>동영상 합계 500MB, 나머지 파일 합계 200MB · 최대 30개</small>
              <input
                type="file"
                multiple
                accept={Object.keys(EXTENSIONS)
                  .map(ext => `.${ext}`)
                  .join(',')}
                onChange={event => {
                  addFiles([...event.target.files]);
                  event.target.value = '';
                }}
              />
            </label>
            {!!pendingFiles.length && (
              <div className="archive-pending-files">
                <b>선택한 파일 ({pendingFiles.length})</b>
                {pendingFiles.map((file, index) => {
                  const session = uploadSessions.find(
                    item => item.originalFilename === file.name && item.fileSize === file.size,
                  );
                  const percent = session
                    ? Math.min(
                        100,
                        Math.round(((progress[session.uploadId] || 0) / file.size) * 100),
                      )
                    : 0;
                  return (
                    <div key={`${file.name}-${index}`} className="archive-pending-file">
                      <File size={16} />
                      <span>
                        {file.name}
                        <small>
                          {formatBytes(file.size)}
                          {session && ` · ${percent}%`}
                        </small>
                        {session && <progress max={100} value={percent} />}
                      </span>
                      {session ? (
                        <button type="button" onClick={() => cancelUpload(session.uploadId)}>
                          취소
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            setPendingFiles(current => current.filter((_, at) => at !== index))
                          }
                        >
                          제거
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="archive-dialog-actions">
              <button
                type="button"
                className="sync"
                onClick={() => setDraft(null)}
                disabled={saving}
              >
                취소
              </button>
              <button className="save" disabled={saving || !draft.title.trim()}>
                {saving
                  ? '저장 및 업로드 중…'
                  : draft.postId && uploadSessions.length
                    ? '업로드 재시도'
                    : '등록'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <div
          className="archive-overlay"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            className="archive-dialog archive-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="자료 상세"
          >
            <div className="archive-dialog-head">
              <h2>{selected.title}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelected(null)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            <div className="archive-meta">
              {selected.authorName || '-'} · {formatKoreanDateTime(selected.createdAt) || '-'} ·
              조회 {selected.viewCount || 0}
            </div>
            <div className="archive-content">{selected.content || '내용이 없습니다.'}</div>
            <h3>첨부파일 ({(selected.files || []).length})</h3>
            {selected.files?.length ? (
              selected.files.map(file => (
                <div className="archive-file" key={file.fileId}>
                  <File size={17} />
                  <span>
                    {file.originalFilename}
                    <small>
                      {TYPE_LABELS[file.fileType] || '파일'} · {formatBytes(file.fileSize)}
                    </small>
                  </span>
                  <button className="outline-button" onClick={() => download(file)}>
                    <Download size={15} /> 다운로드
                  </button>
                  {isAdmin && (
                    <button
                      className="icon-button"
                      onClick={() => removeFile(file)}
                      aria-label="첨부파일 삭제"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="archive-muted">첨부파일이 없습니다.</p>
            )}
            {isAdmin && (
              <div className="archive-dialog-actions">
                <button className="sync" onClick={() => startEdit(selected)}>
                  <Pencil size={15} /> 수정
                </button>
                <button className="danger-button" onClick={() => removePost(selected)}>
                  <Trash2 size={15} /> 삭제
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function sendChunk({ uploadId, token, start, chunk, onProgress, taskId }, xhrRef) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    xhrRef.current = xhr;
    xhr.open('POST', `${API_URL}/archive/chunk`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-Upload-Id', uploadId);
    xhr.setRequestHeader('X-Session-Token', token);
    xhr.setRequestHeader('X-Chunk-Start', String(start));
    xhr.setRequestHeader('X-Request-ID', requestId);
    if (taskId) xhr.setRequestHeader('X-Task-ID', taskId);
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
      reject(new Error('네트워크 오류로 파일 업로드가 중단되었습니다. 재시도해 주세요.'));
    xhr.onabort = () => reject(new Error('파일 업로드가 취소되었습니다.'));
    xhr.send(chunk);
  });
}
function fileSummary(files = []) {
  const counts = {};
  files.forEach(file => {
    counts[file.fileType] = (counts[file.fileType] || 0) + 1;
  });
  return (
    Object.entries(counts)
      .map(([type, count]) => `${TYPE_LABELS[type] || type} ${count}`)
      .join(', ') || '없음'
  );
}
function formatBytes(bytes) {
  const value = Number(bytes || 0);
  return value < 1000
    ? `${value} B`
    : value < 1e6
      ? `${(value / 1000).toFixed(1)} KB`
      : `${(value / 1e6).toFixed(1)} MB`;
}
function mimeMatches(extension, mime) {
  if (['jpg', 'jpeg'].includes(extension)) return mime === 'image/jpeg';
  if (extension === 'bmp') return ['image/bmp', 'image/x-ms-bmp'].includes(mime);
  if (extension === 'avi') return ['video/x-msvideo', 'video/avi'].includes(mime);
  if (extension === 'hwp') return ['application/x-hwp', 'application/haansofthwp'].includes(mime);
  if (extension === 'hwpx')
    return ['application/vnd.hancom.hwpx', 'application/haansofthwpx'].includes(mime);
  if (extension === 'txt') return mime === 'text/plain';
  if (extension === 'csv')
    return ['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(mime);
  const expected = {
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
  }[extension];
  return expected === mime;
}
