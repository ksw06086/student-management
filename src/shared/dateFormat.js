const SEOUL_TIME_ZONE = 'Asia/Seoul';
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const ENGLISH_MONTHS = {
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

function validYmd(year, month, day) {
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function dateOnlyResult(year, month, day) {
  if (!validYmd(year, month, day)) return null;
  // Noon UTC is midday in Seoul and preserves the civil date for weekday calculation.
  return { date: new Date(Date.UTC(year, month - 1, day, 12)), dateOnly: true };
}

function parseSeoulDateTime(year, month, day, hour, minute, second = 0, millisecond = 0) {
  if (!validYmd(year, month, day) || hour > 23 || minute > 59 || second > 59) return null;
  const date = new Date(
    `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}+09:00`,
  );
  return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false };
}

/** Parse known project, Sheets, ISO, and legacy JavaScript date strings without guessing unknown formats. */
export function parseStoredDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : { date: value, dateOnly: false };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (Number.isInteger(value) && String(Math.abs(value)).length === 10)
      return { date: new Date(value * 1000), dateOnly: false };
    if (Number.isInteger(value) && String(Math.abs(value)).length === 13)
      return { date: new Date(value), dateOnly: false };
    if (value >= 20000 && value < 100000) {
      const wholeDays = Math.floor(value);
      const civilDate = new Date(Date.UTC(1899, 11, 30 + wholeDays));
      const year = civilDate.getUTCFullYear();
      const month = civilDate.getUTCMonth() + 1;
      const day = civilDate.getUTCDate();
      const dayFraction = value - wholeDays;
      if (dayFraction < 0.0000001) return dateOnlyResult(year, month, day);
      const seconds = Math.round(dayFraction * 24 * 60 * 60);
      return parseSeoulDateTime(
        year,
        month,
        day,
        Math.floor(seconds / 3600),
        Math.floor((seconds % 3600) / 60),
        seconds % 60,
      );
    }
    return null;
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^-?\d{10}$/.test(text) || /^\d{13}$/.test(text)) return parseStoredDate(Number(text));

  let match = /^(\d{4})(\d{2})(\d{2})$/.exec(text);
  if (match) return dateOnlyResult(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) return dateOnlyResult(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (match) return dateOnlyResult(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (match) return dateOnlyResult(Number(match[3]), Number(match[1]), Number(match[2]));
  match = /^(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
    text,
  );
  if (match) {
    const [, year, month, day, hour, minute, second = '0'] = match;
    return hour === undefined
      ? dateOnlyResult(Number(year), Number(month), Number(day))
      : parseSeoulDateTime(
          Number(year),
          Number(month),
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
        );
  }
  match = /^(\d{4})\.(\d{2})\.(\d{2})\(([^)]{1,12})\)(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/.exec(
    text,
  );
  if (match) {
    const [, year, month, day, , hour, minute, second] = match;
    return hour === undefined
      ? dateOnlyResult(Number(year), Number(month), Number(day))
      : parseSeoulDateTime(
          Number(year),
          Number(month),
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
        );
  }
  match = /^(?:[A-Za-z]{3},?\s+)?(?:(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})|([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4}))$/.exec(
    text,
  );
  if (match) {
    const [, dayFirstDay, dayFirstMonth, dayFirstYear, monthFirstMonth, monthFirstDay, monthFirstYear] =
      match;
    const year = Number(dayFirstYear || monthFirstYear);
    const month = ENGLISH_MONTHS[(dayFirstMonth || monthFirstMonth).toLowerCase()];
    const day = Number(dayFirstDay || monthFirstDay);
    return month ? dateOnlyResult(year, month, day) : null;
  }

  // The display form is also accepted so already formatted counseling values stay editable.
  match = /^(\d{4})\.(\d{2})\.(\d{2})\(([월화수목금토일])\)(?: (\d{2}):(\d{2}):(\d{2}))?$/.exec(
    text,
  );
  if (match) {
    const [, y, m, d, , h, min, sec] = match;
    return h === undefined
      ? dateOnlyResult(Number(y), Number(m), Number(d))
      : parseSeoulDateTime(Number(y), Number(m), Number(d), Number(h), Number(min), Number(sec));
  }

  // Date-only strings with a time but no zone come from existing Apps Script values; interpret them as Seoul time.
  match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(text);
  if (match) {
    const [, y, m, d, h, min, sec = '0', ms = '0'] = match;
    return parseSeoulDateTime(
      Number(y),
      Number(m),
      Number(d),
      Number(h),
      Number(min),
      Number(sec),
      Number(ms.padEnd(3, '0')),
    );
  }

  const isoDateTime =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})$/i;
  const legacyDateString =
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+GMT[+-]\d{4}(?:\s+\([^)]*\))?$/i;
  if (!isoDateTime.test(text) && !legacyDateString.test(text)) return null;
  if (isoDateTime.test(text)) {
    const [dateText, timeText] = text.split('T');
    const [year, month, day] = dateText.split('-').map(Number);
    const [hour, minute, second = '0'] = timeText
      .match(/^\d{2}:\d{2}(?::\d{2})?/)[0]
      .split(':')
      .map(Number);
    if (!validYmd(year, month, day) || hour > 23 || minute > 59 || second > 59) return null;
  }
  const normalized = text.replace(/\s+\([^)]*\)$/, '');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false };
}

function dateParts(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('ko-KR', {
      timeZone: SEOUL_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map(part => [part.type, part.value]),
  );
  const weekday = WEEKDAYS.find(day => parts.weekday.startsWith(day)) || '';
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    weekday,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function formatParts(parts) {
  return `${parts.year}.${parts.month}.${parts.day}(${parts.weekday})`;
}

export function formatKoreanDate(value) {
  if (value == null || value === '') return '';
  const parsed = parseStoredDate(value);
  if (!parsed) return String(value);
  return formatParts(dateParts(parsed.date));
}

export function formatKoreanDateTime(value) {
  if (value == null || value === '') return '';
  const parsed = parseStoredDate(value);
  if (!parsed) return String(value);
  const parts = dateParts(parsed.date);
  // Date-only cells have no stored clock time; midnight is a display-only placeholder.
  return `${formatParts(parts)} ${parsed.dateOnly ? '00' : parts.hour}:${parsed.dateOnly ? '00' : parts.minute}:${parsed.dateOnly ? '00' : parts.second}`;
}

export function toDateInputValue(value) {
  const parsed = parseStoredDate(value);
  if (!parsed) return '';
  const parts = dateParts(parsed.date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Return an Asia/Seoul civil datetime value suitable for input[type="datetime-local"]. */
export function toDateTimeLocalValue(value) {
  const parsed = parseStoredDate(value);
  if (!parsed) return '';
  const parts = dateParts(parsed.date);
  return `${parts.year}-${parts.month}-${parts.day}T${parsed.dateOnly ? '00' : parts.hour}:${parsed.dateOnly ? '00' : parts.minute}:${parsed.dateOnly ? '00' : parts.second}`;
}

export function hasStoredTime(value) {
  const parsed = parseStoredDate(value);
  return Boolean(parsed && !parsed.dateOnly);
}

// Backward-compatible export used by transfer detail rendering.
export function formatKoreanPreservedDate(value, { dateOnly = false } = {}) {
  if (value == null || value === '') return '';
  const parsed = parseStoredDate(value);
  if (!parsed) return String(value);
  const parts = dateParts(parsed.date);
  return dateOnly || parsed.dateOnly
    ? `${formatParts(parts)} 00:00:00`
    : `${formatParts(parts)} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function formatTransferDetailForDisplay(value) {
  if (!value) return '';
  return String(value)
    .split(/\r?\n/)
    .map(line => {
      const match =
        /^(생년월일|재학생 최초 등록일|재학생 최종 수정일|재학생 졸업 전환일):\s*(.*)$/.exec(line);
      if (!match || !match[2]) return line;
      return `${match[1]}: ${formatKoreanPreservedDate(match[2], { dateOnly: match[1] === '생년월일' })}`;
    })
    .join('\n');
}
