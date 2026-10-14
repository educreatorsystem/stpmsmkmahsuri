const STPM_SHEET_ID = '1GvN54iV0Paq2Fkn2X-MKI3Bm-YsJpzsdsxpwbheM-_Y';
const STPM_VERSION = 3;
const STPM_HEADERS = ['MURID_ID', 'KELAS', 'NAMA_MURID', 'PENTAKSIRAN', 'SUBJEK', 'GRED', 'NILAI_GRED', 'DIKEMAS_KINI'];
const STPM_POINTS = { A: 4, 'A-': 3.67, 'B+': 3.33, B: 3, 'B-': 2.67, 'C+': 2.33, C: 2, 'C-': 1.67, 'D+': 1.33, D: 1, F: 0 };
const STPM_SUBJECTS = ['pa', 'geo', 'bm', 'sej', 'kmk', 'eko', 'btamil'];
const STPM_ASSESSMENTS = ['sem1', 'sem2', 'sem3', 'ul1', 'ul2', 'kk'];

// Run once to create the storage tabs without changing existing records.
function initializeSTPM() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    stpmSheets_();
    console.log('Sheet STPM_Gred, STPM_Sasaran dan STPM_Operasi telah disediakan.');
    return stpmStatus_();
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action === 'load') return stpmJson_(stpmRequest({ action: 'load' }));
  if (params.action !== 'bridge') {
    if (params.action && params.action !== 'status') {
      return stpmJson_({ ok: false, error: 'Tindakan tidak sah.' });
    }
    return stpmJson_(stpmStatus_());
  }
  if (!/^[a-zA-Z0-9_-]{12,100}$/.test(params.channel || '')) throw new Error('Channel tidak sah.');
  const origin = String(params.origin || '');
  if (origin !== 'null' && !/^https?:\/\/[^/\s?#]+$/.test(origin)) throw new Error('Origin tidak sah.');
  const config = JSON.stringify({ channel: params.channel, origin: origin }).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    'const config=' + config + ';' +
    'const destination=config.origin==="null"?"*":config.origin;' +
    'function reply(id,payload){window.top.postMessage({type:"stpm-response",channel:config.channel,id:id,payload:payload},destination);}' +
    'window.addEventListener("message",function(event){' +
      'const data=event.data;' +
      'if(event.source!==window.top||event.origin!==config.origin||!data||data.type!=="stpm-request"||data.channel!==config.channel)return;' +
      'google.script.run.withSuccessHandler(function(result){reply(data.id,result);})' +
      '.withFailureHandler(function(error){reply(data.id,{ok:false,error:error.message||"Gagal menyambung Google Sheet."});})' +
      '.stpmRequest(data.request);' +
    '});' +
    'window.top.postMessage({type:"stpm-ready",channel:config.channel},destination);' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// The website uses the iframe bridge so it can read the save acknowledgement.
function doPost(e) {
  try {
    const contents = e && e.postData && e.postData.contents;
    if (!contents || contents.length > 250000) throw new Error('Saiz permintaan tidak sah.');
    return stpmJson_(stpmRequest(JSON.parse(contents)));
  } catch (error) {
    return stpmJson_({ ok: false, error: error.message || 'Permintaan tidak sah.' });
  }
}

function stpmJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function stpmStatus_() {
  try {
    const book = SpreadsheetApp.openById(STPM_SHEET_ID);
    const tabs = ['STPM_Gred', 'STPM_Sasaran', 'STPM_Operasi'].map(function(name) {
      const sheet = book.getSheetByName(name);
      return { name: name, exists: Boolean(sheet), rows: sheet ? Math.max(0, sheet.getLastRow() - 1) : 0 };
    });
    return { ok: true, service: 'STPM MAHSURI', version: STPM_VERSION, accessRequired: false,
      spreadsheetId: STPM_SHEET_ID, initialized: tabs.every(function(tab) { return tab.exists; }), tabs: tabs };
  } catch (error) {
    return { ok: false, version: STPM_VERSION, accessRequired: false,
      error: error.message || 'Google Sheet tidak dapat dibuka.' };
  }
}

function stpmRequest(request) {
  if (!request || (request.action !== 'load' && request.action !== 'save')) return { ok: false, error: 'Tindakan tidak sah.' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, error: 'Sheet sedang digunakan. Cuba semula.' };
  try {
    const sheets = stpmSheets_();
    if (request.action === 'load') return stpmSnapshot_(sheets);
    if (request.action !== 'save') throw new Error('Tindakan tidak sah.');
    const operationId = String(request.operationId || '');
    if (!/^[a-zA-Z0-9_-]{12,100}$/.test(operationId)) throw new Error('ID operasi tidak sah.');
    if (!Array.isArray(request.changes) || !request.changes.length || request.changes.length > 200) {
      throw new Error('Setiap simpanan mesti mengandungi 1 hingga 200 perubahan.');
    }
    const changes = request.changes.map(stpmValidateChange_);
    const receipts = stpmRows_(sheets.operations);
    if (!receipts.some(function(row) { return row[0] === operationId; })) {
      const grades = stpmRows_(sheets.grades);
      const targets = stpmRows_(sheets.targets);
      const timestamp = new Date().toISOString();
      changes.forEach(function(change) {
        if (change.kind === 'grade') {
          stpmUpsert_(grades, change, timestamp);
          stpmUpsert_(targets, change, timestamp);
        } else {
          stpmUpsert_(targets, change, timestamp);
        }
      });
      stpmWriteRows_(sheets.grades, grades);
      stpmWriteRows_(sheets.targets, targets);
      SpreadsheetApp.flush();
      sheets.operations.appendRow([operationId, timestamp]);
      SpreadsheetApp.flush();
    }
    const result = stpmSnapshot_(sheets);
    result.operationId = operationId;
    return result;
  } catch (error) {
    return { ok: false, error: error.message || 'Simpanan gagal.' };
  } finally {
    lock.releaseLock();
  }
}

function stpmSheets_() {
  const book = SpreadsheetApp.openById(STPM_SHEET_ID);
  return {
    grades: stpmEnsureSheet_(book, 'STPM_Gred', STPM_HEADERS),
    targets: stpmEnsureSheet_(book, 'STPM_Sasaran', STPM_HEADERS),
    operations: stpmEnsureSheet_(book, 'STPM_Operasi', ['ID_OPERASI', 'MASA'])
  };
}

function stpmEnsureSheet_(book, name, headers) {
  let sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (JSON.stringify(actual) !== JSON.stringify(headers)) throw new Error('Header sheet ' + name + ' tidak sepadan.');
  }
  return sheet;
}

function stpmRows_(sheet) {
  const count = sheet.getLastRow() - 1;
  return count > 0 ? sheet.getRange(2, 1, count, sheet.getLastColumn()).getValues() : [];
}

function stpmValidateChange_(value) {
  if (!value || (value.kind !== 'grade' && value.kind !== 'target')) throw new Error('Jenis rekod tidak sah.');
  const studentId = String(value.studentId || '');
  const separator = studentId.indexOf('::');
  const className = studentId.slice(0, separator);
  const name = studentId.slice(separator + 2);
  if (separator < 1 || !/^P[12][A-Z0-9]+$/.test(className) || !name.trim() || studentId.length > 350) {
    throw new Error('ID murid tidak sah.');
  }
  const subjectId = String(value.subjectId || '');
  const assessmentId = String(value.assessmentId || '');
  const grade = String(value.value == null ? '' : value.value).replace('\u2212', '-');
  if (STPM_SUBJECTS.indexOf(subjectId) < 0 || STPM_ASSESSMENTS.indexOf(assessmentId) < 0) throw new Error('Subjek atau pentaksiran tidak sah.');
  if (assessmentId === 'kk' && ['pa', 'geo', 'sej'].indexOf(subjectId) < 0) throw new Error('Subjek ini tiada KK.');
  if (grade && !Object.prototype.hasOwnProperty.call(STPM_POINTS, grade)) throw new Error('Gred tidak sah.');
  return { kind: value.kind, studentId: studentId, className: className, name: name,
    subjectId: subjectId, assessmentId: assessmentId, value: grade };
}

function stpmUpsert_(rows, change, timestamp) {
  const row = [change.studentId, change.className, change.name, change.assessmentId,
    change.subjectId, change.value, change.value ? STPM_POINTS[change.value] : '', timestamp];
  const index = rows.findIndex(function(existing) {
    return existing[0] === change.studentId && existing[3] === change.assessmentId && existing[4] === change.subjectId;
  });
  if (index >= 0) rows[index] = row;
  else rows.push(row);
}

function stpmWriteRows_(sheet, rows) {
  if (!rows.length) return;
  if (sheet.getMaxRows() < rows.length + 1) sheet.insertRowsAfter(sheet.getMaxRows(), rows.length + 1 - sheet.getMaxRows());
  const safeRows = rows.map(function(row) {
    return row.map(function(value) {
      return typeof value === 'string' && /^[=+@-]/.test(value) ? "'" + value : value;
    });
  });
  sheet.getRange(2, 1, rows.length, STPM_HEADERS.length).setValues(safeRows);
  sheet.getRange(2, 7, rows.length, 1).setNumberFormat('0.00');
}

function stpmSnapshot_(sheets) {
  const records = {};
  const targets = {};
  stpmRows_(sheets.grades).forEach(function(row) {
    if (!row[0]) return;
    if (!records[row[0]]) records[row[0]] = {};
    if (!records[row[0]][row[3]]) records[row[0]][row[3]] = {};
    records[row[0]][row[3]][row[4]] = String(row[5] || '');
  });
  stpmRows_(sheets.targets).forEach(function(row) {
    if (!row[0]) return;
    if (!targets[row[0]]) targets[row[0]] = {};
    if (!targets[row[0]][row[4]]) targets[row[0]][row[4]] = {};
    targets[row[0]][row[4]][row[3]] = String(row[5] || '');
  });
  return { ok: true, version: STPM_VERSION, records: records, targets: targets, updatedAt: new Date().toISOString() };
}
