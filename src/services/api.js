const API_URL = import.meta.env.VITE_API_BASE_URL || '';
const inFlightReads = new Map();
const DEDUPLICATED_READ_ACTIONS = new Set([
  'currentStudents',
  'currentCounselings',
  'counselings',
  'statistics',
  'users',
  'scheduleCategories',
  'schedules',
  'logs',
  'boardPosts',
  'boardStatus',
  'boardNotifications',
  'boardAdminStats',
  'boardActivityLogs',
  'archivePosts',
]);

/**
 * 공통 API 요청 어댑터입니다. action과 payload를 JSON 한 건으로 Worker에 POST하고,
 * JSON 응답의 HTTP/API 오류를 예외로 변환해 호출한 화면에 전달합니다.
 * 명시된 조회 action에 한해 동일 사용자·동일 payload의 동시 요청만 병합하며 결과 캐시는 두지 않습니다.
 */
export async function api(action, payload = {}) {
  if (!API_URL) {
    throw new Error('VITE_API_BASE_URL이 설정되지 않았습니다. 배포 설정을 확인하세요.');
  }

  const dedupeKey = DEDUPLICATED_READ_ACTIONS.has(action)
    ? `${action}:${String(payload.token || '')}:${JSON.stringify(payload)}`
    : '';
  if (dedupeKey && inFlightReads.has(dedupeKey)) return inFlightReads.get(dedupeKey);

  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const startedAt = performance.now();
  const request = (async () => {
    let response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch (_) {
      logRequestTiming(action, requestId, startedAt, 'network_error');
      throw new Error('서버에 연결할 수 없습니다. 네트워크와 API 설정을 확인하세요.');
    }

    let result;
    try {
      result = await response.json();
    } catch (_) {
      logRequestTiming(action, requestId, startedAt, `invalid_response_${response.status}`);
      throw new Error(`서버 응답을 읽을 수 없습니다. (HTTP ${response.status})`);
    }

    if (!response.ok || !result.ok) {
      logRequestTiming(action, requestId, startedAt, `api_error_${response.status}`);
      throw new Error(result.error || `요청에 실패했습니다. (HTTP ${response.status})`);
    }

    logRequestTiming(action, requestId, startedAt, 'ok');
    return result;
  })();
  if (!dedupeKey) return request;
  inFlightReads.set(dedupeKey, request);
  try {
    return await request;
  } finally {
    if (inFlightReads.get(dedupeKey) === request) inFlightReads.delete(dedupeKey);
  }
}

export function clearInFlightApiRequests() {
  inFlightReads.clear();
}

export function logUiTiming(area, operation, startedAt, outcome = 'ok') {
  if (!import.meta.env.DEV) return;
  console.debug('[UI timing]', {
    area,
    operation,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    outcome,
  });
}

function logRequestTiming(action, requestId, startedAt, outcome) {
  if (!import.meta.env.DEV) return;
  console.debug('[API timing]', {
    action,
    requestId,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    outcome,
  });
}
