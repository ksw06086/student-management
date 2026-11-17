export const BOARD_DEFINITIONS = [
  { id: 'board_1', label: '일반 게시판 1', type: 'general' },
  { id: 'board_2', label: '일반 게시판 2', type: 'general' },
  { id: 'board_3', label: '일반 게시판 3', type: 'general' },
  { id: 'photo', label: '사진 게시판', type: 'photo' },
];

export const BOARD_PAGE_SIZE = 10;
export const BOARD_UPLOAD_LIMIT = 100_000_000;

export const BOARD_FILE_TYPES = {
  png: { type: 'image', mime: 'image/png' },
  jpg: { type: 'image', mime: 'image/jpeg' },
  jpeg: { type: 'image', mime: 'image/jpeg' },
  webp: { type: 'image', mime: 'image/webp' },
  gif: { type: 'image', mime: 'image/gif' },
  bmp: { type: 'image', mime: 'image/bmp' },
  pdf: { type: 'document', mime: 'application/pdf' },
  txt: { type: 'document', mime: 'text/plain' },
  csv: { type: 'document', mime: 'text/csv' },
  xlsx: {
    type: 'document',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  xls: { type: 'document', mime: 'application/vnd.ms-excel' },
  doc: { type: 'document', mime: 'application/msword' },
  docx: {
    type: 'document',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  hwp: { type: 'document', mime: 'application/x-hwp' },
  hwpx: { type: 'document', mime: 'application/vnd.hancom.hwpx' },
  ppt: { type: 'document', mime: 'application/vnd.ms-powerpoint' },
  pptx: {
    type: 'document',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  zip: { type: 'archive', mime: 'application/zip' },
};

export const BOARD_DRAFT_KEY = 'alumni-management.board-draft';

export function boardLabel(boardId) {
  return BOARD_DEFINITIONS.find(board => board.id === boardId)?.label || '게시판';
}

export function boardFileExtension(fileName) {
  const name = String(fileName || '');
  return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
}

export function boardFileType(fileName) {
  return BOARD_FILE_TYPES[boardFileExtension(fileName)]?.type || '';
}

export function isBoardImageFile(file) {
  const source = file?.file || file || {};
  const mimeType = String(source.mimeType || source.type || file?.mimeType || '').toLowerCase();
  const filename = file?.originalFilename || source.name || file?.name || '';
  return (
    file?.fileType === 'image' ||
    source.fileType === 'image' ||
    mimeType.startsWith('image/') ||
    boardFileType(filename) === 'image'
  );
}

export function boardUploadSessionMatches(session, clientId, boardId, postId) {
  return Boolean(
    session &&
    clientId &&
    boardId &&
    postId &&
    session.clientId === clientId &&
    session.boardId === boardId &&
    session.postId === postId,
  );
}

export function formatBoardBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1000) return `${value} B`;
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)} KB`;
  return `${(value / 1_000_000).toFixed(1)} MB`;
}

export function highlightText(text, query) {
  const value = String(text || '');
  const needle = String(query || '').trim();
  if (!needle) return value;
  const lowerValue = value.toLocaleLowerCase('ko-KR');
  const lowerNeedle = needle.toLocaleLowerCase('ko-KR');
  const parts = [];
  let start = 0;
  let index = lowerValue.indexOf(lowerNeedle);
  while (index >= 0) {
    if (index > start) parts.push(value.slice(start, index));
    parts.push({
      match: value.slice(index, index + needle.length),
      key: `${index}-${parts.length}`,
    });
    start = index + needle.length;
    index = lowerValue.indexOf(lowerNeedle, start);
  }
  if (start < value.length) parts.push(value.slice(start));
  return parts;
}
