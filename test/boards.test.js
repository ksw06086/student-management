import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_DEFINITIONS,
  BOARD_FILE_TYPES,
  BOARD_UPLOAD_LIMIT,
  boardUploadSessionMatches,
  boardFileExtension,
  boardFileType,
  formatBoardBytes,
  highlightText,
  isBoardImageFile,
} from '../src/features/boards/boards.js';

test('new board definitions are independent and uploads exclude video', () => {
  assert.deepEqual(
    BOARD_DEFINITIONS.map(board => board.id),
    ['board_1', 'board_2', 'board_3', 'photo'],
  );
  assert.equal(BOARD_UPLOAD_LIMIT, 100_000_000);
  assert.equal(BOARD_FILE_TYPES.mp4, undefined);
  assert.equal(boardFileType('memory.JPG'), 'image');
  assert.equal(boardFileType('report.pdf'), 'document');
  assert.equal(boardFileType('archive.zip'), 'archive');
  assert.equal(boardFileExtension('video.mp4'), 'mp4');
  assert.equal(formatBoardBytes(100_000_000), '100.0 MB');
});

test('board search highlighting preserves unmatched text and matched segments', () => {
  assert.deepEqual(highlightText('서울 학생 안내', '학생'), [
    '서울 ',
    { match: '학생', key: '3-1' },
    ' 안내',
  ]);
  assert.equal(highlightText('게시판', ''), '게시판');
});

test('photo attachments recognize both persisted metadata and selected File wrappers', () => {
  assert.equal(isBoardImageFile({ fileType: 'image', originalFilename: 'photo.png' }), true);
  assert.equal(isBoardImageFile({ file: { name: 'photo.jpg', type: 'image/jpeg' } }), true);
  assert.equal(isBoardImageFile({ file: { name: 'notes.pdf', type: 'application/pdf' } }), false);
});

test('resumable board uploads must belong to the same client file, board, and post', () => {
  const session = {
    clientId: 'client-file',
    boardId: 'photo',
    postId: 'post-1',
  };
  assert.equal(boardUploadSessionMatches(session, 'client-file', 'photo', 'post-1'), true);
  assert.equal(boardUploadSessionMatches(session, 'client-file', 'photo', 'post-2'), false);
  assert.equal(boardUploadSessionMatches(session, 'client-file', 'board_1', 'post-1'), false);
  assert.equal(
    boardUploadSessionMatches(
      { ...session, clientId: undefined },
      'client-file',
      'photo',
      'post-1',
    ),
    false,
  );
});
