/**
 * Backend for جمعية رباط website + admin CMS.
 *
 * SETUP (run once from Apps Script editor):
 * 1) Attach this script to a private Google Sheet.
 * 2) Run setupRibatAdmin() and copy the generated username/password from Execution log.
 * 3) Deploy > New deployment > Web app. Execute as: Me. Access: Anyone.
 * 4) Put the Web App URL in assets/js/config.js -> forms.endpoint.
 *
 * Security notes:
 * - Admin credentials live in Script Properties, not in the public GitHub site.
 * - Sessions expire after 6 hours.
 * - Keep the Google Sheet private to authorized staff.
 */

var RIBAT_REQUEST_SHEETS = {
  beneficiary: 'المستفيدون',
  volunteer: 'التطوع_والشراكات',
  contact: 'التواصل'
};
var RIBAT_HEADERS = ['وقت الاستلام','نوع النموذج','الاسم','الجوال','البريد','الفئة العمرية','نوع الخدمة/المشاركة','طريقة التواصل','الموضوع','التفاصيل','الموافقة','الحالة'];
var CONTENT_PREFIX = 'SITE_CONTENT_';
var CONTENT_COUNT_KEY = 'SITE_CONTENT_CHUNKS';

function doGet(e) {
  try {
    var action = String((e && e.parameter && e.parameter.action) || '');
    if (action === 'publicContent') {
      return json_({ok:true, content:getSiteContent_()});
    }
    return json_({ok:true, service:'Ribat CMS'});
  } catch (err) {
    return json_({ok:false, error:String(err)});
  }
}

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = String(data.action || (data.formType ? 'formSubmit' : ''));

    if (action === 'formSubmit') return handleFormSubmit_(data);
    if (action === 'login') return handleLogin_(data);

    var session = requireAdmin_(data.token);
    if (action === 'adminContentSave') {
      saveSiteContent_(data.content || {});
      return json_({ok:true});
    }
    if (action === 'adminRequestsList') return json_({ok:true, records:listRequests_()});
    if (action === 'adminRequestStatus') {
      updateRequestStatus_(data.sheetName, Number(data.row), String(data.status || 'جديد'));
      return json_({ok:true});
    }
    if (action === 'adminRequestDelete') {
      deleteRequest_(data.sheetName, Number(data.row));
      return json_({ok:true});
    }
    if (action === 'adminChangeCredentials') {
      changeCredentials_(String(data.username || ''), String(data.password || ''));
      invalidateSession_(data.token);
      return json_({ok:true});
    }
    return json_({ok:false,error:'Unknown action'});
  } catch (err) {
    return json_({ok:false,error:String(err)});
  }
}

function handleFormSubmit_(data) {
  var type = String(data.formType || 'general');
  var sheetName = RIBAT_REQUEST_SHEETS[type] || 'طلبات_أخرى';
  var sh = getOrCreateSheet_(sheetName);
  ensureHeaders_(sh);
  sh.appendRow([
    new Date(), type, safe_(data.fullName), safe_(data.mobile), safe_(data.email), safe_(data.ageGroup),
    safe_(data.serviceType || data.participationType), safe_(data.contactMethod), safe_(data.subject),
    safe_(data.details || data.message), safe_(data.consent), 'جديد'
  ]);
  return json_({ok:true});
}

function handleLogin_(data) {
  var props = PropertiesService.getScriptProperties();
  var user = props.getProperty('ADMIN_USER');
  var password = props.getProperty('ADMIN_PASSWORD');
  if (!user || !password) throw new Error('لم يتم إعداد حساب الإدارة. شغّل setupRibatAdmin() مرة واحدة من محرر Apps Script.');
  if (String(data.username || '') !== user || String(data.password || '') !== password) throw new Error('بيانات الدخول غير صحيحة');
  var token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('ADMIN_SESSION_' + token, JSON.stringify({user:user,created:new Date().toISOString()}), 21600);
  return json_({ok:true, token:token, expiresIn:21600});
}

function requireAdmin_(token) {
  token = String(token || '');
  if (!token) throw new Error('جلسة الإدارة غير صالحة');
  var raw = CacheService.getScriptCache().get('ADMIN_SESSION_' + token);
  if (!raw) throw new Error('انتهت جلسة الإدارة. سجّل الدخول مرة أخرى.');
  return JSON.parse(raw);
}

function invalidateSession_(token) {
  if (token) CacheService.getScriptCache().remove('ADMIN_SESSION_' + String(token));
}

function setupRibatAdmin() {
  var props = PropertiesService.getScriptProperties();
  var username = 'admin';
  var password = 'Rb-' + Utilities.getUuid().replace(/-/g,'').slice(0,16) + '!';
  props.setProperty('ADMIN_USER', username);
  props.setProperty('ADMIN_PASSWORD', password);
  Logger.log('ADMIN_USER=' + username);
  Logger.log('ADMIN_PASSWORD=' + password);
  Logger.log('احتفظ بكلمة المرور في مكان آمن ثم يمكنك تغييرها من لوحة الإدارة.');
}

function setRibatAdminCredentials(username, password) {
  username = String(username || '').trim();
  password = String(password || '');
  if (!username || password.length < 10) throw new Error('استخدم اسم مستخدم صالحًا وكلمة مرور من 10 أحرف على الأقل.');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_USER', username);
  props.setProperty('ADMIN_PASSWORD', password);
  Logger.log('تم تحديث بيانات حساب الإدارة.');
}

function changeCredentials_(username, password) {
  if (!username || password.length < 10) throw new Error('اسم المستخدم مطلوب وكلمة المرور يجب ألا تقل عن 10 أحرف.');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_USER', username);
  props.setProperty('ADMIN_PASSWORD', password);
}

function listRequests_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var records = [];
  Object.keys(RIBAT_REQUEST_SHEETS).forEach(function(type) {
    var sheetName = RIBAT_REQUEST_SHEETS[type];
    var sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return;
    ensureHeaders_(sh);
    var values = sh.getRange(2,1,sh.getLastRow()-1,RIBAT_HEADERS.length).getValues();
    values.forEach(function(r, i) {
      records.push({
        id: sheetName + ':' + (i+2), sheetName: sheetName, row: i+2, formType: type,
        submittedAt: dateString_(r[0]), fullName:safe_(r[2]), mobile:safe_(r[3]), email:safe_(r[4]),
        ageGroup:safe_(r[5]), requestType:safe_(r[6]), serviceType:type==='beneficiary'?safe_(r[6]):'', participationType:type==='volunteer'?safe_(r[6]):'',
        contactMethod:safe_(r[7]), subject:safe_(r[8]), details:safe_(r[9]), message:type==='contact'?safe_(r[9]):'', consent:safe_(r[10]), status:safe_(r[11]) || 'جديد'
      });
    });
  });
  records.sort(function(a,b){ return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
  return records;
}

function updateRequestStatus_(sheetName, row, status) {
  var allowed = ['جديد','قيد المتابعة','مكتمل','مغلق'];
  if (allowed.indexOf(status) < 0) throw new Error('حالة غير صالحة');
  var sh = getAllowedRequestSheet_(sheetName);
  if (row < 2 || row > sh.getLastRow()) throw new Error('السجل غير موجود');
  ensureHeaders_(sh);
  sh.getRange(row,12).setValue(status);
}

function deleteRequest_(sheetName, row) {
  var sh = getAllowedRequestSheet_(sheetName);
  if (row < 2 || row > sh.getLastRow()) throw new Error('السجل غير موجود');
  sh.deleteRow(row);
}

function getAllowedRequestSheet_(sheetName) {
  var allowed = Object.keys(RIBAT_REQUEST_SHEETS).map(function(k){return RIBAT_REQUEST_SHEETS[k];});
  if (allowed.indexOf(String(sheetName || '')) < 0) throw new Error('ورقة غير مصرح بها');
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) throw new Error('ورقة البيانات غير موجودة');
  return sh;
}

function getOrCreateSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sh) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(RIBAT_HEADERS);
    return;
  }
  var existing = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),RIBAT_HEADERS.length)).getValues()[0];
  if (existing[11] !== 'الحالة') sh.getRange(1,12).setValue('الحالة');
}

function getSiteContent_() {
  var props = PropertiesService.getScriptProperties();
  var count = Number(props.getProperty(CONTENT_COUNT_KEY) || 0);
  if (!count) return {};
  var raw = '';
  for (var i=0;i<count;i++) raw += props.getProperty(CONTENT_PREFIX + i) || '';
  if (!raw) return {};
  try { return JSON.parse(raw); } catch(e) { return {}; }
}

function saveSiteContent_(content) {
  var raw = JSON.stringify(content || {});
  var props = PropertiesService.getScriptProperties();
  var oldCount = Number(props.getProperty(CONTENT_COUNT_KEY) || 0);
  var chunkSize = 8000;
  var chunks = [];
  for (var i=0;i<raw.length;i+=chunkSize) chunks.push(raw.slice(i,i+chunkSize));
  chunks.forEach(function(chunk, idx){ props.setProperty(CONTENT_PREFIX + idx, chunk); });
  for (var j=chunks.length;j<oldCount;j++) props.deleteProperty(CONTENT_PREFIX + j);
  props.setProperty(CONTENT_COUNT_KEY, String(chunks.length));
}

function safe_(v) { return v === null || v === undefined ? '' : String(v); }
function dateString_(v) { try { return v instanceof Date ? v.toISOString() : String(v || ''); } catch(e) { return String(v || ''); } }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
