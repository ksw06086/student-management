// 브라우저 요청의 CORS·메서드·본문을 검증합니다. 일반 JSON action은 Apps Script로 전달하고,
// 업로드 청크·다운로드 티켓·게시판 목록 미리보기 및 공휴일 요청은 Worker의 전용 흐름에서 처리합니다.
export default {
  async fetch(request, env) {
    const requestId = safeRequestId(request.headers.get('X-Request-ID'));
    const startedAt = performance.now();
    let status = 'error';
    try {
      const response = await handleWorkerRequest(request, env, requestId);
      status = response.status;
      return response;
    } finally {
      logWorkerTiming(env, requestId, 'worker.request', startedAt, { status });
    }
  },
};

async function handleWorkerRequest(request, env, requestId) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = String(env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    const allowed = allowedOrigins.includes(origin);
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path.startsWith('/boards/preview/')) {
      if (origin && !allowed)
        return json({ ok: false, error: 'Origin is not allowed.' }, 403, origin);
      const [, , , ticket, fileId] = path.split('/');
      return previewBoardImage(ticket, fileId, env, origin);
    }
    if (request.method === 'GET' && path.startsWith('/boards/download-zip/')) {
      if (origin && !allowed)
        return json({ ok: false, error: 'Origin is not allowed.' }, 403, origin);
      return downloadBoardZip(path.split('/').pop(), env, origin);
    }
    if (request.method === 'GET' && path.startsWith('/boards/download/')) {
      if (origin && !allowed)
        return json({ ok: false, error: 'Origin is not allowed.' }, 403, origin);
      return downloadBoardTicket(path.split('/').pop(), env, origin);
    }
    if (request.method === 'GET' && path.startsWith('/archive/download/')) {
      if (origin && !allowed)
        return json({ ok: false, error: 'Origin is not allowed.' }, 403, origin);
      return downloadArchiveTicket(path.split('/').pop(), env, origin);
    }
    if (request.method === 'OPTIONS') {
      if (!allowed) return new Response(null, { status: 403, headers: securityHeaders() });
      return new Response(null, {
        status: 204,
        headers: { ...securityHeaders(), ...corsHeaders(origin) },
      });
    }
    if (!allowed) return json({ ok: false, error: 'Origin is not allowed.' }, 403);
    if (request.method !== 'POST')
      return json({ ok: false, error: 'POST requests only.' }, 405, origin);
    if (new URL(request.url).pathname.endsWith('/archive/chunk'))
      return uploadArchiveChunk(request, env, origin);
    if (new URL(request.url).pathname.endsWith('/archive/cancel'))
      return cancelArchiveUpload(request, env, origin);
    if (new URL(request.url).pathname.endsWith('/boards/chunk'))
      return uploadBoardChunk(request, env, origin);
    if (new URL(request.url).pathname.endsWith('/boards/cancel'))
      return cancelBoardUpload(request, env, origin);
    if (!request.headers.get('Content-Type')?.toLowerCase().includes('application/json'))
      return json({ ok: false, error: 'JSON requests only.' }, 415, origin);
    const body = await request.text();
    if (body.length > 1024 * 1024)
      return json({ ok: false, error: 'Request is too large.' }, 413, origin);
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (_) {
      return json({ ok: false, error: 'Invalid JSON request.' }, 400, origin);
    }
    payload.requestId = requestId;
    if (payload.action === 'holidays') return getHolidays(payload, env, origin);
    if (payload.action === 'archiveUploadStart') return startArchiveUploads(payload, env, origin);
    if (payload.action === 'archiveDownload')
      return downloadArchiveFile(payload, env, origin, request.url);
    if (payload.action === 'boardUploadStart') return startBoardUploads(payload, env, origin);
    if (payload.action === 'boardDownload')
      return downloadBoardFile(payload, env, origin, request.url);
    if (payload.action === 'boardZipDownload')
      return createBoardZipTicket(payload, env, origin, request.url);
    if (payload.action === 'boardImagePreviews')
      return createBoardImagePreviewTicket(payload, env, origin, request.url);
    if (payload.action === 'boardPosts') return listBoardPosts(payload, env, origin, request.url);
    if (payload.action === 'deleteBoardFile') return deleteBoardFile(payload, env, origin);
    if (payload.action === 'purgeBoardPost') return purgeBoardPost(payload, env, origin);
    if (payload.action === 'deleteArchivePost') return deleteArchivePost(payload, env, origin);
    if (payload.action === 'deleteArchiveFile') return deleteArchiveFile(payload, env, origin);

    const target = env.APPS_SCRIPT_URL;
    if (!target || target.includes('REPLACE_WITH'))
      return json(
        { ok: false, error: 'Cloudflare Worker APPS_SCRIPT_URL is not configured.' },
        503,
        origin,
      );
    const appsScriptStartedAt = performance.now();
    let appsScriptStatus = 'network_error';
    try {
      const upstream = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });
      appsScriptStatus = upstream.status;
      const responseBody = await upstream.text();
      logWorkerTiming(env, requestId, 'apps_script.request', appsScriptStartedAt, {
        action: String(payload.action || '').slice(0, 60),
        status: appsScriptStatus,
      });
      return new Response(responseBody, {
        status: upstream.status,
        headers: {
          ...securityHeaders(),
          ...corsHeaders(origin),
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    } catch (error) {
      logWorkerTiming(env, requestId, 'apps_script.request', appsScriptStartedAt, {
        action: String(payload.action || '').slice(0, 60),
        status: appsScriptStatus,
      });
      console.error('Apps Script request failed', error?.message || error);
      return json({ ok: false, error: 'Google Apps Script에 연결할 수 없습니다.' }, 502, origin);
    }
}

function logWorkerTiming(env, requestId, operation, startedAt, details = {}) {
  if (env.PERFORMANCE_LOGS !== 'true' && env.ENVIRONMENT !== 'development') return;
  console.log(
    JSON.stringify({
      type: 'performance',
      requestId,
      operation,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      ...details,
    }),
  );
}

function safeRequestId(value) {
  const candidate = String(value || '');
  return /^[A-Za-z0-9._:-]{1,80}$/.test(candidate) ? candidate : crypto.randomUUID();
}

async function saveUploadState(env, key, state, requestId) {
  const startedAt = performance.now();
  await env.ARCHIVE_UPLOADS.put(key, JSON.stringify(state), { expirationTtl: 604800 });
  logWorkerTiming(env, requestId, 'kv.upload_state_write', startedAt);
}

// 공공데이터포털 특일 API에서 지정한 연월의 법정 공휴일만 조회해 앱 응답 형식으로 반환합니다.
async function getHolidays(payload, env, origin) {
  const year = String(payload.year || '');
  const rawMonth = String(payload.month || '');
  if (
    !/^\d{4}$/.test(year) ||
    !/^\d{1,2}$/.test(rawMonth) ||
    Number(rawMonth) < 1 ||
    Number(rawMonth) > 12
  ) {
    return json({ ok: false, error: 'Invalid holiday year or month.' }, 400, origin);
  }
  if (!env.HOLIDAY_API_KEY)
    return json(
      {
        ok: false,
        code: 'HOLIDAY_KEY_MISSING',
        error: 'Cloudflare Worker secret HOLIDAY_API_KEY is not configured.',
      },
      503,
      origin,
    );
  const month = rawMonth.padStart(2, '0');
  const url = new URL(
    'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo',
  );
  url.searchParams.set('serviceKey', env.HOLIDAY_API_KEY);
  url.searchParams.set('solYear', year);
  url.searchParams.set('solMonth', month);
  url.searchParams.set('_type', 'json');
  try {
    const upstream = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!upstream.ok) {
      console.error('Holiday API HTTP error', upstream.status, year, month);
      return json(
        { ok: false, code: 'HOLIDAY_UPSTREAM_HTTP', error: `Holiday API HTTP ${upstream.status}.` },
        502,
        origin,
      );
    }
    const data = await upstream.json();
    const header = data?.response?.header;
    if (header?.resultCode && header.resultCode !== '00') {
      console.error('Holiday API service error', header.resultCode, header.resultMsg, year, month);
      const authFailure = /key|인증|service/i.test(`${header.resultCode} ${header.resultMsg}`);
      return json(
        {
          ok: false,
          code: authFailure ? 'HOLIDAY_AUTH_ERROR' : 'HOLIDAY_UPSTREAM_SERVICE',
          error: `Holiday API error: ${header.resultMsg || header.resultCode}`,
        },
        502,
        origin,
      );
    }
    const rawItems = data?.response?.body?.items?.item;
    const items = rawItems == null ? [] : Array.isArray(rawItems) ? rawItems : [rawItems];
    const holidays = items
      .filter(item => item.isHoliday === 'Y')
      .map(item => ({
        date: String(item.locdate),
        name: String(item.dateName || ''),
        isHoliday: item.isHoliday,
      }))
      .filter(item => /^\d{8}$/.test(item.date) && item.name);
    return json({ ok: true, year, month, holidays }, 200, origin);
  } catch (error) {
    console.error('Holiday API request or JSON parse failed', error?.message || error, year, month);
    return json(
      {
        ok: false,
        code: 'HOLIDAY_UPSTREAM_ERROR',
        error: 'Holiday API connection or response processing failed.',
      },
      502,
      origin,
    );
  }
}

// Worker가 Apps Script에 서버 간 JSON 요청을 보내고, 실패 응답을 예외로 통일합니다.
// 서버 비밀키를 포함해 Apps Script 웹 앱으로 JSON action을 전달하고, 비정상 HTTP/API 응답을 Worker 오류로 변환합니다.
async function callAppsScript(payload, env) {
  const target = env.APPS_SCRIPT_URL;
  if (!target || target.includes('REPLACE_WITH'))
    throw new Error('Apps Script URL is not configured.');
  const startedAt = performance.now();
  let status = 'network_error';
  let timingLogged = false;
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, bridgeSecret: env.ARCHIVE_BRIDGE_SECRET }),
      redirect: 'follow',
    });
    status = upstream.status;
    const data = await upstream.json();
    logWorkerTiming(env, payload.requestId || '', 'apps_script.request', startedAt, {
      action: String(payload.action || '').slice(0, 60),
      status,
    });
    timingLogged = true;
    if (!upstream.ok || !data.ok)
      throw new Error(data.error || `Apps Script returned HTTP ${upstream.status}.`);
    return data;
  } catch (error) {
    if (!timingLogged)
      logWorkerTiming(env, payload.requestId || '', 'apps_script.request', startedAt, {
        action: String(payload.action || '').slice(0, 60),
        status,
      });
    throw error;
  }
}

// Apps Script가 Drive resumable session URL을 생성해 반환하면, Worker는 URL과 업로더 상태를 KV에 7일 저장합니다.
// 브라우저에는 세션 URL을 숨기고 업로드 ID만 반환하므로 파일 본문은 이후 청크 경로를 통해 전달됩니다.
async function startArchiveUploads(payload, env, origin) {
  if (!env.ARCHIVE_UPLOADS || !env.ARCHIVE_BRIDGE_SECRET)
    return json(
      { ok: false, error: '자료실 업로드 저장소 설정이 완료되지 않았습니다.' },
      503,
      origin,
    );
  try {
    const data = await callAppsScript(payload, env);
    const uploads = [];
    for (const upload of data.uploads || []) {
      if (
        !String(upload.sessionUrl || '').startsWith(
          'https://www.googleapis.com/upload/drive/v3/files?',
        )
      )
        throw new Error('Google Drive upload session URL is invalid.');
      const state = {
        ...upload,
        token: String(payload.token || ''),
        offset: 0,
        totalSize: Number(upload.fileSize),
      };
      await env.ARCHIVE_UPLOADS.put(`upload:${upload.uploadId}`, JSON.stringify(state), {
        expirationTtl: 604800,
      });
      const { sessionUrl, token, ...clientUpload } = state;
      uploads.push(clientUpload);
    }
    return json({ ok: true, uploads }, 200, origin);
  } catch (error) {
    console.error('Archive upload initialization failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '자료실 업로드 준비에 실패했습니다.' },
      502,
      origin,
    );
  }
}

// Apps Script에서 Drive 업로드 세션과 파일 검증 결과를 준비한 뒤 재개 URL을 KV에 보관합니다.
// 여러 파일의 세션 생성 일부가 실패하면 이미 만든 Drive 세션과 KV 키를 정리합니다.
async function startBoardUploads(payload, env, origin) {
  if (!env.ARCHIVE_UPLOADS || !env.ARCHIVE_BRIDGE_SECRET)
    return json(
      { ok: false, error: '게시판 업로드 저장소 설정이 완료되지 않았습니다.' },
      503,
      origin,
    );
  const createdSessions = [];
  const savedKeys = [];
  try {
    const data = await callAppsScript(payload, env);
    const uploads = [];
    for (const upload of data.uploads || []) {
      if (
        !String(upload.sessionUrl || '').startsWith(
          'https://www.googleapis.com/upload/drive/v3/files?',
        )
      )
        throw new Error('Google Drive upload session URL is invalid.');
      createdSessions.push(upload.sessionUrl);
      const state = {
        ...upload,
        token: String(payload.token || ''),
        offset: 0,
        totalSize: Number(upload.fileSize),
        scope: 'board',
      };
      const key = `board-upload:${upload.uploadId}`;
      await env.ARCHIVE_UPLOADS.put(key, JSON.stringify(state), {
        expirationTtl: 604800,
      });
      savedKeys.push(key);
      const { sessionUrl, token, ...clientUpload } = state;
      uploads.push(clientUpload);
    }
    return json({ ok: true, uploads }, 200, origin);
  } catch (error) {
    await Promise.allSettled(
      createdSessions.map(sessionUrl => fetch(sessionUrl, { method: 'DELETE' })),
    );
    await Promise.allSettled(savedKeys.map(key => env.ARCHIVE_UPLOADS.delete(key)));
    console.error('Board upload initialization failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '게시판 파일 업로드 준비에 실패했습니다.' },
      502,
      origin,
    );
  }
}

// 요청당 최대 8MiB를 메모리에 읽어 업로더 권한·파일 시그니처를 검사한 뒤 Drive resumable URL로 전달합니다.
// 매 청크마다 Apps Script 세션 확인과 Drive 업로드 위치 확인을 수행하고 진행 offset을 KV에 기록합니다.
async function uploadBoardChunk(request, env, origin) {
  if (!env.ARCHIVE_UPLOADS || !env.ARCHIVE_BRIDGE_SECRET)
    return json(
      { ok: false, error: '게시판 업로드 저장소 설정이 완료되지 않았습니다.' },
      503,
      origin,
    );
  const uploadId = request.headers.get('X-Upload-Id') || '';
  const requestId = safeRequestId(request.headers.get('X-Request-ID'));
  const token = request.headers.get('X-Session-Token') || '';
  const start = Number(request.headers.get('X-Chunk-Start'));
  const kvReadStartedAt = performance.now();
  const raw = await env.ARCHIVE_UPLOADS.get(`board-upload:${uploadId}`);
  logWorkerTiming(env, requestId, 'kv.upload_state_read', kvReadStartedAt);
  if (!raw)
    return json(
      { ok: false, error: '업로드 세션이 만료되었습니다. 파일을 다시 선택해 주세요.' },
      410,
      origin,
    );
  const state = JSON.parse(raw);
  if (!token || token !== state.token)
    return json({ ok: false, error: '업로드 권한이 없습니다.' }, 403, origin);
  if (state.completedFile) return finishBoardUpload(state, state.completedFile, env, origin);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(state.totalSize))
    return json({ ok: false, error: '업로드 위치 정보가 올바르지 않습니다.' }, 400, origin);
  try {
    const auth = await callAppsScript({ action: 'session', token, requestId }, env);
    if (auth.user?.userId !== state.uploadedBy)
      return json(
        { ok: false, error: '파일 업로드를 시작한 사용자만 이어서 진행할 수 있습니다.' },
        403,
        origin,
      );
    const chunk = await request.arrayBuffer();
    if (
      !chunk.byteLength ||
      chunk.byteLength > 8 * 1024 * 1024 ||
      start + chunk.byteLength > state.totalSize
    )
      return json({ ok: false, error: '업로드 데이터 크기가 올바르지 않습니다.' }, 400, origin);
    const videoExtensions = ['mp4', 'mov', 'webm', 'avi'];
    if (videoExtensions.includes(String(state.extension).toLowerCase()))
      return json(
        { ok: false, error: '신규 게시판에서는 동영상 업로드를 지원하지 않습니다.' },
        415,
        origin,
      );
    if (start === 0 && !validArchiveSignature(state.extension, new Uint8Array(chunk)))
      return json(
        { ok: false, error: '파일 내용이 허용된 파일 형식과 일치하지 않습니다.' },
        415,
        origin,
      );
    const driveStatusStartedAt = performance.now();
    const status = await fetch(state.sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes */${state.totalSize}` },
    });
    logWorkerTiming(env, requestId, 'drive.upload_status', driveStatusStartedAt, {
      status: status.status,
      bytes: chunk.byteLength,
    });
    if (status.status !== 308) {
      if (status.ok) {
        state.completedFile = await status.json();
        await saveUploadState(env, `board-upload:${uploadId}`, state, requestId);
        return finishBoardUpload(state, state.completedFile, env, origin);
      }
      if (status.status !== 404)
        throw new Error(`Google Drive upload status check failed (${status.status}).`);
      return json(
        { ok: false, error: 'Google Drive 업로드 세션이 만료되었습니다. 다시 시도해 주세요.' },
        410,
        origin,
      );
    }
    const actualOffset = offsetFromRange(status.headers.get('Range'));
    if (actualOffset !== start) {
      state.offset = actualOffset;
      await saveUploadState(env, `board-upload:${uploadId}`, state, requestId);
      return json(
        { ok: true, received: actualOffset, total: state.totalSize, done: false },
        200,
        origin,
      );
    }
    const end = start + chunk.byteLength;
    const driveChunkStartedAt = performance.now();
    const upstream = await fetch(state.sessionUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${start}-${end - 1}/${state.totalSize}`,
        'Content-Type': state.mimeType,
      },
      body: chunk,
    });
    logWorkerTiming(env, requestId, 'drive.upload_chunk', driveChunkStartedAt, {
      status: upstream.status,
      bytes: chunk.byteLength,
    });
    if (upstream.status === 308) {
      state.offset = offsetFromRange(upstream.headers.get('Range'));
      await saveUploadState(env, `board-upload:${uploadId}`, state, requestId);
      return json(
        { ok: true, received: state.offset, total: state.totalSize, done: false },
        200,
        origin,
      );
    }
    if (!upstream.ok) throw new Error(`Google Drive upload failed (${upstream.status}).`);
    state.completedFile = await upstream.json();
    await saveUploadState(env, `board-upload:${uploadId}`, state, requestId);
    return finishBoardUpload(state, state.completedFile, env, origin);
  } catch (error) {
    console.error('Board upload chunk failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '게시판 파일 업로드에 실패했습니다.' },
      502,
      origin,
    );
  }
}

// Drive 업로드가 완료된 파일 ID를 Apps Script에 전달해 게시판파일 시트 메타데이터와 게시글 연결을 확정합니다.
// 시트 저장이 성공한 뒤에만 KV 재개 세션을 삭제합니다.
async function finishBoardUpload(state, file, env, origin) {
  try {
    const saved = await callAppsScript(
      {
        action: 'boardUploadComplete',
        token: state.token,
        boardId: state.boardId,
        postId: state.postId,
        fileId: state.fileId,
        driveFileId: file.id,
        driveFolderId: state.driveFolderId,
        originalFilename: state.originalFilename,
        storedFilename: state.storedFilename,
        fileType: state.fileType,
        mimeType: state.mimeType,
        fileSize: state.fileSize,
        isCover: state.isCover === true,
      },
      env,
    );
    await env.ARCHIVE_UPLOADS.delete(`board-upload:${state.uploadId}`);
    return json(
      {
        ok: true,
        done: true,
        file: {
          fileId: saved.fileId,
          originalFilename: state.originalFilename,
          fileType: state.fileType,
          mimeType: state.mimeType,
          fileSize: saved.fileSize,
        },
      },
      200,
      origin,
    );
  } catch (error) {
    console.error('Board upload metadata save failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '파일 정보 저장에 실패했습니다.' },
      502,
      origin,
    );
  }
}

// 게시판 업로드 취소 시 해당 사용자의 KV 재개 세션을 제거합니다.
async function cancelBoardUpload(request, env, origin) {
  const uploadId = request.headers.get('X-Upload-Id') || '';
  const token = request.headers.get('X-Session-Token') || '';
  const raw = await env.ARCHIVE_UPLOADS?.get(`board-upload:${uploadId}`);
  if (!raw) return json({ ok: true }, 200, origin);
  const state = JSON.parse(raw);
  if (!token || token !== state.token)
    return json({ ok: false, error: '업로드 취소 권한이 없습니다.' }, 403, origin);
  if (state.completedFile)
    return json(
      { ok: false, error: 'Drive 저장이 끝난 파일은 메타데이터 저장을 재시도해야 합니다.' },
      409,
      origin,
    );
  try {
    await fetch(state.sessionUrl, { method: 'DELETE' });
  } catch (error) {
    console.error('Board resumable upload cancellation failed', error?.message || error);
  }
  await env.ARCHIVE_UPLOADS.delete(`board-upload:${uploadId}`);
  return json({ ok: true }, 200, origin);
}

// 자료실 업로드도 청크마다 로그인 세션과 관리자 역할을 확인하고, Drive 재개 주소에 본문을 전달합니다.
// 한 청크를 ArrayBuffer로 읽고 Drive의 현재 offset 및 완료 응답에 따라 KV 상태를 갱신합니다.
async function uploadArchiveChunk(request, env, origin) {
  if (!env.ARCHIVE_UPLOADS || !env.ARCHIVE_BRIDGE_SECRET)
    return json(
      { ok: false, error: '자료실 업로드 저장소 설정이 완료되지 않았습니다.' },
      503,
      origin,
    );
  const uploadId = request.headers.get('X-Upload-Id') || '';
  const requestId = safeRequestId(request.headers.get('X-Request-ID'));
  const token = request.headers.get('X-Session-Token') || '';
  const start = Number(request.headers.get('X-Chunk-Start'));
  const kvReadStartedAt = performance.now();
  const stateRaw = await env.ARCHIVE_UPLOADS.get(`upload:${uploadId}`);
  logWorkerTiming(env, requestId, 'kv.upload_state_read', kvReadStartedAt);
  if (!stateRaw)
    return json(
      { ok: false, error: '업로드 세션이 만료되었습니다. 파일을 다시 선택해 주세요.' },
      410,
      origin,
    );
  const state = JSON.parse(stateRaw);
  if (!token || token !== state.token)
    return json({ ok: false, error: '업로드 권한이 없습니다.' }, 403, origin);
  if (state.completedFile) return finishArchiveUpload(state, state.completedFile, env, origin);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(state.totalSize))
    return json({ ok: false, error: '업로드 위치 정보가 올바르지 않습니다.' }, 400, origin);
  try {
    const auth = await callAppsScript({ action: 'session', token, requestId }, env);
    if (auth.user?.role !== 'admin')
      return json({ ok: false, error: '관리자만 파일을 업로드할 수 있습니다.' }, 403, origin);
    const chunk = await request.arrayBuffer();
    if (
      !chunk.byteLength ||
      chunk.byteLength > 8 * 1024 * 1024 ||
      start + chunk.byteLength > state.totalSize
    )
      return json({ ok: false, error: '업로드 데이터 크기가 올바르지 않습니다.' }, 400, origin);
    if (start === 0 && !validArchiveSignature(state.extension, new Uint8Array(chunk)))
      return json(
        { ok: false, error: '파일 내용이 허용된 파일 형식과 일치하지 않습니다.' },
        415,
        origin,
      );
    const driveStatusStartedAt = performance.now();
    const status = await fetch(state.sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes */${state.totalSize}` },
    });
    logWorkerTiming(env, requestId, 'drive.upload_status', driveStatusStartedAt, {
      status: status.status,
      bytes: chunk.byteLength,
    });
    if (status.status !== 308) {
      if (status.ok) {
        state.completedFile = await status.json();
        await saveUploadState(env, `upload:${uploadId}`, state, requestId);
        return finishArchiveUpload(state, state.completedFile, env, origin);
      }
      if (status.status !== 404)
        throw new Error(`Google Drive upload status check failed (${status.status}).`);
      return json(
        { ok: false, error: 'Google Drive 업로드 세션이 만료되었습니다. 다시 시도해 주세요.' },
        410,
        origin,
      );
    }
    const actualOffset = offsetFromRange(status.headers.get('Range'));
    if (actualOffset !== start) {
      state.offset = actualOffset;
      await saveUploadState(env, `upload:${uploadId}`, state, requestId);
      return json(
        { ok: true, received: actualOffset, total: state.totalSize, done: false },
        200,
        origin,
      );
    }
    const end = start + chunk.byteLength;
    const driveChunkStartedAt = performance.now();
    const upstream = await fetch(state.sessionUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${start}-${end - 1}/${state.totalSize}`,
        'Content-Type': state.mimeType,
      },
      body: chunk,
    });
    logWorkerTiming(env, requestId, 'drive.upload_chunk', driveChunkStartedAt, {
      status: upstream.status,
      bytes: chunk.byteLength,
    });
    if (upstream.status === 308) {
      state.offset = offsetFromRange(upstream.headers.get('Range'));
      await saveUploadState(env, `upload:${uploadId}`, state, requestId);
      return json(
        { ok: true, received: state.offset, total: state.totalSize, done: false },
        200,
        origin,
      );
    }
    if (!upstream.ok) {
      const msg = await upstream.text();
      console.error('Drive chunk upload error', upstream.status, msg.slice(0, 300));
      return json({ ok: false, error: 'Google Drive 파일 업로드에 실패했습니다.' }, 502, origin);
    }
    state.completedFile = await upstream.json();
    await saveUploadState(env, `upload:${uploadId}`, state, requestId);
    return finishArchiveUpload(state, state.completedFile, env, origin);
  } catch (error) {
    console.error('Archive chunk upload failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '파일 업로드 중 오류가 발생했습니다.' },
      502,
      origin,
    );
  }
}

// 확장자에 맞는 파일 시그니처를 검사해 이름이나 MIME 타입만 바꾼 파일 업로드를 차단합니다.
function validArchiveSignature(extension, bytes) {
  const ascii = (offset, count) => String.fromCharCode(...bytes.slice(offset, offset + count));
  const starts = (...values) => values.every((value, index) => bytes[index] === value);
  const zip =
    starts(0x50, 0x4b) &&
    ((bytes[2] === 3 && bytes[3] === 4) ||
      (bytes[2] === 5 && bytes[3] === 6) ||
      (bytes[2] === 7 && bytes[3] === 8));
  const ole = starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  switch (extension) {
    case 'png':
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'jpg':
    case 'jpeg':
      return starts(0xff, 0xd8, 0xff);
    case 'gif':
      return ['GIF87a', 'GIF89a'].includes(ascii(0, 6));
    case 'bmp':
      return ascii(0, 2) === 'BM';
    case 'webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP';
    case 'mp4':
    case 'mov':
      return ascii(4, 4) === 'ftyp';
    case 'webm':
      return starts(0x1a, 0x45, 0xdf, 0xa3);
    case 'avi':
      return ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'AVI ';
    case 'pdf':
      return ascii(0, 5) === '%PDF-';
    case 'zip':
      return zip;
    case 'xlsx':
    case 'docx':
    case 'pptx':
    case 'hwpx':
      return zip;
    case 'xls':
    case 'doc':
    case 'ppt':
    case 'hwp':
      return ole;
    case 'txt':
    case 'csv':
      return !bytes.slice(0, 4096).includes(0);
    default:
      return false;
  }
}

// Drive 응답의 파일 ID와 업로드 정보를 Apps Script에 보내 자료실파일 행을 확정합니다.
// 완료됐지만 Sheets 기록이 실패한 경우 재시도 가능하도록 KV 상태는 실패 경로에서 남겨 둡니다.
async function finishArchiveUpload(state, file, env, origin) {
  try {
    const saved = await callAppsScript(
      {
        action: 'archiveUploadComplete',
        token: state.token,
        postId: state.postId,
        fileId: state.fileId,
        driveFileId: file.id,
        driveFolderId: state.driveFolderId,
        originalFilename: state.originalFilename,
        storedFilename: state.storedFilename,
        fileType: state.fileType,
        mimeType: state.mimeType,
        fileSize: state.fileSize,
      },
      env,
    );
    await env.ARCHIVE_UPLOADS.delete(`upload:${state.uploadId}`);
    return json(
      {
        ok: true,
        done: true,
        file: {
          fileId: saved.fileId,
          originalFilename: state.originalFilename,
          fileType: state.fileType,
          mimeType: state.mimeType,
          fileSize: saved.fileSize,
        },
      },
      200,
      origin,
    );
  } catch (error) {
    console.error(
      'Drive upload completed but metadata commit failed',
      state.fileId,
      error?.message || error,
    );
    return json(
      {
        ok: false,
        code: 'ARCHIVE_METADATA_COMMIT_FAILED',
        error:
          '파일 업로드는 됐지만 자료실 기록 저장에 실패했습니다. 같은 업로드를 재시도해 주세요.',
      },
      502,
      origin,
    );
  }
}

// Drive의 Range 헤더에서 다음에 전송할 바이트 위치를 계산합니다.
function offsetFromRange(value) {
  const match = String(value || '').match(/(?:bytes=)?0-(\d+)/i);
  return match ? Number(match[1]) + 1 : 0;
}

// 진행 중 업로드를 요청자 소유인지 확인한 뒤 KV에서 취소하고 상태를 제거합니다.
async function cancelArchiveUpload(request, env, origin) {
  if (!env.ARCHIVE_UPLOADS)
    return json(
      { ok: false, error: '자료실 업로드 저장소 설정이 완료되지 않았습니다.' },
      503,
      origin,
    );
  const uploadId = request.headers.get('X-Upload-Id') || '';
  const token = request.headers.get('X-Session-Token') || '';
  const raw = await env.ARCHIVE_UPLOADS.get(`upload:${uploadId}`);
  if (!raw) return json({ ok: true }, 200, origin);
  const state = JSON.parse(raw);
  if (!token || token !== state.token)
    return json({ ok: false, error: '업로드 취소 권한이 없습니다.' }, 403, origin);
  await env.ARCHIVE_UPLOADS.delete(`upload:${uploadId}`);
  return json({ ok: true }, 200, origin);
}

// 파일 접근 권한을 Apps Script에서 확인하고, 짧은 만료시간을 가진 1회성 다운로드 티켓을 발급합니다.
async function downloadArchiveFile(payload, env, origin, requestUrl) {
  // Apps Script가 파일 ID와 사용자 권한을 검증한 결과를 KV에 임시 보관하고 5분 다운로드 티켓만 클라이언트에 반환합니다.
  if (!env.ARCHIVE_UPLOADS || !env.ARCHIVE_BRIDGE_SECRET)
    return json(
      { ok: false, error: '자료실 파일 저장소 설정이 완료되지 않았습니다.' },
      503,
      origin,
    );
  try {
    const info = await callAppsScript(
      { action: 'archiveDownloadInfo', token: payload.token, fileId: payload.fileId },
      env,
    );
    const ticket = crypto.randomUUID();
    await env.ARCHIVE_UPLOADS.put(`download:${ticket}`, JSON.stringify(info), {
      expirationTtl: 300,
    });
    return json(
      { ok: true, downloadUrl: `${new URL(requestUrl).origin}/archive/download/${ticket}` },
      200,
      origin,
    );
  } catch (error) {
    console.error('Archive download authorization failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '파일 다운로드 권한을 확인하지 못했습니다.' },
      403,
      origin,
    );
  }
}

// 게시판 파일의 로그인 접근 권한을 Apps Script에서 확인한 뒤 5분짜리 일회성 티켓을 발급합니다.
async function downloadBoardFile(payload, env, origin, requestUrl) {
  // Apps Script 권한 확인 후 파일 메타데이터와 Drive 접근 정보를 KV 티켓에 저장해 파일 ID 직접 노출 없이 URL을 발급합니다.
  if (!env.ARCHIVE_UPLOADS || !env.ARCHIVE_BRIDGE_SECRET)
    return json(
      { ok: false, error: '게시판 파일 저장소 설정이 완료되지 않았습니다.' },
      503,
      origin,
    );
  try {
    const info = await callAppsScript(
      { action: 'boardDownloadInfo', token: payload.token, fileId: payload.fileId },
      env,
    );
    const ticket = crypto.randomUUID();
    await env.ARCHIVE_UPLOADS.put(`board-download:${ticket}`, JSON.stringify(info), {
      expirationTtl: 300,
    });
    return json(
      { ok: true, downloadUrl: `${new URL(requestUrl).origin}/boards/download/${ticket}` },
      200,
      origin,
    );
  } catch (error) {
    console.error('Board download authorization failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '파일 다운로드 권한을 확인하지 못했습니다.' },
      403,
      origin,
    );
  }
}

// 게시글 목록과 선택된 사진 게시글의 대표 이미지 접근 정보를 조회하고,
// 5분짜리 미리보기 티켓을 KV에 넣어 이미지별 Worker URL을 응답에 덧붙입니다.
async function listBoardPosts(payload, env, origin, requestUrl) {
  try {
    const result = await callAppsScript(
      payload.boardId === 'photo' ? { ...payload, includePreviewAccess: true } : payload,
      env,
    );
    if (payload.boardId !== 'photo') return json(result, 200, origin);
    const previewAccess = result.previewAccess;
    delete result.previewAccess;
    const fileIds = [
      ...new Set((result.posts || []).map(post => post.coverFileId).filter(Boolean)),
    ];
    if (!fileIds.length) return json(result, 200, origin);
    const preview = previewAccess || await callAppsScript(
      { action: 'boardPreviewInfo', token: payload.token, fileIds },
      env,
    );
    const ticket = crypto.randomUUID();
    const filesById = Object.fromEntries((preview.files || []).map(file => [file.fileId, file]));
    await env.ARCHIVE_UPLOADS.put(
      `board-preview:${ticket}`,
      JSON.stringify({ driveToken: preview.driveToken, files: filesById }),
      { expirationTtl: 300 },
    );
    const base = new URL(requestUrl).origin;
    result.posts = result.posts.map(post => ({
      ...post,
      previewUrl: filesById[post.coverFileId]
        ? `${base}/boards/preview/${ticket}/${encodeURIComponent(post.coverFileId)}`
        : '',
    }));
    return json(result, 200, origin);
  } catch (error) {
    console.error('Board post listing failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '게시글 목록을 불러오지 못했습니다.' },
      502,
      origin,
    );
  }
}

// 상세 화면에서 게시글에 실제 연결된 이미지·일반 텍스트 파일을 확인하고 미리보기 티켓을 만듭니다.
async function createBoardImagePreviewTicket(payload, env, origin, requestUrl) {
  try {
    const preview = await callAppsScript(
      { action: 'boardPreviewInfo', token: payload.token, fileIds: payload.fileIds || [] },
      env,
    );
    const ticket = crypto.randomUUID();
    const files = Object.fromEntries((preview.files || []).map(file => [file.fileId, file]));
    await env.ARCHIVE_UPLOADS.put(
      `board-preview:${ticket}`,
      JSON.stringify({ driveToken: preview.driveToken, files }),
      { expirationTtl: 300 },
    );
    const base = new URL(requestUrl).origin;
    return json(
      {
        ok: true,
        previews: Object.fromEntries(
          Object.keys(files).map(fileId => [
            fileId,
            `${base}/boards/preview/${ticket}/${encodeURIComponent(fileId)}`,
          ]),
        ),
      },
      200,
      origin,
    );
  } catch (error) {
    console.error('Board image preview ticket creation failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '사진 미리보기를 준비하지 못했습니다.' },
      502,
      origin,
    );
  }
}

// 로그인한 게시글 상세보기에서만 ZIP 티켓을 발급하며 파일 ID 목록은 KV에 보관합니다.
async function createBoardZipTicket(payload, env, origin, requestUrl) {
  try {
    const info = await callAppsScript(
      {
        action: 'boardZipInfo',
        token: payload.token,
        boardId: payload.boardId,
        postId: payload.postId,
      },
      env,
    );
    const ticket = crypto.randomUUID();
    await env.ARCHIVE_UPLOADS.put(`board-zip:${ticket}`, JSON.stringify(info), {
      expirationTtl: 300,
    });
    return json(
      { ok: true, downloadUrl: `${new URL(requestUrl).origin}/boards/download-zip/${ticket}` },
      200,
      origin,
    );
  } catch (error) {
    console.error('Board ZIP authorization failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '첨부파일 압축을 준비하지 못했습니다.' },
      403,
      origin,
    );
  }
}

// 한 번만 사용할 수 있는 ZIP 티켓으로 Drive 파일을 순차 스트리밍해 메모리 적재 없이 압축합니다.
async function downloadBoardZip(ticket, env, origin) {
  if (!env.ARCHIVE_UPLOADS || !/^[0-9a-f-]{36}$/i.test(ticket))
    return json({ ok: false, error: '다운로드 주소가 유효하지 않습니다.' }, 404, origin);
  const key = `board-zip:${ticket}`;
  const raw = await env.ARCHIVE_UPLOADS.get(key);
  if (!raw)
    return json(
      { ok: false, error: '다운로드 주소가 만료되었습니다. 다시 요청해 주세요.' },
      410,
      origin,
    );
  await env.ARCHIVE_UPLOADS.delete(key);
  const info = JSON.parse(raw);
  const chunks = zipDriveFiles(info)[Symbol.asyncIterator]();
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const result = await chunks.next();
        if (result.done) controller.close();
        else controller.enqueue(result.value);
      } catch (error) {
        console.error('Board ZIP streaming failed', error?.message || error);
        controller.error(error);
      }
    },
    async cancel() {
      await chunks.return?.();
    },
  });
  const name = `게시판_${info.boardId}_${info.postId}.zip`;
  const headers = {
    ...securityHeaders(),
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    'Cache-Control': 'no-store',
  };
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new Response(stream, { status: 200, headers });
}

// JSZip 의존성 없이 ZIP Store 형식으로 Drive 응답을 차례로 쓰고 CRC와 중앙 디렉터리를 만듭니다.
async function* zipDriveFiles(info) {
  const central = [];
  let offset = 0;
  const usedNames = new Set();
  for (const file of info.files || []) {
    const baseName = String(file.filename || file.fileId)
      .replace(/[\\/\u0000-\u001f]/g, '_')
      .slice(0, 200);
    let filename = baseName || file.fileId;
    let suffix = 1;
    while (usedNames.has(filename)) {
      const dot = baseName.lastIndexOf('.');
      filename =
        dot > 0
          ? `${baseName.slice(0, dot)} (${suffix++})${baseName.slice(dot)}`
          : `${baseName} (${suffix++})`;
    }
    usedNames.add(filename);
    const name = new TextEncoder().encode(filename);
    const localOffset = offset;
    const header = zipLocalHeader(name);
    yield header;
    offset += header.length;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.driveFileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${info.driveToken}` } },
    );
    if (!response.ok || !response.body)
      throw new Error(`Drive 파일을 읽지 못했습니다. (HTTP ${response.status})`);
    const reader = response.body.getReader();
    let crc = 0xffffffff;
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 0xffffffff || offset + size > 0xffffffff)
        throw new Error('ZIP 용량 4GB 제한을 초과했습니다.');
      crc = crc32Update(crc, value);
      offset += value.byteLength;
      yield value;
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const descriptor = zipDataDescriptor(crc, size);
    yield descriptor;
    offset += descriptor.length;
    central.push({ name, crc, size, localOffset });
  }
  const centralOffset = offset;
  for (const entry of central) {
    const record = zipCentralHeader(entry);
    yield record;
    offset += record.length;
  }
  yield zipEndRecord(central.length, offset - centralOffset, centralOffset);
}

const ZIP_CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32Update(crc, bytes) {
  for (const byte of bytes) crc = ZIP_CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return crc >>> 0;
}
function zipLocalHeader(name) {
  const out = new Uint8Array(30 + name.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x808, true);
  view.setUint16(8, 0, true);
  view.setUint16(26, name.length, true);
  out.set(name, 30);
  return out;
}
function zipDataDescriptor(crc, size) {
  const out = new Uint8Array(16);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x08074b50, true);
  view.setUint32(4, crc, true);
  view.setUint32(8, size, true);
  view.setUint32(12, size, true);
  return out;
}
function zipCentralHeader(entry) {
  const out = new Uint8Array(46 + entry.name.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x808, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.size, true);
  view.setUint32(24, entry.size, true);
  view.setUint16(28, entry.name.length, true);
  view.setUint32(42, entry.localOffset, true);
  out.set(entry.name, 46);
  return out;
}
function zipEndRecord(count, centralSize, centralOffset) {
  const out = new Uint8Array(22);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return out;
}

// 짧은 만료 티켓으로 허용된 이미지·일반 텍스트만 비공개 인라인 스트림으로 제공합니다.
async function previewBoardImage(ticket, requestedFileId, env, origin) {
  const raw = await env.ARCHIVE_UPLOADS?.get(`board-preview:${ticket}`);
  if (!raw) return json({ ok: false, error: '사진 미리보기가 만료되었습니다.' }, 410, origin);
  const state = JSON.parse(raw);
  let fileId;
  try {
    fileId = decodeURIComponent(requestedFileId || '');
  } catch (_) {
    return json({ ok: false, error: '미리보기 파일 주소가 올바르지 않습니다.' }, 400, origin);
  }
  const file = state.files?.[fileId];
  const mimeType = String(file?.mimeType || '');
  if (!file || (!mimeType.startsWith('image/') && mimeType !== 'text/plain'))
    return json({ ok: false, error: '미리보기를 지원하지 않는 파일입니다.' }, 404, origin);
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.driveFileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${state.driveToken}` } },
    );
    if (!response.ok) return json({ ok: false, error: '사진을 불러오지 못했습니다.' }, 502, origin);
    const headers = {
      ...securityHeaders(),
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      'Cache-Control': 'private, max-age=60',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    };
    if (origin) Object.assign(headers, corsHeaders(origin));
    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    console.error('Board image preview failed', error?.message || error);
    return json({ ok: false, error: '사진을 불러오지 못했습니다.' }, 502, origin);
  }
}

// KV의 일회성 티켓으로 Drive를 인증 호출하고, 응답 본문을 스트리밍으로 전달합니다.
async function downloadBoardTicket(ticket, env, origin) {
  // 일회용 KV 티켓을 소비해 Drive 파일을 가져오고 원래 파일명 및 MIME 정보로 다운로드 응답을 구성합니다.
  if (!env.ARCHIVE_UPLOADS || !/^[0-9a-f-]{36}$/i.test(ticket))
    return json({ ok: false, error: '다운로드 주소가 유효하지 않습니다.' }, 404, origin);
  try {
    const key = `board-download:${ticket}`;
    const raw = await env.ARCHIVE_UPLOADS.get(key);
    if (!raw)
      return json(
        { ok: false, error: '다운로드 주소가 만료되었습니다. 다시 요청해 주세요.' },
        410,
        origin,
      );
    await env.ARCHIVE_UPLOADS.delete(key);
    const info = JSON.parse(raw);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(info.driveFileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${info.driveToken}` } },
    );
    if (!response.ok)
      return json(
        { ok: false, error: '파일을 다운로드하지 못했습니다.' },
        response.status === 404 ? 404 : 502,
        origin,
      );
    const filename = String(info.filename || 'download').replace(/[\r\n"\\]/g, '_');
    const headers = {
      ...securityHeaders(),
      'Content-Type': info.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    };
    if (info.fileSize) headers['Content-Length'] = String(info.fileSize);
    if (origin) Object.assign(headers, corsHeaders(origin));
    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    console.error('Board Drive download failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '파일 다운로드에 실패했습니다.' },
      502,
      origin,
    );
  }
}

// 게시글 작성자 또는 관리자의 삭제 권한을 Apps Script에서 검증한 뒤 첨부 Drive 파일을 삭제합니다.
async function deleteBoardFile(payload, env, origin) {
  try {
    const prepared = await callAppsScript(
      { action: 'boardPrepareFileDelete', token: payload.token, fileId: payload.fileId },
      env,
    );
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(prepared.driveFileId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${prepared.driveToken}` } },
    );
    if (!response.ok && response.status !== 404)
      throw new Error(`Google Drive file delete failed (${response.status}).`);
    return json(
      await callAppsScript(
        { action: 'boardCompleteFileDelete', token: payload.token, fileId: payload.fileId },
        env,
      ),
      200,
      origin,
    );
  } catch (error) {
    console.error('Board file deletion failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '게시판 파일 삭제에 실패했습니다.' },
      502,
      origin,
    );
  }
}

// 관리자 삭제함에서 복구 불가능한 글을 최종 삭제하며, 실패한 Drive 파일은 서버에 기록합니다.
async function purgeBoardPost(payload, env, origin) {
  try {
    const prepared = await callAppsScript(
      { action: 'purgeBoardPostPrepare', token: payload.token, postId: payload.postId },
      env,
    );
    const failedFileIds = [];
    for (const file of prepared.files || []) {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.driveFileId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${prepared.driveToken}` } },
      );
      if (!response.ok && response.status !== 404) failedFileIds.push(file.fileId);
    }
    return json(
      await callAppsScript(
        {
          action: 'purgeBoardPostComplete',
          token: payload.token,
          postId: payload.postId,
          failedFileIds,
        },
        env,
      ),
      200,
      origin,
    );
  } catch (error) {
    console.error('Board post purge failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '게시글 영구 삭제에 실패했습니다.' },
      502,
      origin,
    );
  }
}

// 1회성 티켓을 확인·소비하고 Drive 파일을 인증된 응답 스트림으로 브라우저에 전달합니다.
async function downloadArchiveTicket(ticket, env, origin) {
  // 자료실 다운로드 티켓을 확인한 뒤 Drive 파일 스트림을 반환하고 사용된 티켓을 정리합니다.
  if (!env.ARCHIVE_UPLOADS || !/^[0-9a-f-]{36}$/i.test(ticket))
    return json({ ok: false, error: '다운로드 주소가 유효하지 않습니다.' }, 404, origin);
  try {
    const key = `download:${ticket}`;
    const raw = await env.ARCHIVE_UPLOADS.get(key);
    if (!raw)
      return json(
        { ok: false, error: '다운로드 주소가 만료되었습니다. 다시 요청해 주세요.' },
        410,
        origin,
      );
    await env.ARCHIVE_UPLOADS.delete(key);
    const info = JSON.parse(raw);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(info.driveFileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${info.driveToken}` } },
    );
    if (!response.ok) {
      console.error('Archive Drive download failed', response.status, info.driveFileId);
      return json(
        { ok: false, error: '파일을 다운로드하지 못했습니다.' },
        response.status === 404 ? 404 : 502,
        origin,
      );
    }
    const filename = String(info.filename || 'download').replace(/[\r\n"\\]/g, '_');
    const headers = {
      ...securityHeaders(),
      'Content-Type': info.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    };
    if (info.fileSize) headers['Content-Length'] = String(info.fileSize);
    if (origin) Object.assign(headers, corsHeaders(origin));
    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    console.error('Archive Drive download failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '파일 다운로드에 실패했습니다.' },
      502,
      origin,
    );
  }
}

// 게시글 삭제를 준비하고 연결된 Drive 파일을 정리한 다음 Apps Script에서 게시글 삭제를 확정합니다.
async function deleteArchivePost(payload, env, origin) {
  try {
    const prepared = await callAppsScript(
      { action: 'archivePreparePostDelete', token: payload.token, postId: payload.postId },
      env,
    );
    const failed = [];
    for (const file of prepared.files || []) {
      const result = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.driveFileId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${prepared.driveToken}` } },
      );
      if (!result.ok && result.status !== 404) failed.push(file.fileId);
    }
    return json(
      await callAppsScript(
        {
          action: 'archiveCompletePostDelete',
          token: payload.token,
          postId: payload.postId,
          failedFileIds: failed,
        },
        env,
      ),
      200,
      origin,
    );
  } catch (error) {
    console.error('Archive post deletion failed', error?.message || error);
    return json({ ok: false, error: error.message || '자료 삭제에 실패했습니다.' }, 502, origin);
  }
}

// 첨부파일 삭제 권한 확인, Drive 파일 삭제, 메타데이터 삭제 확정을 순서대로 처리합니다.
async function deleteArchiveFile(payload, env, origin) {
  try {
    const prepared = await callAppsScript(
      { action: 'archivePrepareFileDelete', token: payload.token, fileId: payload.fileId },
      env,
    );
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(prepared.driveFileId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${prepared.driveToken}` } },
    );
    if (!response.ok && response.status !== 404)
      throw new Error(`Google Drive file delete failed (${response.status}).`);
    return json(
      await callAppsScript(
        { action: 'archiveCompleteFileDelete', token: payload.token, fileId: payload.fileId },
        env,
      ),
      200,
      origin,
    );
  } catch (error) {
    console.error('Archive file deletion failed', error?.message || error);
    return json(
      { ok: false, error: error.message || '첨부파일 삭제에 실패했습니다.' },
      502,
      origin,
    );
  }
}

// 허용된 브라우저 Origin이 사용할 CORS 응답 헤더를 구성합니다.
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'Content-Type, X-Request-ID, X-Upload-Id, X-Session-Token, X-Chunk-Start',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
// API 응답에 캐시 방지와 기본 보안 헤더를 적용합니다.
function securityHeaders() {
  return {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}
// Worker JSON 응답을 공통 보안·CORS 헤더와 함께 생성합니다.
function json(value, status = 200, origin = '') {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...securityHeaders(),
      ...(origin ? corsHeaders(origin) : {}),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
