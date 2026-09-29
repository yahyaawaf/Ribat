/**
 * Google Apps Script endpoint for Ribat website forms.
 * Create a Google Sheet, then Extensions > Apps Script and paste this file.
 * Deploy as Web app. Execute as: Me. Access: Anyone (or your organization policy).
 * IMPORTANT: Restrict spreadsheet sharing to authorized staff only.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var type = String(data.formType || 'general');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var safeName = ({beneficiary:'المستفيدون',volunteer:'التطوع_والشراكات',contact:'التواصل'})[type] || 'طلبات_أخرى';
    var sh = ss.getSheetByName(safeName) || ss.insertSheet(safeName);
    if (sh.getLastRow() === 0) sh.appendRow(['وقت الاستلام','نوع النموذج','الاسم','الجوال','البريد','الفئة العمرية','نوع الخدمة/المشاركة','طريقة التواصل','الموضوع','التفاصيل','الموافقة']);
    sh.appendRow([
      new Date(), type, data.fullName || '', data.mobile || '', data.email || '', data.ageGroup || '',
      data.serviceType || data.participationType || '', data.contactMethod || '', data.subject || '',
      data.details || data.message || '', data.consent || ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}
