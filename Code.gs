/**
 * MEDIA KITA ADMIN — Google Apps Script backend
 * Setup:
 * 1. Create a Google Spreadsheet, then Extensions > Apps Script.
 * 2. Paste this file into Code.gs and save.
 * 3. Set SPREADSHEET_ID below to the spreadsheet ID.
 * 4. Run setupDatabase() once from the editor and approve permissions.
 * 5. Add staff Google emails to USERS sheet, columns: Email | Name | Role | Active.
 * 6. Deploy > New deployment > Web app. Execute as: User accessing the web app.
 *    Restrict access to the intended staff/users where possible.
 *
 * IMPORTANT:
 * - This backend is a starter. For Workspace users, Session.getActiveUser().getEmail()
 *   should identify the signed-in user when deployment/access policy permits it.
 * - Never rely on the email field sent by the browser as authentication. The backend
 *   verifies the actual Apps Script active user and checks the USERS allowlist.
 * - If active-user email is blank in your account/deployment setup, do not loosen
 *   the check; use a supported Google sign-in / identity provider approach instead.
 */
const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEETS_SPREADSHEET_ID_HERE';
const SHEETS = {
  USERS: ['Email','Name','Role','Active'],
  CLIENTS: ['ID','Name','Contact','Email','Phone','Address','CreatedAt','UpdatedAt'],
  CATALOG: ['ID','Name','Description','Unit','Price','CreatedAt','UpdatedAt'],
  DOCS: ['ID','Type','Number','Date','Status','ClientID','ClientName','ClientAddress','ClientContact','ProjectName','ProjectDate','Location','ItemsJSON','Subtotal','Discount','TaxRate','TaxAmount','GrandTotal','Paid','Notes','CreatedBy','UpdatedBy','CreatedAt','UpdatedAt'],
  PAYMENTS: ['ID','DocID','Date','Amount','Note','CreatedBy','CreatedAt'],
  SETTINGS: ['Key','Value']
};

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    ok:true,
    message:'Media Kita Admin API is running. Use the application UI to connect.'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const email = getAuthorizedEmail_();
    const data = req.data || {};
    let result;
    switch (req.action) {
      case 'bootstrap': result = bootstrap_(email); break;
      case 'saveClient': result = saveEntity_('CLIENTS', data, email); break;
      case 'saveItem': result = saveEntity_('CATALOG', data, email); break;
      case 'saveDoc': result = saveDoc_(data, email); break;
      case 'recordPayment': result = recordPayment_(data, email); break;
      case 'saveSettings': result = saveSettings_(data, email); break;
      default: throw new Error('Aksi tidak dikenal.');
    }
    return json_({ok:true,data:result});
  } catch (err) {
    return json_({ok:false,error:String(err && err.message || err)});
  }
}

function getAuthorizedEmail_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) throw new Error('Email Google aktif tidak terbaca. Periksa pengaturan deployment Apps Script; akses ditolak demi keamanan.');
  const sh = sheet_('USERS');
  const rows = sh.getDataRange().getValues();
  const allowed = rows.slice(1).some(r =>
    String(r[0] || '').trim().toLowerCase() === email &&
    String(r[3]).toLowerCase() === 'true' || (
      String(r[0] || '').trim().toLowerCase() === email &&
      String(r[3]).toLowerCase() === 'aktif'
    )
  );
  if (!allowed) throw new Error('Email ' + email + ' belum terdaftar aktif di sheet USERS. Hubungi admin.');
  return email;
}

function setupDatabase() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PASTE_') === 0) {
    throw new Error('Isi SPREADSHEET_ID di bagian atas Code.gs terlebih dahulu.');
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = SHEETS[name];
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#ff8c00').setFontColor('#111111');
  });
  const settings = sheet_('SETTINGS');
  if (settings.getLastRow() < 2) {
    settings.getRange(2,1,6,2).setValues([
      ['company','CV. MEDIA KITA'],
      ['contact','JHOTA'],
      ['address','JL. VETERAN NO. 6B - KEL. FATULULI, KEC. KELAPA LIMA - KOTA KUPANG - NTT'],
      ['phone','081.138.101.82'],
      ['bank1','Rek Bank Mandiri | CV. Media Kita | 1810030003330'],
      ['bank2','Rekening Giro Bank NTT | CV Media Kita | 2502725702']
    ]);
  }
  SpreadsheetApp.flush();
}

function bootstrap_(email) {
  const settings = {};
  sheet_('SETTINGS').getDataRange().getValues().slice(1).forEach(r => {
    if (r[0]) settings[String(r[0])] = r[1];
  });
  return {
    docs: rowsAsObjects_('DOCS').map(r => ({
      id:r.ID,type:r.Type,number:r.Number,date:r.Date,status:r.Status,clientId:r.ClientID,
      clientName:r.ClientName,clientAddress:r.ClientAddress,clientContact:r.ClientContact,
      projectName:r.ProjectName,projectDate:r.ProjectDate,location:r.Location,
      items:parseJson_(r.ItemsJSON,[]),subtotal:num_(r.Subtotal),discount:num_(r.Discount),
      taxRate:num_(r.TaxRate),taxAmount:num_(r.TaxAmount),grandTotal:num_(r.GrandTotal),
      paid:num_(r.Paid),notes:r.Notes,updatedAt:r.UpdatedAt
    })),
    clients: rowsAsObjects_('CLIENTS').map(r => ({id:r.ID,name:r.Name,contact:r.Contact,email:r.Email,phone:r.Phone,address:r.Address})),
    items: rowsAsObjects_('CATALOG').map(r => ({id:r.ID,name:r.Name,description:r.Description,unit:r.Unit,price:num_(r.Price)})),
    staff: [{email:email}],
    settings:settings
  };
}

function saveEntity_(sheetName, d, email) {
  const sh = sheet_(sheetName);
  const id = String(d.id || Utilities.getUuid());
  const now = new Date();
  const values = sheetName === 'CLIENTS'
    ? [id,d.name||'',d.contact||'',d.email||'',d.phone||'',d.address||'',d.createdAt||now,now]
    : [id,d.name||'',d.description||'',d.unit||'Unit',num_(d.price),d.createdAt||now,now];
  upsert_(sh, id, values);
  return {id:id};
}

function saveDoc_(d, email) {
  const sh = sheet_('DOCS');
  const id = String(d.id || Utilities.getUuid());
  const existing = findRowById_(sh,id);
  const createdAt = existing ? existing.values[22] : new Date();
  const now = new Date();
  const type = d.type === 'INV' ? 'INV' : 'QUO';
  let number = String(d.number || '').trim();
  if (!number || number === 'AUTO') number = nextNumber_(type, d.date || new Date());
  const items = Array.isArray(d.items) ? d.items : [];
  const values = [
    id,type,number,d.date||new Date(),d.status||'Draft',d.clientId||'',d.clientName||'',
    d.clientAddress||'',d.clientContact||'',d.projectName||'',d.projectDate||'',d.location||'',
    JSON.stringify(items),num_(d.subtotal),num_(d.discount),num_(d.taxRate),num_(d.taxAmount),
    num_(d.grandTotal),num_(d.paid),d.notes||'',email,email,createdAt,now
  ];
  upsert_(sh,id,values);
  return {id:id,number:number};
}

function nextNumber_(type, dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  const year = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy');
  const prefix = type === 'INV' ? 'INV' : 'QUO';
  const all = sheet_('DOCS').getDataRange().getValues();
  let max = 0;
  all.slice(1).forEach(r => {
    const n = String(r[2] || '');
    const m = n.match(new RegExp('^' + prefix + '/' + year + '/(\\\\d+)$'));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return prefix + '/' + year + '/' + String(max+1).padStart(4,'0');
}

function recordPayment_(d,email) {
  const sh = sheet_('DOCS');
  const found = findRowById_(sh,String(d.id||''));
  if (!found) throw new Error('Invoice tidak ditemukan.');
  const row = found.values;
  if (row[1] !== 'INV') throw new Error('Pembayaran hanya dapat dicatat untuk invoice.');
  const amount = num_(d.amount);
  if (amount <= 0) throw new Error('Nominal pembayaran harus lebih besar dari nol.');
  const paymentSheet = sheet_('PAYMENTS');
  paymentSheet.appendRow([Utilities.getUuid(),d.id,d.date||new Date(),amount,d.note||'',email,new Date()]);
  const paid = num_(row[18]) + amount;
  sh.getRange(found.row,19).setValue(paid);
  if (paid >= num_(row[17])) sh.getRange(found.row,5).setValue('Lunas');
  sh.getRange(found.row,24).setValue(new Date());
  return {paid:paid};
}

function saveSettings_(d,email) {
  const sh = sheet_('SETTINGS');
  const values = sh.getDataRange().getValues();
  Object.keys(d || {}).forEach(k => {
    const idx = values.findIndex((r,i) => i > 0 && String(r[0]) === k);
    if (idx >= 1) sh.getRange(idx+1,2).setValue(d[k]);
    else sh.appendRow([k,d[k]]);
  });
  return d;
}

function rowsAsObjects_(sheetName) {
  const values = sheet_(sheetName).getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== '' && v !== null)).map(r => {
    const o = {};
    headers.forEach((h,i) => o[h] = serialize_(r[i]));
    return o;
  });
}
function serialize_(v) { return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v; }
function parseJson_(v,fallback) { try { return JSON.parse(v || ''); } catch(e) { return fallback; } }
function num_(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function sheet_(name) {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PASTE_') === 0) throw new Error('SPREADSHEET_ID belum dikonfigurasi.');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet ' + name + ' belum ada. Jalankan setupDatabase() terlebih dahulu.');
  return sh;
}
function findRowById_(sh,id) {
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) if (String(values[i][0]) === id) return {row:i+1,values:values[i]};
  return null;
}
function upsert_(sh,id,values) {
  const found = findRowById_(sh,id);
  if (found) sh.getRange(found.row,1,1,values.length).setValues([values]);
  else sh.appendRow(values);
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
