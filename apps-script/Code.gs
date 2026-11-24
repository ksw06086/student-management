const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
const GOOGLE_CLIENT_ID = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
let PERFORMANCE_CONTEXT_ = null;
const SESSION_TTL_SECONDS = 21600;
const USERS_SHEET = '사용자 목록';
const LOGS_SHEET = 'logs';
const COUNSELINGS_SHEET = '상담이력';
const STUDENT_TRANSFERS_SHEET = '재학생졸업전환';
const STUDENT_TRANSFER_HEADERS = [
  'transferId',
  'studentId',
  'graduationYear',
  'state',
  'createdAt',
  'updatedAt',
  'error',
];
const CURRENT_STUDENTS_SHEET = '재학생';
const CURRENT_STUDENT_HEADERS = [
  'student_id',
  'name',
  'birth_date',
  'gender',
  'phone',
  'email',
  'affiliation',
  'enrollment_status',
  'notes',
  'created_at',
  'updated_at',
];
// 아래 두 일정 탭은 사용자가 만든 한국어 헤더를 검증합니다. SCHEDULE_FIELDS는 프론트엔드에 주는 API 필드명이며 열 순서가 서로 대응해야 합니다.
const SCHEDULES_SHEET = '스케줄';
const SCHEDULE_CATEGORIES_SHEET = '스케줄설정';
const USER_HEADERS = ['userId', 'name', 'email', 'passwordHash', 'role', 'active'];
const LOG_HEADERS = [
  'timestamp',
  'userId',
  'userName',
  'action',
  'targetYear',
  'targetStudentId',
  'targetStudentName',
  'detail',
];
const COUNSELING_HEADERS = [
  'counselingId',
  'graduationYear',
  'studentId',
  'studentName',
  'counseledAt',
  'content',
  'authorUserId',
  'authorName',
  'createdAt',
  'updatedAt',
];
const SCHEDULE_HEADERS = [
  '일정ID',
  '사용자ID',
  '작성자명',
  '일정제목',
  '카테고리ID',
  '시작일시',
  '종료일시',
  '종일여부',
  '장소',
  '상세설명',
  '반복유형',
  '반복간격',
  '반복종료일',
  '등록일시',
  '수정일시',
];
const SCHEDULE_CATEGORY_HEADERS = ['카테고리ID', '카테고리명', '색상코드', '사용여부', '정렬순서'];
const ARCHIVE_POSTS_SHEET = '자료실게시글';
const ARCHIVE_FILES_SHEET = '자료실파일';
const ARCHIVE_DRIVE_FOLDER_NAME = '졸업생관리프로그램 자료실';
const ARCHIVE_POST_HEADERS = [
  'post_id',
  'title',
  'content',
  'author_id',
  'author_name',
  'created_at',
  'updated_at',
  'view_count',
  'status',
];
const ARCHIVE_FILE_HEADERS = [
  'file_id',
  'post_id',
  'drive_file_id',
  'original_filename',
  'stored_filename',
  'file_type',
  'mime_type',
  'file_size',
  'drive_folder_id',
  'uploaded_by',
  'uploaded_at',
  'status',
];
const BOARD_IDS = ['board_1', 'board_2', 'board_3', 'photo'];
const BOARD_POSTS_SHEET = '게시판게시글';
const BOARD_FILES_SHEET = '게시판파일';
const BOARD_COMMENTS_SHEET = '게시판댓글';
const BOARD_LIKES_SHEET = '게시판댓글좋아요';
const BOARD_NOTIFICATIONS_SHEET = '게시판알림';
const BOARD_LOGS_SHEET = '게시판활동로그';
const BOARD_POST_HEADERS = [
  'post_id',
  'board_id',
  'title',
  'content',
  'author_id',
  'author_name',
  'created_at',
  'updated_at',
  'view_count',
  'status',
  'is_notice',
  'is_pinned',
  'is_important',
  'comments_locked',
  'cover_file_id',
  'deleted_at',
];
const BOARD_FILE_HEADERS = [
  'file_id',
  'board_id',
  'post_id',
  'drive_file_id',
  'original_filename',
  'stored_filename',
  'file_type',
  'mime_type',
  'file_size',
  'drive_folder_id',
  'uploaded_by',
  'uploaded_at',
  'status',
  'sort_order',
];
const BOARD_COMMENT_HEADERS = [
  'comment_id',
  'board_id',
  'post_id',
  'parent_id',
  'author_id',
  'author_name',
  'content',
  'created_at',
  'updated_at',
  'status',
  'like_count',
];
const BOARD_LIKE_HEADERS = ['like_id', 'comment_id', 'user_id', 'created_at'];
const BOARD_NOTIFICATION_HEADERS = [
  'notification_id',
  'user_id',
  'board_id',
  'post_id',
  'type',
  'message',
  'created_at',
  'read_at',
];
const BOARD_LOG_HEADERS = [
  'log_id',
  'user_id',
  'user_name',
  'action',
  'board_id',
  'post_id',
  'target_id',
  'detail',
  'created_at',
];
const BOARD_ALLOWED_FILES = {
  png: ['image/png', 'image'],
  jpg: ['image/jpeg', 'image'],
  jpeg: ['image/jpeg', 'image'],
  webp: ['image/webp', 'image'],
  gif: ['image/gif', 'image'],
  bmp: ['image/bmp', 'image'],
  pdf: ['application/pdf', 'document'],
  txt: ['text/plain', 'document'],
  csv: ['text/csv', 'document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'document'],
  xls: ['application/vnd.ms-excel', 'document'],
  doc: ['application/msword', 'document'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
  hwp: ['application/x-hwp', 'document'],
  hwpx: ['application/vnd.hancom.hwpx', 'document'],
  ppt: ['application/vnd.ms-powerpoint', 'document'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'document'],
  zip: ['application/zip', 'archive'],
};
const ARCHIVE_UPLOAD_LIMITS = { video: 500000000, other: 200000000 };
const ARCHIVE_ALLOWED = {
  png: ['image/png', 'image'],
  jpg: ['image/jpeg', 'image'],
  jpeg: ['image/jpeg', 'image'],
  webp: ['image/webp', 'image'],
  gif: ['image/gif', 'image'],
  bmp: ['image/bmp', 'image'],
  mp4: ['video/mp4', 'video'],
  mov: ['video/quicktime', 'video'],
  webm: ['video/webm', 'video'],
  avi: ['video/x-msvideo', 'video'],
  pdf: ['application/pdf', 'document'],
  txt: ['text/plain', 'document'],
  csv: ['text/csv', 'document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'document'],
  xls: ['application/vnd.ms-excel', 'document'],
  doc: ['application/msword', 'document'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
  hwp: ['application/x-hwp', 'document'],
  hwpx: ['application/vnd.hancom.hwpx', 'document'],
  ppt: ['application/vnd.ms-powerpoint', 'document'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'document'],
  zip: ['application/zip', 'archive'],
};
const SCHEDULE_FIELDS = [
  'schedule_id',
  'user_id',
  'user_name',
  'title',
  'category_id',
  'start_datetime',
  'end_datetime',
  'all_day',
  'location',
  'description',
  'repeat_type',
  'repeat_interval',
  'repeat_until',
  'created_at',
  'updated_at',
];
const DATA_HEADERS = [
  'graduationYear',
  'studentId',
  'name',
  'gender',
  'phone',
  'address',
  'status',
  'company',
  'field',
  'detail',
  'gpa',
  'updatedAt',
];

// Apps Script 웹 앱 진입점입니다. 실제 기능 선택과 권한 검사는 route_에서 처리합니다.
const VALID_STATUSES = ['취업자', '진학자', '미취업자', '군입대자', '기타'];
const GRADUATE_LOCAL_HEADERS = [
  '졸업연도',
  '학번',
  '이름',
  '성별',
  '전화번호',
  '주소',
  '취업진학상태',
  '회사명',
  '분야',
  '상세정보',
  '평점',
  '수정일시',
];
const LOCAL_COLUMN_NAMES = {
  userId: '사용자ID',
  name: '이름',
  email: '이메일',
  passwordHash: '비밀번호해시',
  role: '권한',
  active: '활성상태',
  timestamp: '기록일시',
  userName: '사용자명',
  action: '작업유형',
  targetYear: '대상연도',
  targetStudentId: '대상학번',
  targetStudentName: '대상학생이름',
  detail: '상세내용',
  counselingId: '상담ID',
  graduationYear: '졸업연도',
  studentId: '학번',
  studentName: '학생이름',
  counseledAt: '상담일시',
  content: '내용',
  authorUserId: '작성자ID',
  authorName: '작성자명',
  createdAt: '생성일시',
  updatedAt: '수정일시',
  transferId: '전환ID',
  state: '처리상태',
  error: '오류내용',
  student_id: '학번',
  birth_date: '생년월일',
  gender: '성별',
  phone: '전화번호',
  affiliation: '소속',
  enrollment_status: '재학상태',
  notes: '비고',
  created_at: '생성일시',
  updated_at: '수정일시',
  post_id: '게시글ID',
  title: '제목',
  author_id: '작성자ID',
  author_name: '작성자명',
  view_count: '조회수',
  status: '상태',
  file_id: '파일ID',
  drive_file_id: '드라이브파일ID',
  original_filename: '원본파일명',
  stored_filename: '저장파일명',
  file_type: '파일유형',
  mime_type: 'MIME유형',
  file_size: '파일크기',
  drive_folder_id: '드라이브폴더ID',
  uploaded_by: '업로드사용자ID',
  uploaded_at: '업로드일시',
  board_id: '게시판ID',
  is_notice: '공지여부',
  is_pinned: '상단고정여부',
  is_important: '중요표시여부',
  comments_locked: '댓글잠금여부',
  cover_file_id: '대표사진파일ID',
  deleted_at: '삭제일시',
  sort_order: '정렬순서',
  comment_id: '댓글ID',
  parent_id: '부모댓글ID',
  like_count: '좋아요수',
  like_id: '좋아요ID',
  user_id: '사용자ID',
  notification_id: '알림ID',
  type: '알림유형',
  message: '알림내용',
  read_at: '읽은일시',
  log_id: '로그ID',
  user_name: '사용자명',
  target_id: '대상ID',
  address: '주소',
  company: '회사명',
  field: '분야',
  gpa: '평점',
};
const SHEET_NAME_ALIASES = {
  [USERS_SHEET]: ['사용자목록'],
  [COUNSELINGS_SHEET]: ['counselings'],
  [STUDENT_TRANSFERS_SHEET]: ['student_transfers'],
  [ARCHIVE_POSTS_SHEET]: ['archive_posts'],
  [ARCHIVE_FILES_SHEET]: ['archive_files'],
  [BOARD_POSTS_SHEET]: ['board_posts'],
  [BOARD_FILES_SHEET]: ['board_files'],
  [BOARD_COMMENTS_SHEET]: ['board_comments'],
  [BOARD_LIKES_SHEET]: ['board_comment_likes'],
  [BOARD_NOTIFICATIONS_SHEET]: ['board_notifications'],
  [BOARD_LOGS_SHEET]: ['board_activity_logs'],
};
function doGet(e) {
  return respond_(route_(e && e.parameter ? e.parameter : {}));
}
function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (_) {
    return respond_({ ok: false, error: '요청 형식이 올바르지 않습니다.' });
  }
  return respond_(route_(body));
}

// action 라우터: 요청 본문에서 작업을 고르고, 데이터 접근 전에 세션과 역할을 확인합니다.
function route_(request) {
  const previousContext = PERFORMANCE_CONTEXT_;
  const startedAt = Date.now();
  PERFORMANCE_CONTEXT_ = {
    action: String(request && request.action || '').slice(0, 60),
    requestId: safePerformanceRequestId_(request && request.requestId),
    enabled: PropertiesService.getScriptProperties().getProperty('ENABLE_PERFORMANCE_LOGS') === 'true',
    spreadsheet: null,
  };
  try {
    const result = routeInternal_(request);
    recordPerformance_("apps_script.request", startedAt, { outcome: result && result.ok ? 'ok' : 'error' });
    return result;
  } finally {
    PERFORMANCE_CONTEXT_ = previousContext;
  }
}

function safePerformanceRequestId_(value) {
  const requestId = String(value || '');
  return /^[A-Za-z0-9._:-]{1,80}$/.test(requestId) ? requestId : '';
}

function routeInternal_(request) {
  try {
    if (!SPREADSHEET_ID) throw new Error('Apps Script 속성 SPREADSHEET_ID가 설정되지 않았습니다.');
    switch (request.action) {
      case 'googleLogin':
        return googleLogin_(request);
      case 'session':
        return withSession_(request, ['admin', 'user'], user => ({ ok: true, user: user }));
      case 'users':
        return withSession_(request, ['admin'], () => ({ ok: true, users: readUsers_(false) }));
      case 'saveUser':
        return withSession_(request, ['admin'], session => saveUser_(session, request.user || {}));
      case 'sheets':
        return withSession_(request, ['admin'], () => ({
          ok: true,
          sheets: listDataSheets_(),
        }));
      case 'students':
        return withSession_(request, ['admin'], session => {
          const students = readStudents_(request.year);
          appendLog_(session, '조회', request.year, '', '', '연도별 시트 조회');
          return { ok: true, year: request.year, students: students };
        });
      case 'saveStudent':
        return withSession_(request, ['admin', 'user'], session => saveStudent_(session, request));
      case 'deleteStudent':
        return withSession_(request, ['admin', 'user'], session =>
          deleteStudent_(session, request),
        );
      case 'currentStudents':
        return withSession_(request, ['admin', 'user'], () => ({
          ok: true,
          students: readCurrentStudents_(),
        }));
      case 'transferCurrentStudent':
        return withSession_(request, ['admin'], session =>
          transferCurrentStudent_(session, request),
        );
      case 'saveCurrentStudent':
        return withSession_(request, ['admin', 'user'], session =>
          saveCurrentStudent_(session, request),
        );
      case 'deleteCurrentStudent':
        return withSession_(request, ['admin', 'user'], session =>
          deleteCurrentStudent_(session, request),
        );
      case 'currentCounselings':
        return withSession_(request, ['admin', 'user'], () => ({
          ok: true,
          counselings: readCounselings_('재학생', request.studentId),
        }));
      case 'saveCurrentCounseling':
        return withSession_(request, ['admin', 'user'], session =>
          saveCounseling_(session, Object.assign({}, request, { year: '재학생' })),
        );
      case 'deleteCurrentCounseling':
        return withSession_(request, ['admin', 'user'], session =>
          deleteCounseling_(session, Object.assign({}, request, { year: '재학생' })),
        );
      case 'counselings':
        return withSession_(request, ['admin', 'user'], () => ({
          ok: true,
          counselings: readCounselings_(request.year, request.studentId),
        }));
      case 'saveCounseling':
        return withSession_(request, ['admin', 'user'], session =>
          saveCounseling_(session, request),
        );
      case 'deleteCounseling':
        return withSession_(request, ['admin', 'user'], session =>
          deleteCounseling_(session, request),
        );
      case 'scheduleCategories':
        return withSession_(request, ['admin', 'user'], () => ({
          ok: true,
          categories: readScheduleCategories_(),
        }));
      case 'schedules':
        return withSession_(request, ['admin', 'user'], session => ({
          ok: true,
          schedules: readSchedules_(session, request.fromDate, request.toDate),
        }));
      case 'saveSchedule':
        return withSession_(request, ['admin', 'user'], session => saveSchedule_(session, request));
      case 'deleteSchedule':
        return withSession_(request, ['admin', 'user'], session =>
          deleteSchedule_(session, request),
        );
      case 'statistics':
        return withSession_(request, ['admin', 'user'], () => ({
          ok: true,
          statistics: getStatistics_(),
        }));
      case 'logs':
        return withSession_(request, ['admin'], () => ({ ok: true, logs: readLogs_() }));
      case 'boardPosts':
        return withSession_(request, ['admin', 'user'], session =>
          listBoardPosts_(session, request),
        );
      case 'boardStatus':
        return withSession_(request, ['admin', 'user'], () => boardStatus_());
      case 'initializeBoards':
        return withSession_(request, ['admin'], session => initializeBoardSheets_(session));
      case 'boardPost':
        return withSession_(request, ['admin', 'user'], session =>
          readBoardPost_(session, request.boardId, request.postId),
        );
      case 'saveBoardPost':
        return withSession_(request, ['admin', 'user'], session =>
          saveBoardPost_(session, request.post || {}),
        );
      case 'publishBoardPost':
        return withSession_(request, ['admin', 'user'], session =>
          publishBoardPost_(session, request.postId),
        );
      case 'deleteBoardPost':
        return withSession_(request, ['admin', 'user'], session =>
          softDeleteBoardPost_(session, request.postId),
        );
      case 'restoreBoardPost':
        return withSession_(request, ['admin'], session =>
          restoreBoardPost_(session, request.postId),
        );
      case 'purgeBoardPostPrepare':
        return withSession_(request, ['admin'], () => prepareBoardPurge_(request.postId));
      case 'purgeBoardPostComplete':
        return withSession_(request, ['admin'], session =>
          completeBoardPurge_(session, request.postId, request.failedFileIds || []),
        );
      case 'bulkBoardPosts':
        return withSession_(request, ['admin'], session => bulkBoardPosts_(session, request));
      case 'saveBoardComment':
        return withSession_(request, ['admin', 'user'], session =>
          saveBoardComment_(session, request.comment || {}),
        );
      case 'deleteBoardComment':
        return withSession_(request, ['admin', 'user'], session =>
          deleteBoardComment_(session, request.commentId),
        );
      case 'toggleBoardCommentLike':
        return withSession_(request, ['admin', 'user'], session =>
          toggleBoardCommentLike_(session, request.commentId),
        );
      case 'setBoardCommentLock':
        return withSession_(request, ['admin'], session =>
          setBoardCommentLock_(session, request.postId, request.locked),
        );
      case 'setBoardCoverFile':
        return withSession_(request, ['admin', 'user'], session =>
          setBoardCoverFile_(session, request.postId, request.fileId),
        );
      case 'reorderBoardFiles':
        return withSession_(request, ['admin', 'user'], session =>
          reorderBoardFiles_(session, request.postId, request.fileIds || []),
        );
      case 'boardNotifications':
        return withSession_(request, ['admin', 'user'], session =>
          readBoardNotifications_(session),
        );
      case 'markBoardNotificationsRead':
        return withSession_(request, ['admin', 'user'], session =>
          markBoardNotificationsRead_(session),
        );
      case 'boardAdminStats':
        return withSession_(request, ['admin'], () => readBoardAdminStats_());
      case 'boardActivityLogs':
        return withSession_(request, ['admin'], () => readBoardActivityLogs_());
      case 'boardUploadStart':
        return boardBridge_(request, () =>
          withSession_(request, ['admin', 'user'], session => boardUploadStart_(session, request)),
        );
      case 'boardUploadComplete':
        return boardBridge_(request, () =>
          withSession_(request, ['admin', 'user'], session =>
            boardUploadComplete_(session, request),
          ),
        );
      case 'boardDownloadInfo':
        return boardBridge_(request, () =>
          withSession_(request, ['admin', 'user'], session =>
            boardDownloadInfo_(session, request.fileId),
          ),
        );
      case 'boardPreviewInfo':
        return boardBridge_(request, () =>
          withSession_(request, ['admin', 'user'], session =>
            boardPreviewInfo_(session, request.fileIds || []),
          ),
        );
      case 'boardZipInfo':
        return boardBridge_(request, () =>
          withSession_(request, ['admin', 'user'], session =>
            boardZipInfo_(session, request.boardId, request.postId),
          ),
        );
      case 'boardPrepareFileDelete':
        return boardBridge_(request, () =>
          withSession_(request, ['admin', 'user'], session =>
            prepareBoardFileDelete_(session, request.fileId),
          ),
        );
      case 'boardCompleteFileDelete':
        return boardBridge_(request, () =>
          withSession_(request, ['admin', 'user'], session =>
            completeBoardFileDelete_(session, request.fileId),
          ),
        );
      case 'archivePosts':
        return withSession_(request, ['admin', 'user'], () => ({
          ok: true,
          posts: readArchivePosts_(),
        }));
      case 'saveArchivePost':
        return withSession_(request, ['admin'], session =>
          saveArchivePost_(session, request.post || {}),
        );
      case 'publishArchivePost':
        return withSession_(request, ['admin'], session =>
          publishArchivePost_(session, request.postId),
        );
      case 'deleteArchivePost':
        return withSession_(request, ['admin'], session =>
          deleteArchivePost_(session, request.postId),
        );
      case 'archivePostView':
        return withSession_(request, ['admin', 'user'], () =>
          incrementArchiveView_(request.postId),
        );
      case 'archiveUploadStart':
        return archiveBridge_(request, () =>
          withSession_(request, ['admin'], session => archiveUploadStart_(session, request)),
        );
      case 'archiveUploadComplete':
        return archiveBridge_(request, () =>
          withSession_(request, ['admin'], session => archiveUploadComplete_(session, request)),
        );
      case 'archiveDownloadInfo':
        return archiveBridge_(request, () =>
          withSession_(request, ['admin', 'user'], () => archiveDownloadInfo_(request.fileId)),
        );
      case 'archivePrepareFileDelete':
        return archiveBridge_(request, () =>
          withSession_(request, ['admin'], session =>
            archivePrepareFileDelete_(session, request.fileId),
          ),
        );
      case 'archiveCompleteFileDelete':
        return archiveBridge_(request, () =>
          withSession_(request, ['admin'], session =>
            archiveCompleteFileDelete_(session, request.fileId),
          ),
        );
      case 'archivePreparePostDelete':
        return archiveBridge_(request, () =>
          withSession_(request, ['admin'], () => archivePreparePostDelete_(request.postId)),
        );
      case 'archiveCompletePostDelete':
        return archiveBridge_(request, () =>
          withSession_(request, ['admin'], session =>
            archiveCompletePostDelete_(session, request.postId, request.failedFileIds || []),
          ),
        );
      case 'logout':
        return logout_(request);
      default:
        throw new Error('알 수 없는 요청입니다.');
    }
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// 아이디 로그인은 실패 횟수를 제한하고, 비밀번호는 저장된 해시와 비교합니다.
function login_(request) {
  const userId = String(request.userId || '').trim();
  const attemptKey = 'login-fail:' + userId.toLowerCase();
  const cache = CacheService.getScriptCache();
  const failures = Number(cache.get(attemptKey) || 0);
  if (failures >= 5) throw new Error('로그인 시도가 너무 많습니다. 15분 후 다시 시도하세요.');
  const user = readUsers_(true).find(u => u.userId === userId && u.active);
  if (
    !user ||
    !user.passwordHash ||
    !verifyPassword_(String(request.password || ''), user.passwordHash)
  ) {
    cache.put(attemptKey, String(failures + 1), 900);
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  cache.remove(attemptKey);
  if (!user.passwordHash.startsWith('pbkdf2$')) {
    user.passwordHash = hashPassword_(String(request.password || ''));
    const sheet = getOrCreateSheet_(USERS_SHEET, USER_HEADERS);
    const rows = sheet.getDataRange().getValues();
    const rowIndex = rows.slice(1).findIndex(row => String(row[0]) === user.userId);
    if (rowIndex >= 0) sheet.getRange(rowIndex + 2, 4).setValue(user.passwordHash);
  }
  return createSession_(user);
}

// 브라우저 토큰을 Google tokeninfo로 검증한 뒤 사용자목록에 등록된 활성 계정만 허용합니다.
function googleLogin_(request) {
  if (!request.accessToken) throw new Error('Google 인증 토큰이 없습니다.');
  if (!GOOGLE_CLIENT_ID)
    throw new Error('Apps Script 속성 GOOGLE_CLIENT_ID가 설정되지 않았습니다.');
  const response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?access_token=' +
      encodeURIComponent(request.accessToken),
    { muteHttpExceptions: true },
  );
  if (response.getResponseCode() !== 200) throw new Error('Google 인증을 확인할 수 없습니다.');
  const profile = JSON.parse(response.getContentText());
  if (String(profile.email_verified).toLowerCase() !== 'true')
    throw new Error('인증된 Google 이메일이 아닙니다.');
  if (profile.aud !== GOOGLE_CLIENT_ID)
    throw new Error('등록되지 않은 Google 애플리케이션의 토큰입니다.');
  const email = String(profile.email || '').toLowerCase();
  const user = readUsers_(true).find(
    u => u.active && String(u.email || '').toLowerCase() === email,
  );
  if (!user) throw new Error('사용자목록에 등록된 Google 계정이 아닙니다.');
  return createSession_(user);
}

// 세션 토큰은 Apps Script Cache에 저장하며, authVersion으로 계정 변경 후 기존 세션을 무효화합니다.
function createSession_(user) {
  const token = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  const sessionUser = Object.assign(publicUser_(user), {
    authVersion: cache.get('auth-version:' + user.userId) || '1',
  });
  cache.put('session:' + token, JSON.stringify(sessionUser), SESSION_TTL_SECONDS);
  appendLog_(sessionUser, '로그인', '', '', '', '로그인 성공');
  return {
    ok: true,
    token: token,
    user: publicUser_(user),
    sheets: user.role === 'admin' ? listDataSheets_() : [],
  };
}

function getSession_(token) {
  // Cache 세션을 읽은 뒤 요청마다 사용자 목록 시트 전체를 다시 읽어 현재 계정 활성 상태와 역할 변경 여부를 확인합니다.
  const key = 'session:' + String(token || '');
  const raw = CacheService.getScriptCache().get(key);
  if (!raw) throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
  const session = JSON.parse(raw);
  const current = readUsers_(true).find(user => user.userId === session.userId && user.active);
  const version = CacheService.getScriptCache().get('auth-version:' + session.userId) || '1';
  if (!current || current.role !== session.role || String(session.authVersion || '1') !== version) {
    CacheService.getScriptCache().remove(key);
    throw new Error('계정이 비활성화되었거나 권한이 변경되었습니다. 다시 로그인해주세요.');
  }
  CacheService.getScriptCache().put(
    key,
    JSON.stringify(Object.assign(publicUser_(current), { authVersion: version })),
    SESSION_TTL_SECONDS,
  );
  return publicUser_(current);
}

// 보호된 API의 공통 권한 경계입니다. 허용 역할에 없으면 callback을 실행하지 않습니다.
function withSession_(request, roles, callback) {
  const authStartedAt = Date.now();
  let session;
  let authOutcome = 'error';
  try {
    session = getSession_(request.token);
    authOutcome = 'ok';
  } finally {
    recordPerformance_('auth.session_check', authStartedAt, { outcome: authOutcome });
  }
  if (roles.indexOf(session.role) < 0) throw new Error('이 작업을 수행할 권한이 없습니다.');
  const handlerStartedAt = Date.now();
  try {
    return callback(session);
  } finally {
    recordPerformance_('api.handler', handlerStartedAt);
  }
}

// 선택형 성능 기록에는 요청 ID와 작업명, 시간, 결과만 남기며 인증정보와 사용자 데이터는 기록하지 않습니다.
function recordPerformance_(operation, startedAt, details) {
  const context = PERFORMANCE_CONTEXT_;
  if (!context || !context.enabled) return;
  Logger.log(JSON.stringify(Object.assign({
    type: 'performance',
    requestId: context.requestId,
    action: context.action,
    operation: operation,
    durationMs: Math.max(0, Date.now() - startedAt),
  }, details || {})));
}

function measurePerformance_(operation, details, callback) {
  if (!PERFORMANCE_CONTEXT_ || !PERFORMANCE_CONTEXT_.enabled) return callback();
  const startedAt = Date.now();
  try {
    return callback();
  } finally {
    recordPerformance_(operation, startedAt, details);
  }
}

function fetchDriveRequest_(url, options, operation) {
  return measurePerformance_(
    'drive.' + operation,
    {},
    () => UrlFetchApp.fetch(url, options),
  );
}

function openSpreadsheet_() {
  if (PERFORMANCE_CONTEXT_ && PERFORMANCE_CONTEXT_.spreadsheet)
    return PERFORMANCE_CONTEXT_.spreadsheet;
  const spreadsheet = measurePerformance_(
    'sheets.open_spreadsheet',
    {},
    () => SpreadsheetApp.openById(SPREADSHEET_ID),
  );
  if (PERFORMANCE_CONTEXT_) PERFORMANCE_CONTEXT_.spreadsheet = spreadsheet;
  return spreadsheet;
}

function logout_(request) {
  try {
    const session = getSession_(request.token);
    appendLog_(session, '로그아웃', '', '', '', '로그아웃');
  } catch (_) {
    /* Expired sessions can still be cleared locally. */
  }
  CacheService.getScriptCache().remove('session:' + String(request.token || ''));
  return { ok: true };
}

// 사용자 목록 시트의 전체 데이터 범위를 읽어 행을 내부 user 객체로 변환합니다. 비공개 필드는 호출 목적에 따라 제외합니다.
function readUsers_(includePrivate) {
  const sheet = getOrCreateSheet_(USERS_SHEET, USER_HEADERS);
  const values = sheet.getDataRange().getValues();
  return values
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => {
      const user = Object.fromEntries(
        USER_HEADERS.map((h, i) => [h, String(row[i] == null ? '' : row[i])]),
      );
      user.active = String(user.active).toLowerCase() !== 'false' && user.active !== '0';
      return includePrivate ? user : publicUser_(user);
    });
}
function publicUser_(user) {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}

// 사용자 ID로 전체 행을 찾아 신규 행 append 또는 기존 행 전체 갱신을 수행하고, 변경 후 사용자 목록을 다시 읽어 반환합니다.
function saveUser_(session, input) {
  const userId = String(input.userId || '').trim();
  const name = String(input.name || '').trim();
  const email = String(input.email || '')
    .trim()
    .toLowerCase();
  const role = String(input.role || 'user');
  if (!userId || !name) throw new Error('아이디와 이름을 입력하세요.');
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(userId))
    throw new Error('아이디는 영문, 숫자, ., _, -만 사용해 3~40자로 입력하세요.');
  if (role !== 'admin' && role !== 'user') throw new Error('올바르지 않은 사용자 역할입니다.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Google 이메일 주소를 입력하세요.');
  if (input.password && String(input.password).length < 10)
    throw new Error('비밀번호는 10자 이상이어야 합니다.');
  const sheet = getOrCreateSheet_(USERS_SHEET, USER_HEADERS);
  const values = sheet.getDataRange().getValues();
  const existingIndex = values.slice(1).findIndex(row => String(row[0]) === userId);
  const existing = existingIndex >= 0 ? values[existingIndex + 1] : null;
  if (
    existing &&
    userId === session.userId &&
    (role !== 'admin' || String(input.active) === 'false')
  )
    throw new Error('현재 로그인한 관리자 계정의 권한 또는 활성 상태는 여기서 변경할 수 없습니다.');
  const active = input.active !== false && String(input.active).toLowerCase() !== 'false';
  if (
    email &&
    readUsers_(true).some(user => user.email.toLowerCase() === email && user.userId !== userId)
  )
    throw new Error('이미 다른 계정에 연결된 이메일입니다.');
  const passwordHash = input.password
    ? hashPassword_(String(input.password))
    : existing
      ? String(existing[3] || '')
      : '';
  const row = [userId, name, email, passwordHash, role, active];
  if (existingIndex < 0) sheet.appendRow(row);
  else sheet.getRange(existingIndex + 2, 1, 1, USER_HEADERS.length).setValues([row]);
  if (
    existing &&
    (userId !== session.userId ||
      (input.password && String(input.password)) ||
      String(existing[4]) !== role ||
      String(existing[5]).toLowerCase() !== String(active))
  ) {
    const cache = CacheService.getScriptCache();
    const versionKey = 'auth-version:' + userId;
    cache.put(versionKey, String(Number(cache.get(versionKey) || 1) + 1), 21600);
  }
  appendLog_(session, existing ? '사용자 수정' : '사용자 등록', '', userId, name, '계정 설정 변경');
  return { ok: true, users: readUsers_(false) };
}

function listDataSheets_() {
  return openSpreadsheet_()
    .getSheets()
    .map(sheet => sheet.getName())
    .filter(name => /^\d{4}$/.test(name));
}
function getDataSheet_(year) {
  const target = String(year || '').trim();
  if (!target || listDataSheets_().indexOf(target) < 0)
    throw new Error('선택한 연도 시트를 찾을 수 없습니다.');
  return getGraduateSheetInfo_(target).sheet;
}
function getGraduateSheetInfo_(year, requiredHeaders) {
  const target = String(year || '').trim();
  if (!/^\d{4}$/.test(target)) throw new Error('졸업연도는 4자리 숫자여야 합니다.');
  const sheet = schemaSheet_(target, DATA_HEADERS, false, true);
  if (!sheet)
    throw new Error(
      `${target}년 졸업생 시트가 없습니다. 시트를 먼저 만들고 다시 시도하세요. 새 시트는 자동 생성하지 않습니다.`,
    );
  const values = sheet.getDataRange().getValues();
  const headers = sheet.getSchemaHeaders();
  const required = requiredHeaders || ['graduationYear', 'studentId', 'name', 'status'];
  const missing = required.filter(header => headers.indexOf(header) < 0);
  if (!headers.length || missing.length)
    throw new Error(`${target}년 시트의 필수 컬럼이 없습니다: ${missing.join(', ') || '헤더 행'}`);
  return {
    sheet: sheet,
    headers: headers,
    values: values,
    indexes: Object.fromEntries(headers.map(header => [header, DATA_HEADERS.indexOf(header)])),
  };
}
function getOrCreateGraduateYearSheetInfo_(year) {
  const book = openSpreadsheet_();
  let sheet = book.getSheetByName(year);
  if (!sheet) {
    const years = listDataSheets_().sort((a, b) => Number(b) - Number(a));
    const template = years.length ? book.getSheetByName(years[0]) : null;
    try {
      if (template) {
        const copied = template.copyTo(book).setName(year);
        // clearContents keeps the template's formatting and data validation while removing copied student rows.
        copied.clearContents();
        copied.getRange(1, 1, 1, GRADUATE_LOCAL_HEADERS.length).setValues([GRADUATE_LOCAL_HEADERS]);
        sheet = schemaSheet_(year, DATA_HEADERS, false);
      } else {
        // DATA_HEADERS is the project's canonical graduate schema when no annual sheet exists yet.
        const created = book.insertSheet(year);
        created
          .getRange(1, 1, 1, GRADUATE_LOCAL_HEADERS.length)
          .setValues([GRADUATE_LOCAL_HEADERS]);
        sheet = schemaSheet_(year, DATA_HEADERS, false);
      }
    } catch (error) {
      throw new Error(
        `${year}년도 졸업생 시트를 생성하지 못했습니다. 다시 시도해 주세요. ${error.message || String(error)}`,
      );
    }
  }
  return getGraduateSheetInfo_(year, ['graduationYear', 'studentId', 'name', 'status', 'detail']);
}
// 지정한 연도별 졸업생 시트의 데이터 범위를 한 번 읽고 헤더 매핑을 적용해 모든 학생 행을 API 객체로 변환합니다.
function readStudents_(year) {
  const info = getGraduateSheetInfo_(year);
  return info.values
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row =>
      Object.fromEntries(
        DATA_HEADERS.map(header => [
          header,
          formatSheetDateForApi_(
            header,
            row[info.indexes[header]],
            header === 'birth_date',
          ),
        ]),
      ),
    );
}

// 재학생은 졸업생 연도 시트와 분리된 고정 시트를 이름 기반으로 매핑합니다.
function getCurrentStudentsSheet_() {
  const sheet = schemaSheet_(
    CURRENT_STUDENTS_SHEET,
    CURRENT_STUDENT_HEADERS,
    false,
    false,
    false,
    true,
  );
  if (!sheet) throw new Error('Google Sheets에 재학생 시트가 없습니다.');
  return sheet;
}
// 재학생 시트 전체 데이터 범위를 읽어 한글 헤더 매핑이 적용된 내부 필드 객체 목록으로 변환합니다.
function readCurrentStudents_() {
  const sheet = getCurrentStudentsSheet_();
  const values = sheet.getDataRange().getValues();
  return values
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row =>
      Object.fromEntries(
        CURRENT_STUDENT_HEADERS.map((header, index) => [
          header,
          formatSheetDateForApi_(
            header,
            row[index],
            header === 'birth_date',
          ),
        ]),
      ),
    );
}
function formatPreservedDate_(value, dateOnly, sourceTimeZone) {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return String(value);
    return formatKoreanDateObject_(value, dateOnly);
  }
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  let localizedDate = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (!localizedDate) localizedDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (localizedDate) {
    const yearFirst = text.split('/')[0].length === 4;
    const year = Number(localizedDate[yearFirst ? 1 : 3]);
    const month = Number(localizedDate[yearFirst ? 2 : 1]);
    const day = Number(localizedDate[yearFirst ? 3 : 2]);
    if (!isValidCalendarDate_(year, month, day)) return text;
    return formatKoreanDateObject_(new Date(Date.UTC(year, month - 1, day, 12)), true);
  }
  localizedDate = /^(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
    text,
  );
  if (localizedDate) {
    const [, yearText, monthText, dayText, hourText, minuteText, secondText] = localizedDate;
    if (!isValidCalendarDate_(Number(yearText), Number(monthText), Number(dayText))) return text;
    if (!hourText)
      return formatKoreanDateObject_(
        new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText), 12)),
        true,
      );
    try {
      return formatKoreanDateObject_(
        Utilities.parseDate(
          `${yearText}-${monthText.padStart(2, '0')}-${dayText.padStart(2, '0')} ${hourText}:${minuteText}:${(secondText || '00').padStart(2, '0')}`,
          'Asia/Seoul',
          'yyyy-MM-dd HH:mm:ss',
        ),
        dateOnly,
      );
    } catch (_) {
      return text;
    }
  }
  localizedDate = /^(?:[A-Za-z]{3},?\s+)?(?:(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})|([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4}))$/.exec(
    text,
  );
  if (localizedDate) {
    const months = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };
    const [, dayFirst, dayFirstMonth, dayFirstYear, monthFirst, monthFirstDay, monthFirstYear] =
      localizedDate;
    const year = Number(dayFirstYear || monthFirstYear);
    const month = months[(dayFirstMonth || monthFirst).toLowerCase()];
    const day = Number(dayFirst || monthFirstDay);
    if (!month || !isValidCalendarDate_(year, month, day)) return text;
    return formatKoreanDateObject_(new Date(Date.UTC(year, month - 1, day, 12)), true);
  }
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(text);
  const separated = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const dateParts = compact || separated;
  if (dateParts) {
    const year = Number(dateParts[1]),
      month = Number(dateParts[2]),
      day = Number(dateParts[3]);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    )
      return text;
    return formatKoreanDateObject_(new Date(Date.UTC(year, month - 1, day, 12)), true);
  }
  const displayDate =
    /^(\d{4})\.(\d{2})\.(\d{2})\(([월화수목금토일])\)(?: (\d{2}):(\d{2}):(\d{2}))?$/.exec(text);
  if (displayDate) {
    const [, year, month, day, , hour, minute, second] = displayDate;
    if (
      !isValidCalendarDate_(Number(year), Number(month), Number(day)) ||
      (hour && (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59))
    )
      return text;
    if (!hour) return formatPreservedDate_(`${year}-${month}-${day}`, true, sourceTimeZone);
    try {
      return formatKoreanDateObject_(
        Utilities.parseDate(
          `${year}-${month}-${day} ${hour}:${minute}:${second}`,
          'Asia/Seoul',
          'yyyy-MM-dd HH:mm:ss',
        ),
        dateOnly,
      );
    } catch (_) {
      return text;
    }
  }
  const isoDateTime =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/i;
  const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
  const englishDateTime =
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+GMT[+-]\d{4}(?:\s+\([^)]*\))?$/i;
  const scriptDateTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text);
  if (
    !isoDateTime.test(text) &&
    !localDateTime.test(text) &&
    !englishDateTime.test(text) &&
    !scriptDateTime
  )
    return text;
  const localParts = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(text);
  if (
    localParts &&
    (!isValidCalendarDate_(Number(localParts[1]), Number(localParts[2]), Number(localParts[3])) ||
      Number(localParts[4]) > 23 ||
      Number(localParts[5]) > 59 ||
      Number(localParts[6] || 0) > 59)
  )
    return text;
  let date;
  try {
    if (scriptDateTime)
      date = Utilities.parseDate(text, sourceTimeZone || 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    else if (localDateTime.test(text))
      date = Utilities.parseDate(
        text,
        'Asia/Seoul',
        text.length === 16 ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd'T'HH:mm:ss",
      );
    else date = new Date(text.replace(/\s+\([^)]*\)$/, ''));
  } catch (_) {
    return text;
  }
  if (isNaN(date.getTime())) return text;
  return formatKoreanDateObject_(date, dateOnly);
}
function isValidCalendarDate_(year, month, day) {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
function formatKoreanDateObject_(date, dateOnly) {
  const formattedDate = Utilities.formatDate(date, 'Asia/Seoul', 'yyyy.MM.dd');
  const weekdayNumber = Number(Utilities.formatDate(date, 'Asia/Seoul', 'u')) % 7;
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][weekdayNumber];
  return dateOnly
    ? `${formattedDate}(${weekday})`
    : `${formattedDate}(${weekday}) ${Utilities.formatDate(date, 'Asia/Seoul', 'HH:mm:ss')}`;
}
function formatSheetDateForApi_(header, value, dateOnly) {
  if (value == null || value === '') return '';
  const dateHeaders = [
    'updatedAt',
    'created_at',
    'updated_at',
    'counseledAt',
    'createdAt',
    'updatedAt',
    'timestamp',
    'uploaded_at',
    'deleted_at',
    'read_at',
  ];
  if (header !== 'birth_date' && !dateHeaders.includes(header))
    return String(value);
  if (value instanceof Date)
    return isNaN(value.getTime()) ? String(value) : formatKoreanDateObject_(value, dateOnly);
  if (typeof value === 'number' && value >= 20000 && value < 100000) {
    const wholeDays = Math.floor(value);
    const civilDate = new Date(Date.UTC(1899, 11, 30 + wholeDays));
    if (value - wholeDays < 0.0000001) return formatKoreanDateObject_(civilDate, true);
    const seconds = Math.round((value - wholeDays) * 24 * 60 * 60);
    const localDate = Utilities.parseDate(
      `${Utilities.formatDate(civilDate, 'UTC', 'yyyy-MM-dd')} ${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
      'Asia/Seoul',
      'yyyy-MM-dd HH:mm:ss',
    );
    return formatKoreanDateObject_(localDate, dateOnly);
  }
  if (typeof value === 'number' && (String(Math.trunc(value)).length === 10 || String(Math.trunc(value)).length === 13)) {
    const timestamp = String(Math.trunc(value)).length === 10 ? value * 1000 : value;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? String(value) : formatKoreanDateObject_(date, dateOnly);
  }
  return formatPreservedDate_(value, dateOnly, 'Asia/Seoul');
}
function counselingDateSortValue_(value) {
  const formatted = formatPreservedDate_(value, false, 'Asia/Seoul');
  const match = /^(\d{4})\.(\d{2})\.(\d{2})\([월화수목금토일]\)(?: (\d{2}:\d{2}:\d{2}))?$/.exec(
    formatted,
  );
  if (!match) return 0;
  try {
    const source = match[4]
      ? `${match[1]}.${match[2]}.${match[3]} ${match[4]}`
      : `${match[1]}.${match[2]}.${match[3]}`;
    return Utilities.parseDate(
      source,
      'Asia/Seoul',
      match[4] ? 'yyyy.MM.dd HH:mm:ss' : 'yyyy.MM.dd',
    ).getTime();
  } catch (_) {
    return 0;
  }
}
// 재학생 시트 전체를 읽어 학번 중복 및 수정 대상을 선형 검색한 뒤 해당 행 갱신 또는 append를 수행합니다.
function saveCurrentStudent_(session, request) {
  const input = request.student || {};
  const studentId = String(input.student_id || '').trim();
  const name = String(input.name || '').trim();
  if (!studentId || !name) throw new Error('학생 ID와 이름을 입력하세요.');
  const sheet = getCurrentStudentsSheet_();
  const rows = sheet.getDataRange().getValues();
  const index = rows.slice(1).findIndex(row => String(row[0]).trim() === studentId);
  const existing = index < 0 ? null : rows[index + 1];
  if (request.create && existing) throw new Error('이미 등록된 학생 ID입니다.');
  if (!request.create && !existing) throw new Error('수정할 재학생을 찾을 수 없습니다.');
  const now = now_();
  const record = CURRENT_STUDENT_HEADERS.map((header, column) => {
    if (header === 'created_at') return existing ? String(existing[column] || '') : now;
    if (header === 'updated_at') return now;
    return String(input[header] == null ? '' : input[header]).trim();
  });
  if (existing) sheet.getRange(index + 2, 1, 1, CURRENT_STUDENT_HEADERS.length).setValues([record]);
  else sheet.appendRow(record);
  appendLog_(
    session,
    existing ? '재학생 수정' : '재학생 등록',
    '재학생',
    studentId,
    name,
    existing ? '재학생 정보 수정' : '재학생 정보 등록',
  );
  return {
    ok: true,
    student: Object.fromEntries(CURRENT_STUDENT_HEADERS.map((header, i) => [header, record[i]])),
  };
}

// 재학생 시트 전체에서 학번 행 번호를 찾은 뒤 해당 행을 삭제하고 작업 로그를 추가합니다.
function deleteCurrentStudent_(session, request) {
  const studentId = String(request.studentId || '').trim();
  if (!studentId) throw new Error('삭제할 학번이 없습니다.');
  const sheet = getCurrentStudentsSheet_();
  const rows = sheet.getDataRange().getValues();
  const index = rows
    .slice(1)
    .findIndex(row => String(row[0]).trim() === studentId);
  if (index < 0) throw new Error('재학생을 찾을 수 없습니다.');

  const student = rows[index + 1];
  appendLog_(
    session,
    '재학생 삭제',
    '재학생',
    studentId,
    student[1],
    '재학생 정보 삭제',
  );
  sheet.deleteRow(index + 2);
  return { ok: true };
}

// 연도 시트의 학생 CRUD. 컬럼 순서는 DATA_HEADERS와 시트 1행이 일치해야 합니다.
// 재학생·졸업연도·전환기록·상담 시트를 순차 확인하고 잠금 안에서 중복 검사, 복사 검증, 연결 갱신, 원본 삭제를 수행합니다.
function transferCurrentStudent_(session, request) {
  const lock = LockService.getScriptLock();
  const requestStartedAt = new Date();
  const requestStartedAtIso = requestStartedAt.toISOString();
  if (!lock.tryLock(10000))
    throw new Error('다른 전환 작업이 진행 중입니다. 잠시 후 다시 시도하세요.');
  try {
    const studentId = String(request.studentId || '').trim();
    const year = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy');
    const status = '미취업자';
    if (!studentId) throw new Error('학번이 비어 있어 졸업생 전환을 진행할 수 없습니다.');
    if (!/^\d{4}$/.test(year))
      throw new Error('한국 표준시 기준 현재 연도를 확인할 수 없어 전환을 중단했습니다.');

    const sourceSheet = getCurrentStudentsSheet_();
    const currentRows = sourceSheet.getDataRange().getValues();
    const sourceIndex = currentRows.slice(1).findIndex(row => String(row[0]).trim() === studentId);
    const existingYear = listDataSheets_()
      .filter(otherYear => otherYear !== year)
      .sort((a, b) => Number(a) - Number(b))
      .find(otherYear => {
        const other = getGraduateSheetInfo_(otherYear);
        return other.values
          .slice(1)
          .some(
            row =>
              String(
                row[other.indexes.studentId] == null ? '' : row[other.indexes.studentId],
              ).trim() === studentId,
          );
      });
    if (existingYear)
      throw new Error(
        `이미 등록된 학번입니다. 졸업생 전환을 진행할 수 없습니다. 학번 ${studentId}은 ${existingYear}년도 졸업생 명단에 이미 등록되어 있습니다.`,
      );

    const targetInfo = getOrCreateGraduateYearSheetInfo_(year);
    const targetSheet = targetInfo.sheet;
    const targetRows = targetSheet.getDataRange().getValues();
    const studentIdColumn = targetInfo.indexes.studentId;
    const nameColumn = targetInfo.indexes.name;
    const statusColumn = targetInfo.indexes.status;
    let targetIndex = targetRows
      .slice(1)
      .findIndex(row => String(row[studentIdColumn]).trim() === studentId);

    const transferSheet = getOrCreateSheet_(STUDENT_TRANSFERS_SHEET, STUDENT_TRANSFER_HEADERS);
    const ledgerRows = transferSheet.getDataRange().getValues();
    let ledgerIndex = -1;
    for (let i = 0; i < ledgerRows.length - 1; i++)
      if (String(ledgerRows[i + 1][1]) === studentId && String(ledgerRows[i + 1][2]) === year)
        ledgerIndex = i;

    if (ledgerIndex >= 0 && String(ledgerRows[ledgerIndex + 1][3]) === 'completed') {
      if (sourceIndex < 0 && targetIndex >= 0)
        return { ok: true, alreadyCompleted: true, studentId: studentId, graduationYear: year };
      throw new Error(
        '이 학생의 전환 완료 기록과 시트 데이터가 일치하지 않습니다. 관리자 확인이 필요합니다.',
      );
    }
    if (ledgerIndex >= 0 && sourceIndex < 0 && targetIndex >= 0) {
      const previousState = String(ledgerRows[ledgerIndex + 1][3]);
      if (!['graduate_saved', 'counselings_moved', 'recovery_required'].includes(previousState))
        throw new Error(
          '전환 장부에서 졸업생 저장을 확인할 수 없습니다. 관리자 확인이 필요합니다.',
        );
      const counselingSheet = getOrCreateSheet_(COUNSELINGS_SHEET, COUNSELING_HEADERS);
      const counselingRows = counselingSheet.getDataRange().getValues();
      for (let i = 1; i < counselingRows.length; i++)
        if (String(counselingRows[i][2]) === studentId && String(counselingRows[i][1]) === '재학생')
          counselingSheet.getRange(i + 1, 2).setValue(year);
      const ledgerRow = ledgerIndex + 2;
      transferSheet.getRange(ledgerRow, 4).setValue('completed');
      transferSheet
        .getRange(ledgerRow, 6, 1, 2)
        .setValues([[nowSeoul_(), '재시도에서 졸업생 데이터 확인 후 완료 처리']]);
      return {
        ok: true,
        alreadyCompleted: true,
        studentId: studentId,
        graduationYear: year,
        recoveredAsCompleted: true,
      };
    }
    if (sourceIndex < 0)
      throw new Error(
        '재학생 명단에서 전환할 학생을 찾을 수 없습니다. 명단을 새로고침한 뒤 다시 시도하세요.',
      );
    if (targetIndex >= 0 && ledgerIndex < 0)
      throw new Error(
        `이미 등록된 학번입니다. 학번 ${studentId}은 ${year}년도 졸업생 명단에 이미 등록되어 있습니다.`,
      );

    const sourceRow = currentRows[sourceIndex + 1];
    const student = Object.fromEntries(
      CURRENT_STUDENT_HEADERS.map((header, index) => [
        header,
        String(sourceRow[index] == null ? '' : sourceRow[index]).trim(),
      ]),
    );
    const recordedTransferAt = ledgerIndex >= 0 ? String(ledgerRows[ledgerIndex + 1][4] || '') : '';
    const transferAt = recordedTransferAt || requestStartedAt;
    const transferDate = formatPreservedDate_(
      transferAt,
      false,
      recordedTransferAt && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(recordedTransferAt)
        ? 'Asia/Seoul'
        : undefined,
    );
    const preserved = [
      ['생년월일', formatPreservedDate_(student.birth_date, true)],
      ['이메일', student.email],
      ['소속', student.affiliation],
      ['재학 상태', student.enrollment_status],
      ['참고사항', student.notes],
      ['재학생 최초 등록일', formatPreservedDate_(student.created_at, false)],
      ['재학생 졸업 전환일', transferDate],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`);
    const detail = preserved.length ? `[재학생 전환 시 보존 정보]\n${preserved.join('\n')}` : '';
    const graduateRecord = {
      graduationYear: year,
      studentId: studentId,
      name: student.name,
      gender: student.gender,
      phone: student.phone,
      address: '',
      status: status,
      company: '',
      field: '',
      detail: detail,
      gpa: '',
      updatedAt: nowSeoul_(),
    };
    const graduateRow = DATA_HEADERS.map(header =>
      Object.prototype.hasOwnProperty.call(graduateRecord, header) ? graduateRecord[header] : '',
    );
    if (ledgerIndex < 0) {
      transferSheet.appendRow([
        Utilities.getUuid(),
        studentId,
        year,
        'prepared',
        requestStartedAtIso,
        requestStartedAtIso,
        '',
      ]);
      ledgerIndex = transferSheet.getLastRow() - 2;
    } else if (String(ledgerRows[ledgerIndex + 1][3]) === 'rolled_back') {
      transferSheet.getRange(ledgerIndex + 2, 4).setValue('prepared');
    }
    const ledgerRowNumber = ledgerIndex + 2;
    const writeState = (state, errorText = '') => {
      transferSheet.getRange(ledgerRowNumber, 4).setValue(state);
      transferSheet.getRange(ledgerRowNumber, 6, 1, 2).setValues([[nowSeoul_(), errorText]]);
    };
    let destinationCreatedOrOwned = false;
    let sourceRemoved = false;
    try {
      if (targetIndex < 0) {
        destinationCreatedOrOwned = true;
        targetSheet.appendRow(graduateRow);
      } else {
        const existing = targetRows[targetIndex + 1];
        const priorState = String(ledgerRows[ledgerIndex + 1]?.[3] || 'prepared');
        const cell = (row, header) =>
          targetInfo.indexes[header] == null
            ? ''
            : String(
                row[targetInfo.indexes[header]] == null ? '' : row[targetInfo.indexes[header]],
              );
        const matchesTransfer =
          cell(existing, 'name') === student.name &&
          cell(existing, 'gender') === student.gender &&
          cell(existing, 'phone') === student.phone &&
          cell(existing, 'status') === status &&
          (targetInfo.indexes.detail == null || cell(existing, 'detail') === detail);
        if (
          !matchesTransfer ||
          !['prepared', 'graduate_saved', 'counselings_moved', 'recovery_required'].includes(
            priorState,
          )
        )
          throw new Error('대상 연도의 기존 졸업생 자료를 동일 전환 건으로 확인할 수 없습니다.');
        destinationCreatedOrOwned = true;
      }
      writeState('graduate_saved');
      const savedGraduate = targetSheet
        .getDataRange()
        .getValues()
        .slice(1)
        .find(row => String(row[studentIdColumn]).trim() === studentId);
      if (
        !savedGraduate ||
        String(savedGraduate[nameColumn]) !== student.name ||
        String(savedGraduate[statusColumn]) !== status
      )
        throw new Error('졸업생 시트 저장 결과를 확인하지 못했습니다.');

      const counselingSheet = getOrCreateSheet_(COUNSELINGS_SHEET, COUNSELING_HEADERS);
      const counselingRows = counselingSheet.getDataRange().getValues();
      const previousLinkedCount = counselingRows
        .slice(1)
        .filter(
          row =>
            String(row[2]) === studentId &&
            (String(row[1]) === '재학생' || String(row[1]) === year),
        ).length;
      for (let i = 1; i < counselingRows.length; i++)
        if (
          String(counselingRows[i][2]) === studentId &&
          (String(counselingRows[i][1]) === '재학생' || String(counselingRows[i][1]) === year)
        )
          counselingSheet.getRange(i + 1, 2).setValue(year);
      writeState('counselings_moved');
      const movedCount = counselingSheet
        .getDataRange()
        .getValues()
        .slice(1)
        .filter(row => String(row[2]) === studentId && String(row[1]) === year).length;
      if (movedCount < previousLinkedCount)
        throw new Error('상담 이력 연결 상태를 확인하지 못했습니다.');

      const latestCurrentRows = sourceSheet.getDataRange().getValues();
      const latestSourceIndex = latestCurrentRows
        .slice(1)
        .findIndex(row => String(row[0]).trim() === studentId);
      if (latestSourceIndex < 0)
        throw new Error('원본 재학생 데이터를 찾지 못해 전환을 완료할 수 없습니다.');
      sourceSheet.deleteRow(latestSourceIndex + 2);
      sourceRemoved = true;
      writeState('completed');
      appendLog_(
        session,
        '재학생 졸업생 전환',
        year,
        studentId,
        student.name,
        '졸업생 저장 및 상담 이력 연결을 확인한 뒤 재학생 원본 제거',
      );
      return { ok: true, studentId: studentId, graduationYear: year };
    } catch (error) {
      const sourceStillExists = sourceSheet
        .getDataRange()
        .getValues()
        .slice(1)
        .some(row => String(row[0]).trim() === studentId);
      if (sourceRemoved || !sourceStillExists) {
        const verifiedDestination = targetSheet
          .getDataRange()
          .getValues()
          .slice(1)
          .some(
            row =>
              String(row[studentIdColumn]).trim() === studentId &&
              String(row[nameColumn]) === student.name &&
              String(row[statusColumn]) === status,
          );
        if (verifiedDestination) {
          writeState(
            'completed',
            '원본 삭제 후 응답 처리 오류: ' + (error.message || String(error)),
          );
          return {
            ok: true,
            studentId: studentId,
            graduationYear: year,
            recoveredAsCompleted: true,
          };
        }
      }
      let rollbackError = '';
      try {
        if (!sourceStillExists) sourceSheet.appendRow(sourceRow);
        const counselingSheet = getOrCreateSheet_(COUNSELINGS_SHEET, COUNSELING_HEADERS);
        const values = counselingSheet.getDataRange().getValues();
        for (let i = 1; i < values.length; i++)
          if (String(values[i][2]) === studentId && String(values[i][1]) === year)
            counselingSheet.getRange(i + 1, 2).setValue('재학생');
        if (destinationCreatedOrOwned) {
          const graduates = targetSheet.getDataRange().getValues();
          const detailColumn = targetInfo.indexes.detail;
          const ownedIndex = graduates
            .slice(1)
            .findIndex(
              row =>
                String(row[studentIdColumn]).trim() === studentId &&
                String(row[nameColumn]) === student.name &&
                (detailColumn == null || String(row[detailColumn]) === detail),
            );
          if (ownedIndex >= 0) targetSheet.deleteRow(ownedIndex + 2);
        }
        writeState('rolled_back', error.message || String(error));
      } catch (rollback) {
        rollbackError = rollback.message || String(rollback);
        writeState(
          'recovery_required',
          `${error.message || String(error)} | 복구 실패: ${rollbackError}`,
        );
      }
      throw new Error(
        rollbackError
          ? `전환이 중단되어 자동 복구가 끝나지 않았습니다. 재학생 원본은 유지했습니다. 관리자 재처리가 필요합니다: ${rollbackError}`
          : `전환이 취소되어 재학생 원본은 유지했습니다. ${error.message || String(error)}`,
      );
    }
  } finally {
    lock.releaseLock();
  }
}

// 대상 연도 시트에서 학번 행을 검색해 학생 정보를 신규 추가하거나 기존 행의 데이터 컬럼을 갱신합니다.
function saveStudent_(session, request) {
  const year = String(request.year || '').trim();
  const input = request.student || {};
  const studentId = String(input.studentId || '').trim();
  const name = String(input.name || '').trim();
  if (!studentId || !name) throw new Error('학번과 이름을 입력하세요.');
  const student = {};
  DATA_HEADERS.forEach(header => {
    student[header] = String(input[header] == null ? '' : input[header]).trim();
  });
  student.graduationYear = year;
  if (student.gpa && (!/^\d{1,2}(\.\d{1,2})?$/.test(student.gpa) || Number(student.gpa) > 4.5))
    throw new Error('평점은 0~4.5 범위에서 입력하세요.');
  const info = getGraduateSheetInfo_(year);
  const sheet = info.sheet;
  const values = info.values;
  const index = values
    .slice(1)
    .findIndex(row => String(row[info.indexes.studentId]).trim() === studentId);
  const isCreate = index < 0;
  const existingStatus = isCreate ? '' : String(values[index + 1][info.indexes.status] || '');
  const preservesLegacyStatus =
    !isCreate &&
    student.status === existingStatus &&
    ['조사자', '미조사자', '국비교육자'].includes(existingStatus);
  if (student.status && VALID_STATUSES.indexOf(student.status) < 0 && !preservesLegacyStatus)
    throw new Error('올바른 졸업 후 상태를 선택하세요.');
  if (request.create && !isCreate)
    throw new Error('이미 등록된 학번입니다. 기존 학생을 선택해 수정하세요.');
  if (!request.create && isCreate)
    throw new Error('수정할 학생을 찾을 수 없습니다. 목록을 새로고침하세요.');
  if (isCreate) {
    student.updatedAt = now_();
    sheet.appendRow(
      DATA_HEADERS.map(header =>
        Object.prototype.hasOwnProperty.call(student, header) ? student[header] : '',
      ),
    );
  } else {
    student.updatedAt = now_();
    const updatedRow = [...values[index + 1]];
    DATA_HEADERS.forEach(header => {
      if (info.indexes[header] != null) updatedRow[info.indexes[header]] = student[header] || '';
    });
    sheet
      .getRange(index + 2, 1, 1, DATA_HEADERS.length)
      .setValues([updatedRow.slice(0, DATA_HEADERS.length)]);
  }
  appendLog_(
    session,
    isCreate ? '학생 등록' : '학생 수정',
    year,
    studentId,
    name,
    isCreate ? '학생 정보 등록' : '학생 정보 수정',
  );
  return { ok: true, student: student };
}

// 대상 연도 시트 전체에서 학번을 찾아 해당 학생 행을 삭제하고 변경 이력을 로그 시트에 추가합니다.
function deleteStudent_(session, request) {
  const year = String(request.year || '').trim();
  const studentId = String(request.studentId || '').trim();
  if (!studentId) throw new Error('삭제할 학번이 없습니다.');
  const info = getGraduateSheetInfo_(year);
  const sheet = info.sheet;
  const values = info.values;
  const index = values
    .slice(1)
    .findIndex(row => String(row[info.indexes.studentId]).trim() === studentId);
  if (index < 0) throw new Error('학생을 찾을 수 없습니다.');
  const row = values[index + 1];
  appendLog_(
    session,
    '학생 삭제',
    year,
    row[info.indexes.studentId],
    row[info.indexes.name],
    '학생 정보 삭제',
  );
  sheet.deleteRow(index + 2);
  return { ok: true };
}

// 상태별 통계는 현재 유효한 상태 목록만 집계합니다. 과거 미지원 상태는 합계에는 포함되지만 상태 카운트에는 포함되지 않습니다.
// 연도 목록을 가져온 뒤 각 졸업연도 시트 전체를 순서대로 읽어 학생별 상태 통계를 집계합니다.
function getStatistics_() {
  return listDataSheets_()
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .map(year => {
      const rows = readStudents_(year);
      const counts = Object.fromEntries(VALID_STATUSES.map(status => [status, 0]));
      rows.forEach(student => {
        if (Object.prototype.hasOwnProperty.call(counts, student.status)) counts[student.status]++;
      });
      return { year: year, total: rows.length, counts: counts };
    });
}

function findStudent_(year, studentId) {
  if (String(year || '').trim() === '재학생') {
    const student = readCurrentStudents_().find(
      row => row.student_id === String(studentId || '').trim(),
    );
    if (!student) throw new Error('재학생 명단에서 학생을 찾을 수 없습니다.');
    return { studentId: student.student_id, name: student.name };
  }
  const student = readStudents_(year).find(row => row.studentId === String(studentId || '').trim());
  if (!student) throw new Error('선택한 연도의 학생 명단에서 학생을 찾을 수 없습니다.');
  return student;
}
// 상담은 학생 데이터와 분리된 상담이력 시트 전체를 읽은 뒤 메모리에서 연도·학번으로 걸러 반환합니다.
function readCounselings_(year, studentId) {
  const targetYear = String(year || '').trim();
  const targetStudentId = String(studentId || '').trim();
  if (!targetYear || !targetStudentId) throw new Error('연도와 학생을 선택하세요.');
  findStudent_(targetYear, targetStudentId);
  return getOrCreateSheet_(COUNSELINGS_SHEET, COUNSELING_HEADERS)
    .getDataRange()
    .getValues()
    .slice(1)
    .filter(
      row =>
        row.some(Boolean) && String(row[1]) === targetYear && String(row[2]) === targetStudentId,
    )
    .map(row =>
      Object.fromEntries(
        COUNSELING_HEADERS.map((header, i) => [
          header,
          header === 'counseledAt'
            ? formatPreservedDate_(row[i], true, 'Asia/Seoul')
            : formatSheetDateForApi_(header, row[i]),
        ]),
      ),
    )
    .sort(
      (a, b) =>
        counselingDateSortValue_(b.counseledAt) - counselingDateSortValue_(a.counseledAt) ||
        b.createdAt.localeCompare(a.createdAt),
    );
}
// 상담이력 전체에서 상담ID·연도·학번을 찾아 기존 행을 갱신하거나 새 행을 추가하고 작업 로그를 기록합니다.
function saveCounseling_(session, request) {
  const year = String(request.year || '').trim();
  const studentId = String(request.studentId || '').trim();
  const input = request.counseling || {};
  const counselingId = String(input.counselingId || '').trim();
  const counseledAt = String(input.counseledAt || '').trim();
  const content = String(input.content || '').trim();
  const storedCounseledAt = formatPreservedDate_(counseledAt, true, 'Asia/Seoul');
  if (!/^\d{4}\.\d{2}\.\d{2}\([월화수목금토일]\)$/.test(storedCounseledAt))
    throw new Error('상담 날짜를 올바르게 입력하세요.');
  if (!content) throw new Error('상담 내용을 입력하세요.');
  const student = findStudent_(year, studentId);
  const sheet = getOrCreateSheet_(COUNSELINGS_SHEET, COUNSELING_HEADERS);
  const values = sheet.getDataRange().getValues();
  const index = counselingId
    ? values
        .slice(1)
        .findIndex(
          row =>
            String(row[0]) === counselingId &&
            String(row[1]) === year &&
            String(row[2]) === studentId,
        )
    : -1;
  if (counselingId && index < 0) throw new Error('수정할 상담 기록을 찾을 수 없습니다.');
  const now = nowSeoul_();
  const existing = index >= 0 ? values[index + 1] : null;
  const record = [
    existing ? String(existing[0]) : Utilities.getUuid(),
    year,
    studentId,
    student.name,
    storedCounseledAt,
    content,
    existing ? String(existing[6]) : session.userId,
    existing ? String(existing[7]) : session.name,
    existing ? String(existing[8]) : now,
    now,
  ];
  if (existing) sheet.getRange(index + 2, 1, 1, COUNSELING_HEADERS.length).setValues([record]);
  else sheet.appendRow(record);
  appendLog_(
    session,
    existing ? '상담 기록 수정' : '상담 기록 등록',
    year,
    studentId,
    student.name,
    existing ? '학생 상담 내용 수정' : '학생 상담 내용 등록',
  );
  return {
    ok: true,
    counseling: Object.fromEntries(COUNSELING_HEADERS.map((header, i) => [header, record[i]])),
  };
}
// 상담이력 전체에서 상담ID·연도·학번 조합의 행을 찾아 삭제하고 작업 로그를 기록합니다.
function deleteCounseling_(session, request) {
  const year = String(request.year || '').trim();
  const studentId = String(request.studentId || '').trim();
  const counselingId = String(request.counselingId || '').trim();
  const student = findStudent_(year, studentId);
  const sheet = getOrCreateSheet_(COUNSELINGS_SHEET, COUNSELING_HEADERS);
  const index = sheet
    .getDataRange()
    .getValues()
    .slice(1)
    .findIndex(
      row =>
        String(row[0]) === counselingId && String(row[1]) === year && String(row[2]) === studentId,
    );
  if (!counselingId || index < 0) throw new Error('삭제할 상담 기록을 찾을 수 없습니다.');
  sheet.deleteRow(index + 2);
  appendLog_(session, '상담 기록 삭제', year, studentId, student.name, '학생 상담 기록 삭제');
  return { ok: true };
}

// 일정 시트는 사용자가 만든 구조를 유지합니다. 탭 이름과 첫 행 헤더가 다르면 쓰기 전에 오류를 반환합니다.
function getRequiredScheduleSheet_(name, headers) {
  const sheet = openSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error(name + ' 시트가 없습니다. Google Sheets에 안내된 탭을 추가하세요.');
  const actual = sheet
    .getRange(1, 1, 1, headers.length)
    .getValues()[0]
    .map(value => String(value || '').trim());
  if (headers.some((header, index) => actual[index] !== header))
    throw new Error(name + ' 시트의 첫 행 컬럼명이 안내된 구조와 다릅니다.');
  return sheet;
}
// 스케줄설정 시트 전체를 읽어 활성 카테고리 객체만 남기고 정렬해 반환합니다.
function readScheduleCategories_() {
  const values = measurePerformance_(
    'sheets.read_data_range',
    { sheet: SCHEDULE_CATEGORIES_SHEET },
    () =>
      getRequiredScheduleSheet_(SCHEDULE_CATEGORIES_SHEET, SCHEDULE_CATEGORY_HEADERS)
        .getDataRange()
        .getValues(),
  );
  return values
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => ({
      category_id: String(row[0] || ''),
      category_name: String(row[1] || ''),
      color_hex: String(row[2] || ''),
      is_active: String(row[3]).toLowerCase() !== 'false' && String(row[3]) !== '0',
      sort_order: Number(row[4] || 0),
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.category_name.localeCompare(b.category_name));
}
// 스케줄 시트 전체를 읽은 뒤 서버 세션 소유자와 요청 날짜 범위를 기준으로 반복 일정을 포함해 필터링합니다.
function readSchedules_(session, fromDate, toDate) {
  const from = String(fromDate || '');
  const to = String(toDate || '');
  if (!isValidDateOnly_(from) || !isValidDateOnly_(to) || from > to)
    throw new Error('조회할 달력 날짜 범위가 올바르지 않습니다.');
  const values = measurePerformance_(
    'sheets.read_data_range',
    { sheet: SCHEDULES_SHEET },
    () =>
      getRequiredScheduleSheet_(SCHEDULES_SHEET, SCHEDULE_HEADERS)
        .getDataRange()
        .getValues(),
  );
  return values
    .slice(1)
    .filter(row => row.some(Boolean) && String(row[1]) === session.userId)
    .map(row => scheduleObject_(row))
    .filter(item => {
      const startDate = item.start_datetime.slice(0, 10);
      const endDate = item.end_datetime.slice(0, 10);
      const repeats =
        item.repeat_type !== 'none' && (!item.repeat_until || item.repeat_until >= from);
      return startDate <= to && (endDate >= from || repeats);
    })
    .sort(
      (a, b) => a.start_datetime.localeCompare(b.start_datetime) || a.title.localeCompare(b.title),
    );
}
function scheduleObject_(row) {
  return Object.fromEntries(
    SCHEDULE_FIELDS.map((header, index) => {
      let value = row[index] == null ? '' : String(row[index]);
      if (header === 'created_at' || header === 'updated_at')
        value = formatSheetDateForApi_(header, row[index]);
      if (header === 'all_day') value = String(value).toLowerCase() === 'true' || value === '1';
      if (header === 'repeat_interval') value = Number(value || 1);
      return [header, value];
    }),
  );
}
function isValidDateOnly_(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function isValidSeoulDateTime_(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(String(value || ''))) return false;
  const date = new Date(value);
  return (
    !isNaN(date.getTime()) &&
    new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19) === value.slice(0, 19)
  );
}
// 스케줄 전체 행에서 ID와 세션 소유자를 확인해 기존 행 갱신 또는 신규 추가를 수행하며 작성일시를 보존합니다.
function saveSchedule_(session, request) {
  const input = request.schedule || {};
  const id = String(input.schedule_id || '').trim();
  const title = String(input.title || '').trim();
  const categoryId = String(input.category_id || '').trim();
  const start = String(input.start_datetime || '').trim();
  const end = String(input.end_datetime || '').trim();
  const allDay = input.all_day === true || String(input.all_day).toLowerCase() === 'true';
  const repeatType = String(input.repeat_type || 'none');
  const repeatInterval = Number(input.repeat_interval || 1);
  const repeatUntil = String(input.repeat_until || '').trim();
  if (!title || title.length > 200) throw new Error('일정 제목을 1~200자로 입력하세요.');
  if (!isValidSeoulDateTime_(start) || !isValidSeoulDateTime_(end))
    throw new Error('일정 날짜와 시간 형식이 올바르지 않습니다.');
  if (new Date(start).getTime() > new Date(end).getTime())
    throw new Error('종료 일시는 시작 일시보다 빠를 수 없습니다.');
  if (!['none', 'daily', 'weekly', 'monthly'].includes(repeatType))
    throw new Error('반복 유형이 올바르지 않습니다.');
  if (!Number.isInteger(repeatInterval) || repeatInterval < 1 || repeatInterval > 99)
    throw new Error('반복 간격은 1~99 사이의 정수여야 합니다.');
  if (repeatUntil && (!isValidDateOnly_(repeatUntil) || repeatUntil < start.slice(0, 10)))
    throw new Error('반복 종료일은 시작 날짜 이후로 입력하세요.');
  if (repeatType === 'none' && repeatUntil)
    throw new Error('반복하지 않는 일정에는 반복 종료일을 지정할 수 없습니다.');
  const category = readScheduleCategories_().find(
    item =>
      item.category_id === categoryId && item.is_active && /^#[0-9a-fA-F]{6}$/.test(item.color_hex),
  );
  if (!category) throw new Error('사용 가능한 카테고리를 선택하세요.');
  const sheet = getRequiredScheduleSheet_(SCHEDULES_SHEET, SCHEDULE_HEADERS);
  const values = sheet.getDataRange().getValues();
  const index = id
    ? values.slice(1).findIndex(row => String(row[0]) === id && String(row[1]) === session.userId)
    : -1;
  if (id && index < 0) throw new Error('수정할 일정을 찾을 수 없습니다.');
  const existing = index >= 0 ? values[index + 1] : null;
  const now = nowSeoul_();
  const row = [
    existing ? String(existing[0]) : Utilities.getUuid(),
    session.userId,
    existing ? String(existing[2]) : session.name,
    title,
    categoryId,
    start,
    end,
    allDay,
    String(input.location || '').trim(),
    String(input.description || '').trim(),
    repeatType,
    repeatInterval,
    repeatType === 'none' ? '' : repeatUntil,
    existing ? String(existing[13]) : now,
    now,
  ];
  if (existing) sheet.getRange(index + 2, 1, 1, SCHEDULE_HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
  return { ok: true, schedule: scheduleObject_(row) };
}
// 삭제 조건에 일정 ID와 세션 사용자 ID를 함께 넣어 다른 사용자의 일정은 지울 수 없게 합니다.
function deleteSchedule_(session, request) {
  const id = String(request.schedule_id || '').trim();
  if (!id) throw new Error('삭제할 일정 ID가 없습니다.');
  const sheet = getRequiredScheduleSheet_(SCHEDULES_SHEET, SCHEDULE_HEADERS);
  const values = sheet.getDataRange().getValues();
  const index = values
    .slice(1)
    .findIndex(row => String(row[0]) === id && String(row[1]) === session.userId);
  if (index < 0) throw new Error('삭제할 일정을 찾을 수 없습니다.');
  sheet.deleteRow(index + 2);
  return { ok: true };
}

// logs 전체 범위를 읽고 최근 300개 행만 화면용 객체로 변환해 최신순 반환합니다.
function readLogs_() {
  const values = getOrCreateSheet_(LOGS_SHEET, LOG_HEADERS).getDataRange().getValues();
  return values
    .slice(1)
    .filter(row => row.some(Boolean))
    .slice(-300)
    .reverse()
    .map(row =>
      Object.fromEntries(
        LOG_HEADERS.map((header, i) => [
          header,
          formatSheetDateForApi_(header, row[i]),
        ]),
      ),
    );
}
// 각 작업에서 호출되어 logs 시트 끝에 현재 사용자 및 작업 정보를 한 행 추가합니다.
function appendLog_(session, action, year, studentId, studentName, detail) {
  const sheet = getOrCreateSheet_(LOGS_SHEET, LOG_HEADERS);
  sheet.appendRow([
    nowSeoul_(),
    session.userId,
    session.name,
    action,
    year || '',
    studentId || '',
    studentName || '',
    detail || '',
  ]);
}
// 자료실 게시글과 파일 시트의 전체 행을 각각 읽어 파일 메타데이터를 게시글 ID별로 묶어 반환합니다.
function readArchivePosts_() {
  const postSheet = getOrCreateSheet_(ARCHIVE_POSTS_SHEET, ARCHIVE_POST_HEADERS);
  const fileSheet = getOrCreateSheet_(ARCHIVE_FILES_SHEET, ARCHIVE_FILE_HEADERS);
  const fileRows = fileSheet.getDataRange().getValues().slice(1);
  const filesByPost = {};
  fileRows
    .filter(row => ['active', 'delete_failed'].includes(String(row[11])))
    .forEach(row => {
      const key = String(row[1]);
      if (!filesByPost[key]) filesByPost[key] = [];
      filesByPost[key].push({
        fileId: String(row[0]),
        originalFilename: String(row[3]),
        fileType: String(row[5]),
        mimeType: String(row[6]),
        fileSize: Number(row[7]) || 0,
      });
    });
  return postSheet
    .getDataRange()
    .getValues()
    .slice(1)
    .filter(row => row.some(Boolean) && String(row[8]) === 'active')
    .map(row => ({
      postId: String(row[0]),
      title: String(row[1]),
      content: String(row[2]),
      authorId: String(row[3]),
      authorName: String(row[4]),
      createdAt: archiveDate_(row[5]),
      updatedAt: archiveDate_(row[6]),
      viewCount: Number(row[7]) || 0,
      files: filesByPost[String(row[0])] || [],
    }))
    .reverse();
}
// 자료실 게시글 전체에서 활성 게시글 ID를 검색해 제목·내용·수정일을 갱신하거나 새 게시글 행을 추가합니다.
function saveArchivePost_(session, input) {
  const title = String(input.title || '').trim();
  if (!title) throw new Error('자료 제목을 입력해 주세요.');
  if (title.length > 200) throw new Error('자료 제목은 200자 이내로 입력해 주세요.');
  const content = String(input.content || '');
  if (content.length > 50000) throw new Error('자료 내용은 50,000자 이내로 입력해 주세요.');
  getOrCreateSheet_(ARCHIVE_FILES_SHEET, ARCHIVE_FILE_HEADERS);
  const sheet = getOrCreateSheet_(ARCHIVE_POSTS_SHEET, ARCHIVE_POST_HEADERS);
  const rows = sheet.getDataRange().getValues();
  const postId = String(input.postId || '').trim();
  const existingIndex = postId
    ? rows.slice(1).findIndex(row => String(row[0]) === postId && String(row[8]) === 'active')
    : -1;
  if (postId && existingIndex < 0) throw new Error('수정할 게시글을 찾을 수 없습니다.');
  const timestamp = nowSeoul_();
  if (existingIndex >= 0) {
    const rowNumber = existingIndex + 2;
    sheet.getRange(rowNumber, 2, 1, 1).setValue(title);
    sheet.getRange(rowNumber, 3, 1, 1).setValue(content);
    sheet.getRange(rowNumber, 7, 1, 1).setValue(timestamp);
    appendLog_(session, '자료실 수정', '', postId, title, '자료 게시글 수정');
    return { ok: true, postId: postId };
  }
  const newId = Utilities.getUuid();
  sheet.appendRow([
    newId,
    title,
    content,
    session.userId,
    session.name,
    timestamp,
    timestamp,
    0,
    input.publish === false ? 'draft' : 'active',
  ]);
  appendLog_(session, '자료실 등록', '', newId, title, '자료 게시글 등록');
  return { ok: true, postId: newId };
}
function publishArchivePost_(session, requestedId) {
  const postId = String(requestedId || '').trim();
  const sheet = getOrCreateSheet_(ARCHIVE_POSTS_SHEET, ARCHIVE_POST_HEADERS);
  const rows = sheet.getDataRange().getValues();
  const index = rows
    .slice(1)
    .findIndex(row => String(row[0]) === postId && ['draft', 'active'].includes(String(row[8])));
  if (index < 0) throw new Error('게시할 자료를 찾을 수 없습니다.');
  sheet.getRange(index + 2, 9).setValue('active');
  sheet.getRange(index + 2, 7).setValue(nowSeoul_());
  appendLog_(session, '자료실 공개', '', postId, String(rows[index + 1][1]), '자료 게시글 공개');
  return { ok: true, postId: postId };
}
function deleteArchivePost_(session, requestedId) {
  const postId = String(requestedId || '').trim();
  if (!postId) throw new Error('삭제할 게시글 ID가 없습니다.');
  const sheet = getOrCreateSheet_(ARCHIVE_POSTS_SHEET, ARCHIVE_POST_HEADERS);
  const rows = sheet.getDataRange().getValues();
  const index = rows
    .slice(1)
    .findIndex(row => String(row[0]) === postId && String(row[8]) === 'active');
  if (index < 0) throw new Error('삭제할 게시글을 찾을 수 없습니다.');
  sheet.getRange(index + 2, 9).setValue('deleted');
  sheet.getRange(index + 2, 7).setValue(nowSeoul_());
  appendLog_(session, '자료실 삭제', '', postId, String(rows[index + 1][1]), '자료 게시글 삭제');
  return { ok: true };
}
function incrementArchiveView_(requestedId) {
  // 자료실 게시글 전체에서 ID를 검색해 조회수 셀 한 곳을 증가시키고 새 조회수를 반환합니다.
  const postId = String(requestedId || '').trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getOrCreateSheet_(ARCHIVE_POSTS_SHEET, ARCHIVE_POST_HEADERS);
    const rows = sheet.getDataRange().getValues();
    const index = rows
      .slice(1)
      .findIndex(row => String(row[0]) === postId && String(row[8]) === 'active');
    if (index < 0) throw new Error('자료 게시글을 찾을 수 없습니다.');
    const rowNumber = index + 2;
    const count = (Number(rows[rowNumber - 1][7]) || 0) + 1;
    sheet.getRange(rowNumber, 8).setValue(count);
    return { ok: true, viewCount: count };
  } finally {
    lock.releaseLock();
  }
}
function archiveDate_(value) {
  return formatPreservedDate_(value, false, 'Asia/Seoul');
}
function dateKeyForRange_(value) {
  const formatted = formatPreservedDate_(value, true, 'Asia/Seoul');
  const match = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(formatted);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return String(value == null ? '' : value).slice(0, 10).replaceAll('/', '-');
}
function driveSafeFilename_(filename) {
  const safeFilename = String(filename || '').replace(/[\\/\u0000-\u001f\u007f]/g, '_');
  if (!safeFilename.trim()) throw new Error('파일명을 확인해 주세요.');
  if (safeFilename.length > 240) throw new Error('파일명은 240자 이내로 입력해 주세요.');
  return safeFilename;
}
function archiveBridge_(request, callback) {
  const expected = PropertiesService.getScriptProperties().getProperty('ARCHIVE_BRIDGE_SECRET');
  if (!expected || String(request.bridgeSecret || '') !== expected)
    throw new Error('자료실 서버 연결 인증에 실패했습니다.');
  return callback();
}
function archiveUploadStart_(session, request) {
  // 게시글 시트에서 첨부 대상을 확인하고 Drive 폴더와 OAuth 토큰을 준비한 뒤 파일마다 resumable 세션을 생성합니다.
  // 파일 자체는 이 단계에서 전송되지 않으며 원본/저장 파일명과 크기 등 세션 메타정보를 Worker에 반환합니다.
  const postId = String(request.postId || '').trim();
  const files = Array.isArray(request.files) ? request.files : [];
  if (!postId || !files.length) throw new Error('게시글과 첨부파일을 확인해 주세요.');
  if (files.length > 30) throw new Error('한 번에 첨부할 수 있는 파일은 최대 30개입니다.');
  const postSheet = getOrCreateSheet_(ARCHIVE_POSTS_SHEET, ARCHIVE_POST_HEADERS);
  const postRows = postSheet.getDataRange().getValues();
  if (
    !postRows
      .slice(1)
      .some(row => String(row[0]) === postId && ['active', 'draft'].includes(String(row[8])))
  )
    throw new Error('첨부할 게시글을 찾을 수 없습니다.');
  const totals = { video: 0, other: 0 };
  const normalized = files.map(file => {
    const originalFilename = String(file.name || '');
    const storedFilename = driveSafeFilename_(originalFilename);
    const ext = storedFilename.includes('.') ? storedFilename.split('.').pop().toLowerCase() : '';
    const rule = ARCHIVE_ALLOWED[ext];
    const size = Number(file.size);
    const mimeType = String(file.mimeType || 'application/octet-stream').toLowerCase();
    if (!rule || !storedFilename.trim() || !Number.isSafeInteger(size) || size <= 0)
      throw new Error('허용되지 않는 파일 형식이거나 파일 정보가 올바르지 않습니다.');
    if (mimeType !== 'application/octet-stream' && mimeType !== rule[0])
      throw new Error(originalFilename + ' 파일의 MIME 형식이 확장자와 일치하지 않습니다.');
    const group = rule[1] === 'video' ? 'video' : 'other';
    totals[group] += size;
    if (totals[group] > ARCHIVE_UPLOAD_LIMITS[group])
      throw new Error(
        group === 'video'
          ? '동영상 파일은 한 번의 업로드에서 최대 500MB까지 첨부할 수 있습니다.'
          : '이미지·문서·압축파일은 한 번의 업로드에서 합계 200MB까지 첨부할 수 있습니다.',
      );
    return {
      originalFilename: originalFilename,
      storedFilename: storedFilename,
      extension: ext,
      size: size,
      mimeType: mimeType === 'application/octet-stream' ? rule[0] : mimeType,
      fileType: rule[1],
      fileId: Utilities.getUuid(),
    };
  });
  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty('ARCHIVE_DRIVE_FOLDER_ID');
  if (!folderId) {
    const folders = DriveApp.getFoldersByName(ARCHIVE_DRIVE_FOLDER_NAME);
    const folder = folders.hasNext()
      ? folders.next()
      : DriveApp.createFolder(ARCHIVE_DRIVE_FOLDER_NAME);
    folderId = folder.getId();
    props.setProperty('ARCHIVE_DRIVE_FOLDER_ID', folderId);
  }
  const token = ScriptApp.getOAuthToken();
  const sessions = normalized.map(file => {
    const metadata = {
      name: file.storedFilename,
      mimeType: file.mimeType,
      parents: [folderId],
      appProperties: { archivePostId: postId, archiveFileId: file.fileId },
      description: '자료실 게시글 첨부 파일',
    };
    const response = fetchDriveRequest_(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,parents',
      {
        method: 'post',
        contentType: 'application/json; charset=UTF-8',
        payload: JSON.stringify(metadata),
        muteHttpExceptions: true,
        headers: {
          Authorization: 'Bearer ' + token,
          'X-Upload-Content-Type': file.mimeType,
          'X-Upload-Content-Length': String(file.size),
        },
      },
      'archive_upload_start',
    );
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
      console.error(
        'Archive resumable session initialization failed',
        response.getResponseCode(),
        response.getContentText().slice(0, 500),
      );
      throw new Error('Google Drive 업로드 준비에 실패했습니다.');
    }
    const headers = response.getAllHeaders();
    const sessionUrl = headers.Location || headers.location;
    if (!sessionUrl) throw new Error('Google Drive가 업로드 세션 주소를 반환하지 않았습니다.');
    return {
      uploadId: file.fileId,
      sessionUrl: String(sessionUrl),
      postId: postId,
      fileId: file.fileId,
      originalFilename: file.originalFilename,
      extension: file.extension,
      storedFilename: file.storedFilename,
      fileType: file.fileType,
      mimeType: file.mimeType,
      fileSize: file.size,
      driveFolderId: folderId,
      uploadedBy: session.userId,
      authorName: session.name,
    };
  });
  return { ok: true, uploads: sessions };
}
function archiveUploadComplete_(session, request) {
  // Drive 파일 ID로 메타데이터를 재조회·검증한 뒤 자료실파일 시트 전체에서 중복 ID를 확인하고 한 행을 기록합니다.
  const fileId = String(request.fileId || '').trim();
  const postId = String(request.postId || '').trim();
  const driveFileId = String(request.driveFileId || '').trim();
  if (!fileId || !postId || !driveFileId) throw new Error('업로드 파일 정보를 확인할 수 없습니다.');
  const token = ScriptApp.getOAuthToken();
  const verify = fetchDriveRequest_(
    'https://www.googleapis.com/drive/v3/files/' +
      encodeURIComponent(driveFileId) +
      '?fields=id,name,mimeType,size,parents,appProperties',
    { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true },
    'archive_upload_verify',
  );
  if (verify.getResponseCode() !== 200)
    throw new Error('Google Drive에 저장된 파일을 확인하지 못했습니다.');
  const actual = JSON.parse(verify.getContentText());
  if (
    actual.appProperties?.archivePostId !== postId ||
    actual.appProperties?.archiveFileId !== fileId ||
    actual.name !== request.storedFilename ||
    !actual.parents?.includes(String(request.driveFolderId || ''))
  )
    throw new Error('Google Drive 파일 검증에 실패했습니다.');
  const sheet = getOrCreateSheet_(ARCHIVE_FILES_SHEET, ARCHIVE_FILE_HEADERS);
  const rows = sheet.getDataRange().getValues();
  const existing = rows.slice(1).findIndex(row => String(row[0]) === fileId);
  const data = [
    fileId,
    postId,
    driveFileId,
    request.originalFilename,
    request.storedFilename,
    request.fileType,
    request.mimeType,
    Number(actual.size) || Number(request.fileSize) || 0,
    request.driveFolderId,
    session.userId,
    nowSeoul_(),
    'active',
  ];
  if (existing >= 0) sheet.getRange(existing + 2, 1, 1, data.length).setValues([data]);
  else sheet.appendRow(data);
  return {
    ok: true,
    fileId: fileId,
    fileSize: Number(actual.size) || Number(request.fileSize) || 0,
  };
}
function archiveDownloadInfo_(fileId) {
  // 자료실 파일 메타데이터 시트 전체에서 파일 ID를 검색해 Drive 다운로드에 필요한 정보를 반환합니다.
  const rows = getOrCreateSheet_(ARCHIVE_FILES_SHEET, ARCHIVE_FILE_HEADERS)
    .getDataRange()
    .getValues();
  const row = rows
    .slice(1)
    .find(item => String(item[0]) === String(fileId) && String(item[11]) === 'active');
  if (!row) throw new Error('다운로드할 파일을 찾을 수 없습니다.');
  const posts = getOrCreateSheet_(ARCHIVE_POSTS_SHEET, ARCHIVE_POST_HEADERS)
    .getDataRange()
    .getValues();
  if (
    !posts.slice(1).some(post => String(post[0]) === String(row[1]) && String(post[8]) === 'active')
  )
    throw new Error('게시글에 연결된 파일이 아닙니다.');
  return {
    ok: true,
    driveToken: ScriptApp.getOAuthToken(),
    driveFileId: String(row[2]),
    filename: String(row[3]),
    mimeType: String(row[6]),
    fileSize: Number(row[7]) || 0,
  };
}
function archivePrepareFileDelete_(session, fileId) {
  const rows = getOrCreateSheet_(ARCHIVE_FILES_SHEET, ARCHIVE_FILE_HEADERS)
    .getDataRange()
    .getValues();
  const row = rows
    .slice(1)
    .find(
      item =>
        String(item[0]) === String(fileId) &&
        ['active', 'delete_failed'].includes(String(item[11])),
    );
  if (!row) throw new Error('삭제할 파일을 찾을 수 없습니다.');
  return {
    ok: true,
    fileId: String(row[0]),
    driveFileId: String(row[2]),
    driveToken: ScriptApp.getOAuthToken(),
  };
}
function archiveCompleteFileDelete_(session, fileId) {
  const sheet = getOrCreateSheet_(ARCHIVE_FILES_SHEET, ARCHIVE_FILE_HEADERS);
  const rows = sheet.getDataRange().getValues();
  const index = rows.slice(1).findIndex(row => String(row[0]) === String(fileId));
  if (index < 0) throw new Error('삭제할 파일 메타데이터를 찾을 수 없습니다.');
  sheet.getRange(index + 2, 12).setValue('deleted');
  appendLog_(
    session,
    '자료실 파일 삭제',
    '',
    String(fileId),
    String(rows[index + 1][3]),
    'Drive 첨부파일 삭제',
  );
  return { ok: true };
}
function archivePreparePostDelete_(postId) {
  const id = String(postId || '').trim();
  const posts = getOrCreateSheet_(ARCHIVE_POSTS_SHEET, ARCHIVE_POST_HEADERS)
    .getDataRange()
    .getValues();
  if (!posts.slice(1).some(row => String(row[0]) === id && String(row[8]) === 'active'))
    throw new Error('삭제할 게시글을 찾을 수 없습니다.');
  const files = getOrCreateSheet_(ARCHIVE_FILES_SHEET, ARCHIVE_FILE_HEADERS)
    .getDataRange()
    .getValues()
    .slice(1)
    .filter(row => String(row[1]) === id && ['active', 'delete_failed'].includes(String(row[11])))
    .map(row => ({ fileId: String(row[0]), driveFileId: String(row[2]) }));
  return { ok: true, postId: id, files: files, driveToken: ScriptApp.getOAuthToken() };
}
function archiveCompletePostDelete_(session, postId, failedFileIds) {
  const id = String(postId || '').trim();
  const failed = new Set((Array.isArray(failedFileIds) ? failedFileIds : []).map(String));
  const files = getOrCreateSheet_(ARCHIVE_FILES_SHEET, ARCHIVE_FILE_HEADERS);
  const rows = files.getDataRange().getValues();
  rows.slice(1).forEach((row, index) => {
    if (String(row[1]) === id)
      files
        .getRange(index + 2, 12)
        .setValue(failed.has(String(row[0])) ? 'delete_failed' : 'deleted');
  });
  const posts = getOrCreateSheet_(ARCHIVE_POSTS_SHEET, ARCHIVE_POST_HEADERS);
  const postRows = posts.getDataRange().getValues();
  const index = postRows.slice(1).findIndex(row => String(row[0]) === id);
  if (index < 0) throw new Error('삭제할 게시글을 찾을 수 없습니다.');
  posts.getRange(index + 2, 9).setValue(failed.size ? 'active' : 'deleted');
  posts.getRange(index + 2, 7).setValue(nowSeoul_());
  appendLog_(
    session,
    failed.size ? '자료실 파일 정리 실패' : '자료실 삭제',
    '',
    id,
    String(postRows[index + 1][1]),
    failed.size ? '일부 Drive 파일 삭제 실패' : '게시글 및 첨부파일 삭제',
  );
  if (failed.size)
    throw new Error(
      '게시글 삭제 중 일부 Drive 파일 정리에 실패했습니다. 관리자 확인 후 다시 시도해 주세요.',
    );
  return { ok: true };
}

function boardSheets_() {
  // 게시판 API 한 요청에서 게시글·파일·댓글·좋아요·알림·활동로그 시트를 각각 열고 스키마 어댑터를 검증합니다.
  const definitions = [
    [BOARD_POSTS_SHEET, BOARD_POST_HEADERS],
    [BOARD_FILES_SHEET, BOARD_FILE_HEADERS],
    [BOARD_COMMENTS_SHEET, BOARD_COMMENT_HEADERS],
    [BOARD_LIKES_SHEET, BOARD_LIKE_HEADERS],
    [BOARD_NOTIFICATIONS_SHEET, BOARD_NOTIFICATION_HEADERS],
    [BOARD_LOGS_SHEET, BOARD_LOG_HEADERS],
  ];
  const found = definitions.map(item => schemaSheet_(item[0], item[1], false));
  if (found.some(sheet => !sheet))
    throw new Error('BOARD_SHEETS_NOT_INITIALIZED: 관리자가 게시판 시트를 먼저 초기화해야 합니다.');
  return {
    posts: found[0],
    files: found[1],
    comments: found[2],
    likes: found[3],
    notifications: found[4],
    logs: found[5],
  };
}

function boardStatus_() {
  const definitions = [
    [BOARD_POSTS_SHEET, BOARD_POST_HEADERS],
    [BOARD_FILES_SHEET, BOARD_FILE_HEADERS],
    [BOARD_COMMENTS_SHEET, BOARD_COMMENT_HEADERS],
    [BOARD_LIKES_SHEET, BOARD_LIKE_HEADERS],
    [BOARD_NOTIFICATIONS_SHEET, BOARD_NOTIFICATION_HEADERS],
    [BOARD_LOGS_SHEET, BOARD_LOG_HEADERS],
  ];
  const missing = [];
  const invalid = [];
  definitions.forEach(([name, headers]) => {
    try {
      const sheet = schemaSheet_(name, headers, false);
      if (!sheet) missing.push(name);
      else if (sheet.getLastRow() === 0) invalid.push(name);
    } catch (error) {
      invalid.push(name);
    }
  });
  return {
    ok: true,
    initialized: missing.length === 0 && invalid.length === 0,
    missing: missing,
    invalid: invalid,
  };
}

function initializeBoardSheets_(session) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const definitions = [
      [BOARD_POSTS_SHEET, BOARD_POST_HEADERS],
      [BOARD_FILES_SHEET, BOARD_FILE_HEADERS],
      [BOARD_COMMENTS_SHEET, BOARD_COMMENT_HEADERS],
      [BOARD_LIKES_SHEET, BOARD_LIKE_HEADERS],
      [BOARD_NOTIFICATIONS_SHEET, BOARD_NOTIFICATION_HEADERS],
      [BOARD_LOGS_SHEET, BOARD_LOG_HEADERS],
    ];
    definitions.forEach(([name, headers]) => {
      schemaSheet_(name, headers, false, false, true);
    });
    const created = [];
    definitions.forEach(([name, headers]) => {
      const existed = schemaSheet_(name, headers, false, false, true);
      schemaSheet_(name, headers, true);
      if (!existed) created.push(name);
    });
    boardLog_(session, '게시판 시트 초기화', '', '', '', '게시판용 시트 확인 및 생성');
    return { ok: true, created: created, initialized: true };
  } finally {
    lock.releaseLock();
  }
}

function validBoardId_(boardId) {
  const id = String(boardId || '').trim();
  if (BOARD_IDS.indexOf(id) < 0) throw new Error('게시판을 확인할 수 없습니다.');
  return id;
}

function boardRows_(sheet) {
  // 게시판 시트의 전체 데이터 범위를 읽고 헤더 행을 제외한 원시 행을 반환합니다.
  return sheet.getDataRange().getValues().slice(1);
}

function boardSheetHeaderMatches_(sheet, expectedHeaders) {
  try {
    return Boolean(schemaSheet_(sheet.getName(), expectedHeaders, false));
  } catch (_) {
    return false;
  }
}

function boardLog_(session, action, boardId, postId, targetId, detail) {
  const sheet = boardSheets_().logs;
  sheet.appendRow([
    Utilities.getUuid(),
    session.userId,
    session.name,
    action,
    boardId || '',
    postId || '',
    targetId || '',
    String(detail || '').slice(0, 500),
    nowSeoul_(),
  ]);
}

function boardPostFromRow_(row, files, comments) {
  return {
    postId: String(row[0]),
    boardId: String(row[1]),
    title: String(row[2]),
    content: String(row[3]),
    authorId: String(row[4]),
    authorName: String(row[5]),
    createdAt: archiveDate_(row[6]),
    updatedAt: archiveDate_(row[7]),
    viewCount: Number(row[8]) || 0,
    status: String(row[9]),
    isNotice: row[10] === true || row[10] === 'TRUE',
    isPinned: row[11] === true || row[11] === 'TRUE',
    isImportant: row[12] === true || row[12] === 'TRUE',
    commentsLocked: row[13] === true || row[13] === 'TRUE',
    coverFileId: String(row[14] || ''),
    files: files || [],
    commentCount: comments || 0,
  };
}

// 게시글·파일·댓글 시트 전체를 읽어 게시판/상태/검색/기간 조건을 메모리에서 적용하고 정렬·페이지네이션합니다.
function listBoardPosts_(session, request) {
  const boardId = validBoardId_(request.boardId);
  const sheets = boardSheets_();
  const filesByPost = {};
  const activeFileRows = boardRows_(sheets.files).filter(
    row => String(row[1]) === boardId && String(row[12]) === 'active',
  );
  activeFileRows.forEach(row => {
      const key = String(row[2]);
      if (!filesByPost[key]) filesByPost[key] = [];
      filesByPost[key].push({
        fileId: String(row[0]),
        boardId: String(row[1]),
        postId: key,
        originalFilename: String(row[4]),
        fileType: String(row[6]),
        mimeType: String(row[7]),
        fileSize: Number(row[8]) || 0,
        sortOrder: Number(row[13]) || 0,
      });
    });
  const commentCounts = {};
  boardRows_(sheets.comments)
    .filter(row => String(row[1]) === boardId && String(row[9]) === 'active')
    .forEach(row => {
      const postId = String(row[2]);
      commentCounts[postId] = (commentCounts[postId] || 0) + 1;
    });
  const includeDeleted = session.role === 'admin' && request.includeDeleted === true;
  const includeDrafts = request.includeDrafts === true;
  const query = String(request.query || '')
    .trim()
    .toLocaleLowerCase('ko-KR');
  const searchField = String(request.searchField || 'all');
  const author = String(request.authorId || '');
  const authorName = String(request.authorName || '')
    .trim()
    .toLocaleLowerCase('ko-KR');
  const createdFrom = String(request.createdFrom || '');
  const createdTo = String(request.createdTo || '');
  const updatedFrom = String(request.updatedFrom || '');
  const updatedTo = String(request.updatedTo || '');
  const rows = boardRows_(sheets.posts)
    .filter(row => {
      if (String(row[1]) !== boardId) return false;
      if (includeDeleted) {
        if (String(row[9]) !== 'deleted') return false;
      } else if (includeDrafts) {
        if (
          String(row[9]) !== 'draft' ||
          (session.role !== 'admin' && String(row[4]) !== session.userId)
        )
          return false;
      } else if (String(row[9]) !== 'active') return false;
      if (author && String(row[4]) !== author) return false;
      if (
        authorName &&
        !String(row[5] || '')
          .toLocaleLowerCase('ko-KR')
          .includes(authorName)
      )
        return false;
      const created = dateKeyForRange_(row[6]);
      const updated = dateKeyForRange_(row[7]);
      if (createdFrom && created < createdFrom) return false;
      if (createdTo && created > createdTo) return false;
      if (updatedFrom && updated < updatedFrom) return false;
      if (updatedTo && updated > updatedTo) return false;
      if (!query) return true;
      const fileText = (filesByPost[String(row[0])] || [])
        .map(file => file.originalFilename)
        .join(' ');
      const searchFields =
        searchField === 'title'
          ? [row[2]]
          : searchField === 'content'
            ? [row[3]]
            : searchField === 'author'
              ? [row[5]]
              : [row[2], row[3], row[5], fileText];
      return searchFields.some(value =>
        String(value || '')
          .toLocaleLowerCase('ko-KR')
          .includes(query),
      );
    })
    .map(row =>
      boardPostFromRow_(row, filesByPost[String(row[0])] || [], commentCounts[String(row[0])] || 0),
    );
  const sort = String(request.sort || 'newest');
  rows.sort((a, b) => {
    if (!includeDeleted && !includeDrafts && a.isNotice !== b.isNotice) return a.isNotice ? -1 : 1;
    if (!includeDeleted && !includeDrafts && a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
    if (sort === 'views')
      return b.viewCount - a.viewCount || b.createdAt.localeCompare(a.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });
  const page = Math.max(1, Number(request.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(request.pageSize) || 10));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const result = {
    ok: true,
    boardId: boardId,
    posts: pageRows,
    total: rows.length,
    page: page,
    pageSize: pageSize,
  };
  if (boardId === 'photo' && request.includePreviewAccess === true) {
    const previewPosts = pageRows.filter(post => post.status === 'active');
    const coverFileIds = new Set(
      previewPosts.map(post => String(post.coverFileId || '')).filter(Boolean),
    );
    const previewFiles = activeFileRows
      .filter(
        row =>
          coverFileIds.has(String(row[0])) &&
          previewPosts.some(post => post.postId === String(row[2])) &&
          String(row[7] || '').startsWith('image/'),
      )
      .map(row => ({
        fileId: String(row[0]),
        driveFileId: String(row[3]),
        filename: String(row[4]),
        mimeType: String(row[7]),
      }));
    if (previewFiles.length) {
      result.previewAccess = {
        driveToken: ScriptApp.getOAuthToken(),
        files: previewFiles,
      };
    }
  }
  return result;
}

// 게시글 상세 요청은 게시판 관련 시트 데이터를 읽어 요청 ID에 연결된 게시글·파일·댓글 정보를 조합합니다.
function readBoardPost_(session, requestedBoardId, requestedPostId) {
  const boardId = validBoardId_(requestedBoardId);
  const sheets = boardSheets_();
  const postId = String(requestedPostId || '').trim();
  const rows = boardRows_(sheets.posts);
  const index = rows.findIndex(
    row => String(row[0]) === postId && String(row[1]) === boardId && String(row[9]) === 'active',
  );
  if (index < 0) throw new Error('게시글을 찾을 수 없습니다.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const rowNumber = index + 2;
    const viewCount = (Number(rows[index][8]) || 0) + 1;
    sheets.posts.getRange(rowNumber, 9).setValue(viewCount);
    const files = boardRows_(sheets.files)
      .filter(row => String(row[2]) === postId && String(row[12]) === 'active')
      .map(row => ({
        fileId: String(row[0]),
        boardId: String(row[1]),
        postId: postId,
        originalFilename: String(row[4]),
        fileType: String(row[6]),
        mimeType: String(row[7]),
        fileSize: Number(row[8]) || 0,
        sortOrder: Number(row[13]) || 0,
      }));
    const comments = readBoardComments_(postId, sheets, session.userId);
    const post = boardPostFromRow_(
      rows[index],
      files,
      comments.filter(item => item.status === 'active').length,
    );
    post.viewCount = viewCount;
    post.canManage = session.role === 'admin' || session.userId === post.authorId;
    post.comments = comments;
    boardLog_(session, '게시글 조회', boardId, postId, '', '게시글 상세 조회');
    return { ok: true, post: post };
  } finally {
    lock.releaseLock();
  }
}

function saveBoardPost_(session, input) {
  // 게시글 시트 전체에서 수정 대상을 찾고 행 전체 갱신 또는 신규 게시글 행 추가 후 활동 로그를 기록합니다.
  const boardId = validBoardId_(input.boardId);
  const title = String(input.title || '').trim();
  const content = String(input.content || '');
  if (!title) throw new Error('게시글 제목을 입력해 주세요.');
  if (title.length > 200 || content.length > 50000) throw new Error('입력 길이를 확인해 주세요.');
  if (boardId === 'photo' && content.length > 200)
    throw new Error('사진 설명은 200자 이내로 입력해 주세요.');
  const sheets = boardSheets_();
  const postId = String(input.postId || '').trim();
  const rows = boardRows_(sheets.posts);
  const index = postId
    ? rows.findIndex(row => String(row[0]) === postId && String(row[9]) !== 'purged')
    : -1;
  const timestamp = nowSeoul_();
  if (postId && index < 0) throw new Error('수정할 게시글을 찾을 수 없습니다.');
  if (index >= 0) {
    const row = rows[index];
    if (String(row[9]) !== 'active' && String(row[9]) !== 'draft')
      throw new Error('수정할 수 없는 게시글입니다.');
    if (session.role !== 'admin' && String(row[4]) !== session.userId)
      throw new Error('본인 게시글만 수정할 수 있습니다.');
    if (String(row[1]) !== boardId && session.role !== 'admin')
      throw new Error('게시판 이동 권한이 없습니다.');
    const updated = [...row];
    updated[1] = boardId;
    updated[2] = title;
    updated[3] = content;
    updated[7] = timestamp;
    if (session.role === 'admin') {
      updated[10] = !!input.isNotice;
      updated[11] = !!input.isPinned;
      updated[12] = !!input.isImportant;
    }
    sheets.posts.getRange(index + 2, 1, 1, BOARD_POST_HEADERS.length).setValues([updated]);
    boardLog_(session, '게시글 수정', boardId, postId, '', title);
    return { ok: true, postId: postId };
  }
  const newId = Utilities.getUuid();
  const status = input.publish === false ? 'draft' : 'active';
  sheets.posts.appendRow([
    newId,
    boardId,
    title,
    content,
    session.userId,
    session.name,
    timestamp,
    timestamp,
    0,
    status,
    session.role === 'admin' && !!input.isNotice,
    session.role === 'admin' && !!input.isPinned,
    session.role === 'admin' && !!input.isImportant,
    false,
    '',
    '',
  ]);
  boardLog_(
    session,
    status === 'draft' ? '게시글 임시 등록' : '게시글 등록',
    boardId,
    newId,
    '',
    title,
  );
  return { ok: true, postId: newId };
}

function publishBoardPost_(session, requestedId) {
  const id = String(requestedId || '').trim();
  const sheets = boardSheets_();
  const rows = boardRows_(sheets.posts);
  const index = rows.findIndex(row => String(row[0]) === id && String(row[9]) === 'draft');
  if (index < 0) throw new Error('게시할 초안이 없습니다.');
  const row = rows[index];
  if (session.role !== 'admin' && String(row[4]) !== session.userId)
    throw new Error('본인 초안만 게시할 수 있습니다.');
  if (
    String(row[1]) === 'photo' &&
    !boardRows_(sheets.files).some(
      file =>
        String(file[2]) === String(row[0]) &&
        String(file[12]) === 'active' &&
        String(file[6]) === 'image',
    )
  )
    throw new Error('사진 게시글은 사진을 한 장 이상 첨부해야 등록할 수 있습니다.');
  sheets.posts.getRange(index + 2, 10).setValue('active');
  sheets.posts.getRange(index + 2, 8).setValue(nowSeoul_());
  readUsers_(false)
    .filter(user => user.active && user.userId !== session.userId)
    .forEach(user =>
      sheets.notifications.appendRow([
        Utilities.getUuid(),
        user.userId,
        row[1],
        id,
        'new_post',
        String(row[2]),
        nowSeoul_(),
        '',
      ]),
    );
  boardLog_(session, '게시글 공개', row[1], id, '', String(row[2]));
  return { ok: true, postId: id };
}

function softDeleteBoardPost_(session, requestedId) {
  const id = String(requestedId || '').trim();
  const sheets = boardSheets_();
  const rows = boardRows_(sheets.posts);
  const index = rows.findIndex(row => String(row[0]) === id && String(row[9]) === 'active');
  if (index < 0) throw new Error('삭제할 게시글을 찾을 수 없습니다.');
  const row = rows[index];
  if (session.role !== 'admin' && String(row[4]) !== session.userId)
    throw new Error('본인 게시글만 삭제할 수 있습니다.');
  sheets.posts.getRange(index + 2, 10).setValue('deleted');
  sheets.posts.getRange(index + 2, 16).setValue(nowSeoul_());
  boardLog_(session, '게시글 삭제함 이동', row[1], id, '', String(row[2]));
  return { ok: true };
}

function restoreBoardPost_(session, requestedId) {
  const id = String(requestedId || '').trim();
  const sheets = boardSheets_();
  const rows = boardRows_(sheets.posts);
  const index = rows.findIndex(row => String(row[0]) === id && String(row[9]) === 'deleted');
  if (index < 0) throw new Error('복구할 게시글을 찾을 수 없습니다.');
  sheets.posts.getRange(index + 2, 10).setValue('active');
  sheets.posts.getRange(index + 2, 16).setValue('');
  boardLog_(session, '게시글 복구', rows[index][1], id, '', String(rows[index][2]));
  return { ok: true };
}

function bulkBoardPosts_(session, request) {
  // 게시글 ID 목록을 기준으로 전체 게시글 행을 조회·검증한 뒤 삭제/이동 등의 상태를 반영합니다.
  const action = String(request.actionType || '');
  const ids = Array.isArray(request.postIds)
    ? [...new Set(request.postIds.map(String))].slice(0, 100)
    : [];
  if (!ids.length) throw new Error('관리할 게시글을 선택해 주세요.');
  const sheets = boardSheets_();
  const rows = boardRows_(sheets.posts);
  const fileRows = boardRows_(sheets.files);
  const commentRows = boardRows_(sheets.comments);
  if (action === 'move') {
    const target = validBoardId_(request.targetBoardId);
    const indexes = ids.map(id =>
      rows.findIndex(row => String(row[0]) === id && String(row[9]) === 'active'),
    );
    if (indexes.some(index => index < 0))
      throw new Error('선택한 게시글 중 이동할 수 없는 항목이 있습니다.');
    if (
      target === 'photo' &&
      ids.some(id => {
        const attached = fileRows.filter(
          file => String(file[2]) === id && String(file[12]) === 'active',
        );
        return (
          attached.some(file => String(file[6]) !== 'image') ||
          !attached.some(file => String(file[6]) === 'image')
        );
      })
    )
      throw new Error('사진 게시판으로 이동하려면 사진만 첨부된 게시글이어야 합니다.');
    ids.forEach(id => {
      const index = rows.findIndex(row => String(row[0]) === id && String(row[9]) === 'active');
      sheets.posts.getRange(index + 2, 2).setValue(target);
      fileRows.forEach((file, fileIndex) => {
        if (String(file[2]) === id) sheets.files.getRange(fileIndex + 2, 2).setValue(target);
      });
      commentRows.forEach((comment, commentIndex) => {
        if (String(comment[2]) === id)
          sheets.comments.getRange(commentIndex + 2, 2).setValue(target);
      });
      boardLog_(session, '게시글 이동', target, id, '', '일괄 이동');
    });
    return { ok: true, count: ids.length };
  }
  if (action !== 'delete') throw new Error('일괄 작업을 확인해 주세요.');
  const deleteIndexes = ids.map(id =>
    rows.findIndex(row => String(row[0]) === id && String(row[9]) === 'active'),
  );
  if (deleteIndexes.some(index => index < 0))
    throw new Error('선택한 게시글 중 삭제할 수 없는 항목이 있습니다.');
  ids.forEach(id => {
    const index = rows.findIndex(row => String(row[0]) === id && String(row[9]) === 'active');
    if (index < 0) throw new Error('선택한 게시글 중 삭제할 수 없는 항목이 있습니다.');
    sheets.posts.getRange(index + 2, 10).setValue('deleted');
    sheets.posts.getRange(index + 2, 16).setValue(nowSeoul_());
    boardLog_(session, '게시글 삭제함 이동', rows[index][1], id, '', String(rows[index][2]));
  });
  return { ok: true, count: ids.length };
}

// 게시판댓글 및 좋아요 행을 읽어 대상 게시글 댓글과 사용자별 좋아요 상태를 내부 객체로 구성합니다.
function readBoardComments_(postId, sheets, userId) {
  const comments = boardRows_(sheets.comments).filter(
    row => String(row[2]) === postId && ['active', 'deleted'].includes(String(row[9])),
  );
  const likes = boardRows_(sheets.likes);
  return comments.map(row => ({
    commentId: String(row[0]),
    boardId: String(row[1]),
    postId: String(row[2]),
    parentId: String(row[3] || ''),
    authorId: String(row[4]),
    authorName: String(row[5]),
    content: String(row[6]),
    createdAt: archiveDate_(row[7]),
    updatedAt: archiveDate_(row[8]),
    status: String(row[9]),
    likeCount: likes.filter(like => String(like[1]) === String(row[0])).length,
    likedByMe: likes.some(
      like => String(like[1]) === String(row[0]) && String(like[2]) === String(userId),
    ),
  }));
}

function saveBoardComment_(session, input) {
  // 댓글 시트에서 수정 대상을 찾거나 새 댓글 행을 추가하고, 필요한 알림과 활동 로그를 기록합니다.
  const postId = String(input.postId || '').trim();
  const parentId = String(input.parentId || '').trim();
  const content = String(input.content || '').trim();
  if (!content || content.length > 5000) throw new Error('댓글을 입력해 주세요. (최대 5,000자)');
  const sheets = boardSheets_();
  const posts = boardRows_(sheets.posts);
  const postIndex = posts.findIndex(
    row => String(row[0]) === postId && ['active', 'draft'].includes(String(row[9])),
  );
  if (postIndex < 0) throw new Error('게시글을 찾을 수 없습니다.');
  const post = posts[postIndex];
  if (String(post[13]) === 'TRUE' || post[13] === true) throw new Error('댓글이 잠겨 있습니다.');
  if (
    parentId &&
    !boardRows_(sheets.comments).some(
      row =>
        String(row[0]) === parentId && String(row[2]) === postId && String(row[9]) === 'active',
    )
  )
    throw new Error('답글 대상 댓글을 찾을 수 없습니다.');
  const commentId = String(input.commentId || '').trim();
  const rows = boardRows_(sheets.comments);
  const index = commentId
    ? rows.findIndex(row => String(row[0]) === commentId && String(row[9]) === 'active')
    : -1;
  const now = nowSeoul_();
  if (commentId && index < 0) throw new Error('수정할 댓글을 찾을 수 없습니다.');
  if (index >= 0) {
    const row = rows[index];
    if (session.role !== 'admin' && String(row[4]) !== session.userId)
      throw new Error('본인 댓글만 수정할 수 있습니다.');
    sheets.comments.getRange(index + 2, 7).setValue(content);
    sheets.comments.getRange(index + 2, 9).setValue(now);
    boardLog_(session, '댓글 수정', post[1], postId, commentId, '댓글 수정');
    return { ok: true, commentId: commentId };
  }
  const newId = Utilities.getUuid();
  sheets.comments.appendRow([
    newId,
    post[1],
    postId,
    parentId,
    session.userId,
    session.name,
    content,
    now,
    now,
    'active',
    0,
  ]);
  if (String(post[4]) !== session.userId)
    sheets.notifications.appendRow([
      Utilities.getUuid(),
      post[4],
      post[1],
      postId,
      'new_comment',
      String(post[2]),
      now,
      '',
    ]);
  boardLog_(
    session,
    parentId ? '대댓글 등록' : '댓글 등록',
    post[1],
    postId,
    newId,
    content.slice(0, 100),
  );
  return { ok: true, commentId: newId };
}

function deleteBoardComment_(session, requestedId) {
  const id = String(requestedId || '').trim();
  const sheets = boardSheets_();
  const rows = boardRows_(sheets.comments);
  const index = rows.findIndex(row => String(row[0]) === id && String(row[9]) === 'active');
  if (index < 0) throw new Error('삭제할 댓글을 찾을 수 없습니다.');
  const row = rows[index];
  if (session.role !== 'admin' && String(row[4]) !== session.userId)
    throw new Error('본인 댓글만 삭제할 수 있습니다.');
  const hasReplies = rows.some(item => String(item[3]) === id && String(item[9]) === 'active');
  if (hasReplies) {
    sheets.comments.getRange(index + 2, 7).setValue('삭제된 댓글입니다.');
    sheets.comments.getRange(index + 2, 10).setValue('deleted');
  } else sheets.comments.getRange(index + 2, 10).setValue('deleted');
  boardLog_(session, '댓글 삭제', row[1], row[2], id, '댓글 삭제');
  return { ok: true };
}

function toggleBoardCommentLike_(session, requestedId) {
  const id = String(requestedId || '').trim();
  const sheets = boardSheets_();
  if (
    !boardRows_(sheets.comments).some(row => String(row[0]) === id && String(row[9]) === 'active')
  )
    throw new Error('좋아요를 누를 댓글을 찾을 수 없습니다.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const rows = boardRows_(sheets.likes);
    const index = rows.findIndex(row => String(row[1]) === id && String(row[2]) === session.userId);
    if (index >= 0) sheets.likes.deleteRow(index + 2);
    else sheets.likes.appendRow([Utilities.getUuid(), id, session.userId, nowSeoul_()]);
    return {
      ok: true,
      liked: index < 0,
      likeCount: boardRows_(sheets.likes).filter(row => String(row[1]) === id).length,
    };
  } finally {
    lock.releaseLock();
  }
}

function setBoardCommentLock_(session, requestedId, locked) {
  const id = String(requestedId || '').trim();
  const sheets = boardSheets_();
  const rows = boardRows_(sheets.posts);
  const index = rows.findIndex(row => String(row[0]) === id && String(row[9]) === 'active');
  if (index < 0) throw new Error('게시글을 찾을 수 없습니다.');
  sheets.posts.getRange(index + 2, 14).setValue(!!locked);
  boardLog_(
    session,
    locked ? '댓글 잠금' : '댓글 잠금 해제',
    rows[index][1],
    id,
    '',
    '관리자 설정',
  );
  return { ok: true };
}

function setBoardCoverFile_(session, requestedPostId, requestedFileId) {
  const postId = String(requestedPostId || '').trim();
  const fileId = String(requestedFileId || '').trim();
  const sheets = boardSheets_();
  const posts = boardRows_(sheets.posts);
  const postIndex = posts.findIndex(
    row => String(row[0]) === postId && ['active', 'draft'].includes(String(row[9])),
  );
  if (postIndex < 0 || String(posts[postIndex][1]) !== 'photo')
    throw new Error('사진 게시글을 찾을 수 없습니다.');
  if (session.role !== 'admin' && String(posts[postIndex][4]) !== session.userId)
    throw new Error('본인 사진 게시글만 수정할 수 있습니다.');
  if (
    !boardRows_(sheets.files).some(
      row =>
        String(row[0]) === fileId &&
        String(row[2]) === postId &&
        String(row[12]) === 'active' &&
        String(row[6]) === 'image',
    )
  )
    throw new Error('대표 사진으로 지정할 이미지를 찾을 수 없습니다.');
  sheets.posts.getRange(postIndex + 2, 15).setValue(fileId);
  boardLog_(session, '대표 사진 변경', 'photo', postId, fileId, '대표 이미지 지정');
  return { ok: true };
}

function reorderBoardFiles_(session, requestedPostId, requestedFileIds) {
  const postId = String(requestedPostId || '').trim();
  const sheets = boardSheets_();
  const posts = boardRows_(sheets.posts);
  const post = posts.find(row => String(row[0]) === postId && String(row[9]) === 'active');
  if (!post || (session.role !== 'admin' && String(post[4]) !== session.userId))
    throw new Error('파일 순서를 변경할 권한이 없습니다.');
  const ids = Array.isArray(requestedFileIds) ? requestedFileIds.map(String) : [];
  const files = boardRows_(sheets.files);
  const activeIds = files
    .filter(row => String(row[2]) === postId && String(row[12]) === 'active')
    .map(row => String(row[0]));
  if (ids.length !== activeIds.length || ids.some(id => !activeIds.includes(id)))
    throw new Error('첨부파일 순서 정보가 올바르지 않습니다.');
  ids.forEach((id, order) => {
    const index = files.findIndex(row => String(row[0]) === id);
    sheets.files.getRange(index + 2, 14).setValue(order);
  });
  boardLog_(session, '첨부파일 순서 변경', post[1], postId, '', '파일 순서 저장');
  return { ok: true };
}

// 게시판알림 시트에서 현재 사용자에게 연결된 알림을 읽어 최신 항목을 API 응답으로 변환합니다.
function readBoardNotifications_(session) {
  const rows = boardRows_(boardSheets_().notifications).filter(
    row => String(row[1]) === session.userId,
  );
  return {
    ok: true,
    notifications: rows
      .slice(-100)
      .reverse()
      .map(row => ({
        id: String(row[0]),
        boardId: String(row[2]),
        postId: String(row[3]),
        type: String(row[4]),
        message: String(row[5]),
        createdAt: archiveDate_(row[6]),
        readAt: formatSheetDateForApi_('read_at', row[7]),
      })),
  };
}

function markBoardNotificationsRead_(session) {
  // 알림 시트의 전체 행을 순회해 현재 사용자 소유의 미확인 알림에 읽은 시각을 기록합니다.
  const sheet = boardSheets_().notifications;
  boardRows_(sheet).forEach((row, index) => {
    if (String(row[1]) === session.userId && !row[7])
      sheet.getRange(index + 2, 8).setValue(nowSeoul_());
  });
  return { ok: true };
}

// 게시글·파일·댓글 데이터를 읽어 관리자 통계 응답을 구성합니다. 통계 범위는 시트 전체 데이터입니다.
function readBoardAdminStats_() {
  const sheets = boardSheets_();
  const posts = boardRows_(sheets.posts).filter(row => String(row[9]) === 'active');
  const files = boardRows_(sheets.files).filter(row => String(row[12]) === 'active');
  const comments = boardRows_(sheets.comments).filter(row => String(row[9]) === 'active');
  const authors = {};
  posts.forEach(row => {
    const key = String(row[5] || '');
    authors[key] = (authors[key] || 0) + 1;
  });
  return {
    ok: true,
    stats: {
      totalPosts: posts.length,
      totalViews: posts.reduce((sum, row) => sum + (Number(row[8]) || 0), 0),
      totalComments: comments.length,
      totalFileBytes: files.reduce((sum, row) => sum + (Number(row[8]) || 0), 0),
      byBoard: BOARD_IDS.map(id => ({
        boardId: id,
        postCount: posts.filter(row => String(row[1]) === id).length,
      })),
      byAuthor: Object.entries(authors)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    },
  };
}

// 게시판활동로그 전체 데이터에서 화면에 노출할 로그 행을 읽어 응답 객체로 변환합니다.
function readBoardActivityLogs_() {
  return {
    ok: true,
    logs: boardRows_(boardSheets_().logs)
      .slice(-500)
      .reverse()
      .map(row => ({
        id: String(row[0]),
        userId: String(row[1]),
        userName: String(row[2]),
        action: String(row[3]),
        boardId: String(row[4]),
        postId: String(row[5]),
        targetId: String(row[6]),
        detail: String(row[7]),
        createdAt: archiveDate_(row[8]),
      })),
  };
}

function boardDriveFolder_() {
  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty('BOARD_DRIVE_FOLDER_ID');
  if (folderId) return folderId;
  const name = '졸업생관리프로그램 게시판';
  const folders = DriveApp.getFoldersByName(name);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
  folderId = folder.getId();
  props.setProperty('BOARD_DRIVE_FOLDER_ID', folderId);
  return folderId;
}

function boardUploadStart_(session, request) {
  // 게시판 시트에서 게시글 소유권을 확인하고 첨부파일별 Drive resumable 세션을 생성합니다.
  // 파일 바이트는 받지 않으며 이후 Worker 청크 요청에 쓰일 식별자·파일 메타데이터를 반환합니다.
  const boardId = validBoardId_(request.boardId);
  const postId = String(request.postId || '').trim();
  const inputFiles = Array.isArray(request.files) ? request.files : [];
  if (!postId || !inputFiles.length || inputFiles.length > 30)
    throw new Error('게시글과 첨부 파일을 확인해 주세요.');
  const clientIds = inputFiles.map(file => String(file?.clientId || '').trim());
  if (clientIds.some(clientId => !clientId) || new Set(clientIds).size !== clientIds.length)
    throw new Error('업로드 파일 식별 정보가 올바르지 않습니다. 파일을 다시 선택해 주세요.');
  const sheets = boardSheets_();
  const postRows = boardRows_(sheets.posts);
  const postIndex = postRows.findIndex(
    row =>
      String(row[0]) === postId &&
      String(row[1]) === boardId &&
      ['active', 'draft'].includes(String(row[9])),
  );
  if (postIndex < 0) throw new Error('첨부할 게시글을 찾을 수 없습니다.');
  const post = postRows[postIndex];
  if (session.role !== 'admin' && String(post[4]) !== session.userId)
    throw new Error('본인 게시글에만 파일을 첨부할 수 있습니다.');
  let total = 0;
  const files = inputFiles.map(file => {
    const originalFilename = String(file.name || '');
    const filename = driveSafeFilename_(originalFilename);
    const extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
    const rule = BOARD_ALLOWED_FILES[extension];
    const size = Number(file.size);
    const mimeType = String(file.mimeType || 'application/octet-stream').toLowerCase();
    if (!rule || !filename || !Number.isSafeInteger(size) || size <= 0)
      throw new Error('허용되지 않는 파일이거나 파일 정보가 올바르지 않습니다.');
    if (boardId === 'photo' && rule[1] !== 'image')
      throw new Error('사진 게시판에는 이미지 파일만 첨부할 수 있습니다.');
    if (mimeType !== 'application/octet-stream' && mimeType !== rule[0])
      throw new Error(filename + ' 파일의 MIME 형식이 확장자와 일치하지 않습니다.');
    total += size;
    if (total > 100000000)
      throw new Error('한 번의 업로드에서 파일 합계는 최대 100MB까지 가능합니다.');
    return {
      clientId: String(file.clientId),
      fileId: Utilities.getUuid(),
      originalFilename: originalFilename,
      filename: filename,
      extension: extension,
      mimeType: rule[0],
      fileType: rule[1],
      size: size,
      isCover: file.isCover === true,
    };
  });
  const folderId = boardDriveFolder_();
  const token = ScriptApp.getOAuthToken();
  const uploads = files.map(file => {
    const storedFilename = file.filename;
    const metadata = {
      name: storedFilename,
      mimeType: file.mimeType,
      parents: [folderId],
      appProperties: { boardPostId: postId, boardFileId: file.fileId, boardId: boardId },
      description: '게시판 첨부 파일',
    };
    const response = fetchDriveRequest_(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,parents',
      {
        method: 'post',
        contentType: 'application/json; charset=UTF-8',
        payload: JSON.stringify(metadata),
        muteHttpExceptions: true,
        headers: {
          Authorization: 'Bearer ' + token,
          'X-Upload-Content-Type': file.mimeType,
          'X-Upload-Content-Length': String(file.size),
        },
      },
      'board_upload_start',
    );
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300)
      throw new Error('Google Drive 업로드 준비에 실패했습니다.');
    const headers = response.getAllHeaders();
    const sessionUrl = headers.Location || headers.location;
    if (!sessionUrl) throw new Error('Google Drive가 업로드 세션을 반환하지 않았습니다.');
    return {
      clientId: file.clientId,
      uploadId: file.fileId,
      sessionUrl: String(sessionUrl),
      boardId: boardId,
      postId: postId,
      fileId: file.fileId,
      originalFilename: file.originalFilename,
      storedFilename: storedFilename,
      extension: file.extension,
      mimeType: file.mimeType,
      fileType: file.fileType,
      fileSize: file.size,
      driveFolderId: folderId,
      uploadedBy: session.userId,
      isCover: file.isCover,
    };
  });
  return { ok: true, uploads: uploads };
}

function boardUploadComplete_(session, request) {
  // Drive 저장 결과를 확인하고 게시판파일 시트에 Drive File ID 및 게시글 연결 메타데이터를 추가·갱신합니다.
  const boardId = validBoardId_(request.boardId);
  const fileId = String(request.fileId || '').trim();
  const postId = String(request.postId || '').trim();
  const driveFileId = String(request.driveFileId || '').trim();
  const rows = boardRows_(boardSheets_().posts);
  const post = rows.find(
    row =>
      String(row[0]) === postId &&
      String(row[1]) === boardId &&
      ['active', 'draft'].includes(String(row[9])),
  );
  if (!post || (session.role !== 'admin' && String(post[4]) !== session.userId))
    throw new Error('파일을 연결할 게시글 권한이 없습니다.');
  const token = ScriptApp.getOAuthToken();
  const verify = fetchDriveRequest_(
    'https://www.googleapis.com/drive/v3/files/' +
      encodeURIComponent(driveFileId) +
      '?fields=id,name,mimeType,size,parents,appProperties',
    { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true },
    'board_upload_verify',
  );
  if (verify.getResponseCode() !== 200)
    throw new Error('Google Drive에 저장된 파일을 확인하지 못했습니다.');
  const actual = JSON.parse(verify.getContentText());
  if (
    actual.appProperties?.boardPostId !== postId ||
    actual.appProperties?.boardFileId !== fileId ||
    actual.appProperties?.boardId !== boardId ||
    actual.name !== request.storedFilename ||
    !actual.parents?.includes(String(request.driveFolderId || ''))
  )
    throw new Error('Google Drive 파일 검증에 실패했습니다.');
  const sheet = boardSheets_().files;
  const oldRows = boardRows_(sheet);
  const existing = oldRows.findIndex(row => String(row[0]) === fileId);
  const sortOrder = oldRows.filter(
    row => String(row[2]) === postId && String(row[12]) === 'active',
  ).length;
  const data = [
    fileId,
    boardId,
    postId,
    driveFileId,
    request.originalFilename,
    request.storedFilename,
    request.fileType,
    request.mimeType,
    Number(actual.size) || Number(request.fileSize) || 0,
    request.driveFolderId,
    session.userId,
    nowSeoul_(),
    'active',
    sortOrder,
  ];
  if (existing >= 0) sheet.getRange(existing + 2, 1, 1, data.length).setValues([data]);
  else sheet.appendRow(data);
  if (
    request.isCover === true ||
    !boardRows_(boardSheets_().posts)[rows.findIndex(row => String(row[0]) === postId)][14]
  ) {
    const posts = boardSheets_().posts;
    const postIndex = rows.findIndex(row => String(row[0]) === postId);
    posts.getRange(postIndex + 2, 15).setValue(fileId);
  }
  boardLog_(
    session,
    '파일 업로드',
    boardId,
    postId,
    fileId,
    String(request.originalFilename || ''),
  );
  return {
    ok: true,
    fileId: fileId,
    fileSize: Number(actual.size) || Number(request.fileSize) || 0,
  };
}

function boardDownloadInfo_(session, requestedFileId) {
  // 게시판파일 메타데이터에서 파일 ID를 검색해 게시글 연결 및 권한을 확인하고 Drive 다운로드 정보를 반환합니다.
  const fileId = String(requestedFileId || '').trim();
  const sheets = boardSheets_();
  const file = boardRows_(sheets.files).find(
    row => String(row[0]) === fileId && String(row[12]) === 'active',
  );
  if (!file) throw new Error('다운로드할 파일을 찾을 수 없습니다.');
  const post = boardRows_(sheets.posts).find(
    row => String(row[0]) === String(file[2]) && String(row[9]) === 'active',
  );
  if (!post || String(post[1]) !== String(file[1]))
    throw new Error('게시글에 연결된 파일이 아닙니다.');
  return {
    ok: true,
    driveToken: ScriptApp.getOAuthToken(),
    driveFileId: String(file[3]),
    filename: String(file[4]),
    mimeType: String(file[7]),
    fileSize: Number(file[8]) || 0,
  };
}

function boardPreviewInfo_(session, requestedFileIds) {
  const ids = Array.isArray(requestedFileIds)
    ? [...new Set(requestedFileIds.map(String))].slice(0, 20)
    : [];
  const sheets = boardSheets_();
  const files = boardRows_(sheets.files).filter(row => {
    if (!ids.includes(String(row[0])) || String(row[12]) !== 'active') return false;
    const mimeType = String(row[7] || '');
    return mimeType.startsWith('image/') || mimeType === 'text/plain';
  });
  const posts = boardRows_(sheets.posts);
  const authorized = files.filter(file =>
    posts.some(
      post =>
        String(post[0]) === String(file[2]) &&
        String(post[1]) === String(file[1]) &&
        String(post[9]) === 'active',
    ),
  );
  return {
    ok: true,
    driveToken: ScriptApp.getOAuthToken(),
    files: authorized.map(row => ({
      fileId: String(row[0]),
      driveFileId: String(row[3]),
      filename: String(row[4]),
      mimeType: String(row[7]),
    })),
  };
}

function boardZipInfo_(session, requestedBoardId, requestedPostId) {
  const boardId = validBoardId_(requestedBoardId);
  const postId = String(requestedPostId || '').trim();
  const sheets = boardSheets_();
  if (
    !boardRows_(sheets.posts).some(
      row => String(row[0]) === postId && String(row[1]) === boardId && String(row[9]) === 'active',
    )
  )
    throw new Error('게시글을 찾을 수 없습니다.');
  const files = boardRows_(sheets.files).filter(
    row => String(row[2]) === postId && String(row[1]) === boardId && String(row[12]) === 'active',
  );
  if (!files.length) throw new Error('압축할 첨부파일이 없습니다.');
  if (files.some(row => Number(row[8]) > 0xffffffff))
    throw new Error('ZIP 형식에서 처리할 수 없는 파일 크기입니다.');
  return {
    ok: true,
    driveToken: ScriptApp.getOAuthToken(),
    boardId: boardId,
    postId: postId,
    files: files.map(row => ({
      fileId: String(row[0]),
      driveFileId: String(row[3]),
      filename: String(row[4]),
      mimeType: String(row[7]),
      fileSize: Number(row[8]) || 0,
    })),
  };
}

function prepareBoardFileDelete_(session, requestedFileId) {
  const fileId = String(requestedFileId || '').trim();
  const sheets = boardSheets_();
  const rows = boardRows_(sheets.files);
  const index = rows.findIndex(
    row => String(row[0]) === fileId && ['active', 'delete_pending'].includes(String(row[12])),
  );
  if (index < 0) throw new Error('삭제할 파일을 찾을 수 없습니다.');
  const file = rows[index];
  const post = boardRows_(sheets.posts).find(
    row => String(row[0]) === String(file[2]) && String(row[9]) === 'active',
  );
  if (!post || (session.role !== 'admin' && String(post[4]) !== session.userId))
    throw new Error('파일을 삭제할 권한이 없습니다.');
  sheets.files.getRange(index + 2, 13).setValue('delete_pending');
  return {
    ok: true,
    fileId: fileId,
    driveFileId: String(file[3]),
    driveToken: ScriptApp.getOAuthToken(),
  };
}

function completeBoardFileDelete_(session, requestedFileId) {
  const fileId = String(requestedFileId || '').trim();
  const sheet = boardSheets_().files;
  const rows = boardRows_(sheet);
  const index = rows.findIndex(
    row => String(row[0]) === fileId && String(row[12]) === 'delete_pending',
  );
  if (index < 0) throw new Error('삭제 상태의 파일을 찾을 수 없습니다.');
  sheet.getRange(index + 2, 13).setValue('deleted');
  boardLog_(session, '첨부파일 삭제', rows[index][1], rows[index][2], fileId, rows[index][4]);
  return { ok: true };
}

function prepareBoardPurge_(requestedId) {
  const postId = String(requestedId || '').trim();
  const sheets = boardSheets_();
  const post = boardRows_(sheets.posts).find(
    row => String(row[0]) === postId && String(row[9]) === 'deleted',
  );
  if (!post) throw new Error('영구 삭제할 게시글을 찾을 수 없습니다.');
  const files = boardRows_(sheets.files)
    .filter(
      row => String(row[2]) === postId && ['active', 'delete_failed'].includes(String(row[12])),
    )
    .map(row => ({ fileId: String(row[0]), driveFileId: String(row[3]) }));
  return { ok: true, postId: postId, files: files, driveToken: ScriptApp.getOAuthToken() };
}

function completeBoardPurge_(session, requestedId, failedFileIds) {
  const postId = String(requestedId || '').trim();
  const failed = new Set((Array.isArray(failedFileIds) ? failedFileIds : []).map(String));
  const sheets = boardSheets_();
  const fileRows = boardRows_(sheets.files);
  fileRows.forEach((row, index) => {
    if (String(row[2]) === postId)
      sheets.files
        .getRange(index + 2, 13)
        .setValue(failed.has(String(row[0])) ? 'delete_failed' : 'deleted');
  });
  const postRows = boardRows_(sheets.posts);
  const index = postRows.findIndex(
    row => String(row[0]) === postId && String(row[9]) === 'deleted',
  );
  if (index < 0) throw new Error('게시글을 찾을 수 없습니다.');
  if (failed.size)
    throw new Error('일부 Drive 파일을 삭제하지 못했습니다. 관리자 확인 후 다시 시도해 주세요.');
  sheets.posts.getRange(index + 2, 10).setValue('purged');
  boardRows_(sheets.comments).forEach((row, commentIndex) => {
    if (String(row[2]) === postId)
      sheets.comments.getRange(commentIndex + 2, 10).setValue('purged');
  });
  boardLog_(
    session,
    '게시글 영구 삭제',
    postRows[index][1],
    postId,
    '',
    String(postRows[index][2]),
  );
  return { ok: true };
}

function boardBridge_(request, callback) {
  const expected = PropertiesService.getScriptProperties().getProperty('ARCHIVE_BRIDGE_SECRET');
  if (!expected || String(request.bridgeSecret || '') !== expected)
    throw new Error('게시판 서버 연결 인증에 실패했습니다.');
  return callback();
}

// 자동 생성 대상(사용자, 상담, 로그 등)에만 사용합니다. 사용자가 만든 일정 시트 검증에는 사용하지 않습니다.
function schemaFor_(name, headers) {
  if (JSON.stringify(headers) === JSON.stringify(DATA_HEADERS))
    return {
      name: String(name),
      aliases: [],
      headers: DATA_HEADERS,
      localHeaders: GRADUATE_LOCAL_HEADERS,
    };
  const definitions = [
    { name: USERS_SHEET, headers: USER_HEADERS },
    { name: LOGS_SHEET, headers: LOG_HEADERS },
    { name: COUNSELINGS_SHEET, headers: COUNSELING_HEADERS },
    { name: STUDENT_TRANSFERS_SHEET, headers: STUDENT_TRANSFER_HEADERS },
    { name: CURRENT_STUDENTS_SHEET, headers: CURRENT_STUDENT_HEADERS },
    { name: ARCHIVE_POSTS_SHEET, headers: ARCHIVE_POST_HEADERS },
    { name: ARCHIVE_FILES_SHEET, headers: ARCHIVE_FILE_HEADERS },
    { name: BOARD_POSTS_SHEET, headers: BOARD_POST_HEADERS },
    { name: BOARD_FILES_SHEET, headers: BOARD_FILE_HEADERS },
    { name: BOARD_COMMENTS_SHEET, headers: BOARD_COMMENT_HEADERS },
    { name: BOARD_LIKES_SHEET, headers: BOARD_LIKE_HEADERS },
    { name: BOARD_NOTIFICATIONS_SHEET, headers: BOARD_NOTIFICATION_HEADERS },
    { name: BOARD_LOGS_SHEET, headers: BOARD_LOG_HEADERS },
  ];
  const definition = definitions.find(
    item =>
      (item.name === name || (SHEET_NAME_ALIASES[item.name] || []).includes(name)) &&
      JSON.stringify(item.headers) === JSON.stringify(headers),
  );
  if (!definition) return null;
  return {
    name: definition.name,
    aliases: SHEET_NAME_ALIASES[definition.name] || [],
    headers: definition.headers,
    localHeaders: definition.headers.map(header =>
      definition.name === COUNSELINGS_SHEET && header === 'content'
        ? '상담내용'
        : LOCAL_COLUMN_NAMES[header],
    ),
  };
}
function schemaSheet_(
  name,
  headers,
  createIfMissing,
  allowOptionalMissing,
  allowEmpty,
  initializeEmpty,
) {
  // 시트명 별칭과 헤더를 검증한 뒤 한글/영문 실제 컬럼을 내부 스키마 순서로 매핑하는 어댑터를 만듭니다.
  // getDataRange는 물리 시트 전체를 읽으며, 컬럼이 비연속이면 범위 어댑터에서 셀 단위 호출이 발생할 수 있습니다.
  const schema = schemaFor_(name, headers);
  if (!schema) throw new Error('등록되지 않은 시트 스키마입니다: ' + name);
  const book = openSpreadsheet_();
  const names = [schema.name].concat(schema.aliases);
  const matches = book.getSheets().filter(sheet => names.includes(sheet.getName()));
  if (matches.length > 1)
    throw new Error(
      '동일 데이터의 영문 시트와 한글 시트가 함께 있습니다. 데이터가 섞이지 않도록 관리자 확인이 필요합니다: ' +
        names.join(', '),
    );
  let rawSheet = matches[0] || null;
  if (!rawSheet && !createIfMissing) return null;
  if (!rawSheet) {
    rawSheet = book.insertSheet(schema.name);
    rawSheet.getRange(1, 1, 1, schema.localHeaders.length).setValues([schema.localHeaders]);
  }
  if (rawSheet.getLastRow() === 0 && initializeEmpty) {
    rawSheet.getRange(1, 1, 1, schema.localHeaders.length).setValues([schema.localHeaders]);
  } else if (rawSheet.getLastRow() === 0 && allowEmpty) {
    return { getName: () => rawSheet.getName(), getLastRow: () => 0 };
  } else if (rawSheet.getLastRow() === 0) {
    if (!createIfMissing) throw new Error(rawSheet.getName() + ' 시트에 헤더가 없습니다.');
    rawSheet.getRange(1, 1, 1, schema.localHeaders.length).setValues([schema.localHeaders]);
  }
  const actualHeaders = rawSheet
    .getRange(1, 1, 1, rawSheet.getLastColumn())
    .getDisplayValues()[0]
    .map(value => String(value || '').trim());
  const localizedToCanonical = Object.fromEntries(
    schema.headers.map((header, index) => [schema.localHeaders[index], header]),
  );
  const actualColumnByCanonical = {};
  const unknownHeaders = [];
  actualHeaders.forEach((header, index) => {
    const canonical = schema.headers.includes(header) ? header : localizedToCanonical[header];
    if (!canonical) {
      if (header) unknownHeaders.push(header);
      return;
    }
    if (actualColumnByCanonical[canonical] != null)
      throw new Error(rawSheet.getName() + ' 시트에 중복 컬럼이 있습니다: ' + header);
    actualColumnByCanonical[canonical] = index + 1;
  });
  const missingHeaders = schema.headers.filter(header => actualColumnByCanonical[header] == null);
  if ((!allowOptionalMissing && missingHeaders.length) || unknownHeaders.length)
    throw new Error(
      rawSheet.getName() +
        ' 시트의 헤더 구성이 맞지 않습니다. 누락: ' +
        (missingHeaders.join(', ') || '없음') +
        ', 미지원: ' +
        (unknownHeaders.join(', ') || '없음') +
        '. 시트 데이터는 변경하지 않았습니다.',
    );
  const columns = schema.headers.map(header => actualColumnByCanonical[header] || 0);
  const actualSchemaHeaders = schema.headers.filter(
    header => actualColumnByCanonical[header] != null,
  );
  const adaptRows = rows =>
    rows.map(row => columns.map(column => (column ? row[column - 1] : '') ?? ''));
  const makeRange = (row, column, numRows, numColumns) => {
    const selected = columns.slice(column - 1, column - 1 + numColumns);
    const isContiguous =
      selected.length > 0 &&
      selected.every(
        (actualColumn, index) => actualColumn > 0 && actualColumn === selected[0] + index,
      );
    const readSelectedColumns = displayValues => {
      const existingColumns = selected.filter(actualColumn => actualColumn > 0);
      if (!existingColumns.length)
        return Array.from({ length: numRows }, () => selected.map(() => ''));
      const firstColumn = Math.min(...existingColumns);
      const lastColumn = Math.max(...existingColumns);
      const values = rawSheet
        .getRange(row, firstColumn, numRows, lastColumn - firstColumn + 1)
        [displayValues ? 'getDisplayValues' : 'getValues']();
      return values.map(line =>
        selected.map(actualColumn =>
          actualColumn ? (line[actualColumn - firstColumn] ?? '') : '',
        ),
      );
    };
    return {
      getValues: () => {
        return measurePerformance_(
          'sheets.read_values',
          { sheet: schema.name, rows: numRows, columns: selected.length },
          () => {
            if (isContiguous)
              return rawSheet.getRange(row, selected[0], numRows, selected.length).getValues();
            return readSelectedColumns(false);
          },
        );
      },
      getDisplayValues: () => {
        return measurePerformance_(
          'sheets.read_display_values',
          { sheet: schema.name, rows: numRows, columns: selected.length },
          () => {
            if (isContiguous)
              return rawSheet.getRange(row, selected[0], numRows, selected.length).getDisplayValues();
            return readSelectedColumns(true);
          },
        );
      },
      setValue: value => {
        if (selected.length !== 1 || numRows !== 1 || !selected[0])
          throw new Error('단일 셀에만 값을 설정할 수 있습니다.');
        return measurePerformance_(
          'sheets.write_value',
          { sheet: schema.name, rows: 1, columns: 1 },
          () => rawSheet.getRange(row, selected[0]).setValue(value),
        );
      },
      setValues: values => {
        return measurePerformance_(
          'sheets.write_values',
          { sheet: schema.name, rows: values.length, columns: selected.length },
          () => {
            if (!values.length) return;
            if (isContiguous) {
              rawSheet.getRange(row, selected[0], values.length, selected.length).setValues(values);
              return;
            }
            let startIndex = 0;
            while (startIndex < selected.length) {
              if (!selected[startIndex]) {
                startIndex++;
                continue;
              }
              let endIndex = startIndex + 1;
              while (
                endIndex < selected.length &&
                selected[endIndex] === selected[endIndex - 1] + 1
              )
                endIndex++;
              const rangeValues = values.map(line => line.slice(startIndex, endIndex));
              rawSheet
                .getRange(
                  row,
                  selected[startIndex],
                  rangeValues.length,
                  endIndex - startIndex,
                )
                .setValues(rangeValues);
              startIndex = endIndex;
            }
          },
        );
      },
    };
  };
  return {
    getName: () => rawSheet.getName(),
    getLastRow: () => rawSheet.getLastRow(),
    getSchemaHeaders: () => actualSchemaHeaders.slice(),
    getDataRange: () => ({
      getValues: () =>
        measurePerformance_(
          'sheets.read_data_range',
          { sheet: schema.name },
          () => adaptRows(rawSheet.getDataRange().getValues()),
        ),
      getDisplayValues: () =>
        measurePerformance_(
          'sheets.read_display_data_range',
          { sheet: schema.name },
          () => adaptRows(rawSheet.getDataRange().getDisplayValues()),
        ),
    }),
    getRange: (row, column, numRows, numColumns) =>
      makeRange(row, column, numRows || 1, numColumns || 1),
    appendRow: row => {
      const values = Array(rawSheet.getLastColumn()).fill('');
      columns.forEach((actualColumn, index) => {
        if (actualColumn) values[actualColumn - 1] = row[index] == null ? '' : row[index];
      });
      rawSheet.appendRow(values);
    },
    deleteRow: row => rawSheet.deleteRow(row),
  };
}
function getOrCreateSheet_(name, headers) {
  // 지정 시트를 스프레드시트에서 조회하고 없으면 헤더 행을 가진 새 시트를 만듭니다.
  // 일반 시트 접근의 시작점이며 schemaSheet_를 통해 한글/영문 헤더와 컬럼 순서를 매핑합니다.
  return schemaSheet_(name, headers, true);
}
function now_() {
  return formatKoreanDateObject_(new Date(), false);
}
function nowSeoul_() {
  return formatKoreanDateObject_(new Date(), false);
}
function hash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2))
    .join('');
}
function hashPassword_(password) {
  const iterations = 60000;
  const salt = Utilities.getUuid().replace(/-/g, '');
  return (
    'pbkdf2$' + iterations + '$' + salt + '$' + bytesToHex_(pbkdf2_(password, salt, iterations))
  );
}
function verifyPassword_(password, stored) {
  if (!stored.startsWith('pbkdf2$')) return hash_(password) === stored;
  const parts = stored.split('$');
  if (parts.length !== 4 || Number(parts[1]) < 10000 || Number(parts[1]) > 200000) return false;
  return bytesToHex_(pbkdf2_(password, parts[2], Number(parts[1]))) === parts[3];
}
function pbkdf2_(password, saltHex, iterations) {
  const salt = [];
  for (let i = 0; i < saltHex.length; i += 2) salt.push(parseInt(saltHex.slice(i, i + 2), 16));
  const seed = salt.concat([0, 0, 0, 1]);
  let u = Utilities.computeHmacSha256Signature(seed, password, Utilities.Charset.UTF_8);
  const result = u.slice();
  for (let round = 1; round < iterations; round++) {
    u = Utilities.computeHmacSha256Signature(u, password, Utilities.Charset.UTF_8);
    for (let i = 0; i < result.length; i++) result[i] ^= u[i];
  }
  return result;
}
function bytesToHex_(bytes) {
  return bytes.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}
function hashPasswordForSetup() {
  const response = SpreadsheetApp.getUi().prompt(
    '비밀번호 해시 생성',
    '해시로 변환할 비밀번호를 입력하세요.',
    SpreadsheetApp.getUi().ButtonSet.OK_CANCEL,
  );
  if (response.getSelectedButton() === SpreadsheetApp.getUi().Button.OK) {
    if (response.getResponseText().length < 10)
      throw new Error('비밀번호는 10자 이상이어야 합니다.');
    Logger.log(hashPassword_(response.getResponseText()));
  }
}
function respond_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
