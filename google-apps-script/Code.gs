/**
 * SỔ CÀ PHÊ - máy chủ đồng bộ (Google Apps Script)
 * Dán toàn bộ file này vào Apps Script của Google Sheet.
 * Mỗi loại dữ liệu nằm ở một trang tính (tab), mỗi dòng là một phiếu/khách.
 * Cột cuối cùng "Dữ liệu JSON" là bản gốc của phiếu - ĐỪNG sửa/xóa cột này và cột "Mã (id)".
 */

// >>> ĐỔI DÒNG DƯỚI ĐÂY thành mã đồng bộ của bạn (giống hệt mã nhập trong app) <<<
var MA_DONG_BO = 'DOI-MA-NAY';

var PREFIX = ['Mã (id)', 'Cập nhật lúc', 'Đã xóa', 'Người nhập'];
var DATE_COLS = {}; // tên cột nào là ngày (lưu dạng chữ dd/mm/yyyy)

function d_(iso) { return iso && /^\d{4}-\d\d-\d\d/.test(iso) ? iso.substr(8, 2) + '/' + iso.substr(5, 2) + '/' + iso.substr(0, 4) : (iso || ''); }

// Mô tả các trang tính: tên tab + các cột dễ đọc (tiêu đề, hàm lấy giá trị)
var DEF = {
  settings: { tab: 'Cài đặt', cols: [
    ['Tên cơ sở', function (r) { return r.shopName; }], ['Địa chỉ', function (r) { return r.address; }], ['Số điện thoại', function (r) { return r.phone; }],
    ['Bì mặc định (kg/bao)', function (r) { return r.defaultTare; }], ['Tỷ lệ đổi mặc định', function (r) { return r.defaultRatio; }], ['Quỹ đầu kỳ (đ)', function (r) { return r.openingCash; }]] },
  types: { tab: 'Loại cà phê', cols: [['Tên loại', function (r) { return r.name; }], ['Ghi chú', function (r) { return r.note; }]] },
  customers: { tab: 'Khách hàng', cols: [
    ['Tên', function (r) { return r.name; }], ['Số điện thoại', function (r) { return r.phone; }], ['Địa chỉ', function (r) { return r.address; }],
    ['Nhóm', function (r) { return r.group; }], ['Ghi chú', function (r) { return r.note; }]] },
  purchases: { tab: 'Thu mua', cols: [
    ['Số phiếu', function (r) { return r.code; }], ['Ngày', function (r) { return d_(r.date); }, true], ['Người bán', function (r, n) { return n.cust(r.customerId); }],
    ['Loại cà', function (r, n) { return n.type(r.typeId); }], ['Số bao', function (r) { return (r.bags || []).length; }], ['KL tịnh (kg)', function (r) { return r.kg; }],
    ['Đơn giá (đ/kg)', function (r) { return r.price; }], ['Thành tiền (đ)', function (r) { return r.amount; }], ['Đã trả (đ)', function (r) { return r.paid; }],
    ['Còn nợ (đ)', function (r) { return r.amount - r.paid; }], ['Ghi chú', function (r) { return r.note; }]] },
  exchanges: { tab: 'Đổi cà', cols: [
    ['Số phiếu', function (r) { return r.code; }], ['Ngày', function (r) { return d_(r.date); }, true], ['Khách hàng', function (r, n) { return n.cust(r.customerId); }],
    ['Số bao', function (r) { return (r.bags || []).length; }], ['Cà tươi nhận (kg)', function (r) { return r.kgFresh; }], ['Tỷ lệ', function (r) { return r.ratio; }],
    ['Nhân phải trả (kg)', function (r) { return r.kgBean; }], ['Nhân trả ngay (kg)', function (r) { return r.paidNow; }], ['Ghi chú', function (r) { return r.note; }]] },
  beanPayments: { tab: 'Trả nhân', cols: [
    ['Số phiếu', function (r) { return r.code; }], ['Ngày', function (r) { return d_(r.date); }, true], ['Khách hàng', function (r, n) { return n.cust(r.customerId); }],
    ['Nhân trả (kg)', function (r) { return r.kg; }], ['Hình thức', function (r) { return r.mode === 'cash' ? 'Quy ra tiền' : 'Trả bằng nhân'; }],
    ['Đơn giá (đ/kg)', function (r) { return r.price; }], ['Thành tiền (đ)', function (r) { return r.amount; }], ['Ghi chú', function (r) { return r.note; }]] },
  sales: { tab: 'Bán ra', cols: [
    ['Số phiếu', function (r) { return r.code; }], ['Ngày', function (r) { return d_(r.date); }, true], ['Người mua', function (r, n) { return n.cust(r.customerId); }],
    ['Loại cà', function (r, n) { return n.type(r.typeId); }], ['Số bao', function (r) { return (r.bags || []).length; }], ['KL tịnh (kg)', function (r) { return r.kg; }],
    ['Đơn giá (đ/kg)', function (r) { return r.price; }], ['Thành tiền (đ)', function (r) { return r.amount; }], ['Đã thu (đ)', function (r) { return r.paid; }],
    ['Còn nợ (đ)', function (r) { return r.amount - r.paid; }], ['Ghi chú', function (r) { return r.note; }]] },
  adjustments: { tab: 'Kho', cols: [
    ['Ngày', function (r) { return d_(r.date); }, true], ['Nghiệp vụ', function (r) { return r.kind === 'convert' ? 'Chế biến' : 'Điều chỉnh'; }],
    ['Loại', function (r, n) { return n.type(r.typeId); }], ['KL (kg)', function (r) { return r.kg; }], ['Sang loại', function (r, n) { return r.toTypeId ? n.type(r.toTypeId) : ''; }],
    ['KL thu được (kg)', function (r) { return r.toKg; }], ['Lý do / ghi chú', function (r) { return [r.reason, r.note].filter(String).join(' - '); }]] },
  cash: { tab: 'Sổ quỹ', cols: [
    ['Ngày', function (r) { return d_(r.date); }, true], ['Thu / Chi', function (r) { return r.dir === 'thu' ? 'Thu' : 'Chi'; }], ['Danh mục', function (r) { return r.cat; }],
    ['Khách hàng', function (r, n) { return r.customerId ? n.cust(r.customerId) : ''; }], ['Số tiền (đ)', function (r) { return r.amount; }], ['Ghi chú', function (r) { return r.note; }]] },
  stockIns: { tab: 'Nhập kho', cols: [
    ['Số phiếu', function (r) { return r.code; }], ['Ngày', function (r) { return d_(r.date); }, true],
    ['Cách làm', function (r) { return r.method === 'lo' ? 'Đốt lò' : r.method === 'cahai' ? 'Cả hai' : 'Phơi sân'; }],
    ['Số bao', function (r) { return (r.bags || []).length; }], ['Tổng cả bì (kg)', function (r) { return r.gross; }],
    ['Trừ bì (kg)', function (r) { return r.tareTotal; }], ['KL nhân xô (kg)', function (r) { return r.kg; }], ['Ghi chú', function (r) { return r.note; }]] },
  stocktakes: { tab: 'Kiểm kê', cols: [
    ['Ngày', function (r) { return d_(r.date); }, true],
    ['Loại', function (r) { return r.kind === 'close' ? 'Chốt kho (sân trống)' : 'Kiểm kê cuối tháng'; }],
    ['Cà tươi còn lại (kg)', function (r) { return r.freshKg; }],
    ['Nhân đếm thực tế (kg)', function (r) { return (r.beanCountKg === null || r.beanCountKg === undefined) ? '' : r.beanCountKg; }],
    ['Ghi chú', function (r) { return r.note; }]] },
  openings: { tab: 'Số dư đầu kỳ', cols: [
    ['Ngày', function (r) { return d_(r.date); }, true],
    ['Loại', function (r) { return ({ cash: 'Tiền mặt quỹ', supplierDebt: 'Ta nợ người bán', customerDebt: 'Khách mua nợ ta', beanOwed: 'Nhân còn nợ khách đổi', advance: 'Nông dân nợ tiền ứng', deposit: 'Cà khách ký gửi', beanStock: 'Tồn nhân xô', freshStock: 'Tồn cà tươi' })[r.kind] || r.kind; }],
    ['Khách hàng', function (r, n) { return r.customerId ? n.cust(r.customerId) : ''; }],
    ['Số tiền (đ)', function (r) { return r.amount; }], ['KL (kg)', function (r) { return r.kg; }], ['Giá trị vốn (đ)', function (r) { return r.value; }],
    ['Ghi chú', function (r) { return r.note; }]] },
  advances: { tab: 'Ứng tiền', cols: [
    ['Số phiếu', function (r) { return r.code; }], ['Ngày', function (r) { return d_(r.date); }, true], ['Khách hàng', function (r, n) { return n.cust(r.customerId); }],
    ['Hình thức', function (r) { return r.kind === 'goods' ? 'Ứng hàng' : 'Ứng tiền mặt'; }], ['Hàng ứng', function (r) { return r.item; }],
    ['Số tiền (đ)', function (r) { return r.amount; }], ['Ghi chú', function (r) { return r.note; }]] },
  deposits: { tab: 'Ký gửi', cols: [
    ['Số phiếu', function (r) { return r.code; }], ['Ngày', function (r) { return d_(r.date); }, true], ['Khách hàng', function (r, n) { return n.cust(r.customerId); }],
    ['Loại phiếu', function (r) { return r.kind === 'out' ? 'Trả lại cà' : 'Nhận ký gửi'; }], ['Loại cà', function (r, n) { return n.type(r.typeId); }],
    ['Số bao', function (r) { return (r.bags || []).length; }], ['Tổng cả bì (kg)', function (r) { return r.gross; }], ['Trừ bì (kg)', function (r) { return r.tareTotal; }],
    ['KL tịnh (kg)', function (r) { return r.kg; }], ['Ghi chú', function (r) { return r.note; }]] },
  cashCounts: { tab: 'Chốt quỹ', cols: [
    ['Ngày', function (r) { return d_(r.date); }, true], ['Sổ sách (đ)', function (r) { return r.book; }], ['Đếm được (đ)', function (r) { return r.counted; }],
    ['Chênh lệch (đ)', function (r) { return r.diff; }], ['Đã ghi nhận', function (r) { return r.posted ? 'Có' : 'Chưa'; }], ['Ghi chú', function (r) { return r.note; }]] },
  auditLog: { tab: 'Lịch sử sửa xóa', cols: [
    ['Thời điểm', function (r) { return r.at; }], ['Người', function (r) { return r.by; }],
    ['Hành động', function (r) { return r.action === 'update' ? 'Sửa' : r.action === 'delete' ? 'Xóa' : r.action === 'pin' ? 'Đổi PIN' : r.action; }],
    ['Loại dữ liệu', function (r) { return r.coll; }], ['Phiếu', function (r) { return r.label; }],
    ['Thay đổi', function (r) { return (r.changes || []).map(function (c) { return c.field + ': ' + c.from + ' → ' + c.to; }).join('; '); }]] }
};
var ORDER = ['settings', 'types', 'customers', 'purchases', 'exchanges', 'beanPayments', 'sales', 'adjustments', 'cash', 'stockIns', 'stocktakes', 'openings', 'advances', 'deposits', 'cashCounts', 'auditLog'];

// Đọc ô thời gian an toàn: nếu Google lỡ đổi chữ thành kiểu ngày thì đổi lại về chuỗi ISO
function s_(v) { return v instanceof Date ? v.toISOString() : String(v); }
// Các cột phải giữ dạng chữ (id, thời gian, ngày, JSON) - áp dụng cho đúng vùng sắp ghi
function textCols_(coll, ncol) {
  var c = [1, 2, ncol - 1, ncol];
  DEF[coll].cols.forEach(function (d, i) { if (d[2]) c.push(PREFIX.length + 1 + i); });
  return c;
}
function setText_(sh, coll, ncol, row, nrows) {
  textCols_(coll, ncol).forEach(function (c) { sh.getRange(row, c, nrows, 1).setNumberFormat('@'); });
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet() {
  return ContentService.createTextOutput('Sổ Cà Phê - máy chủ đồng bộ đang chạy OK ✓').setMimeType(ContentService.MimeType.TEXT);
}

function sheetFor_(coll) {
  var def = DEF[coll];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(def.tab);
  var headers = PREFIX.concat(def.cols.map(function (c) { return c[0]; }), ['Máy chủ nhận lúc', 'Dữ liệu JSON (đừng sửa)']);
  if (!sh) {
    sh = ss.insertSheet(def.tab);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#efe0cb');
    sh.setFrozenRows(1);
    // cột kỹ thuật + ngày: lưu dạng chữ để Google không tự đổi định dạng
    [1, 2].concat([headers.length - 1, headers.length]).forEach(function (c) { sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@'); });
    def.cols.forEach(function (c, i) { if (c[2]) sh.getRange(1, PREFIX.length + 1 + i, sh.getMaxRows(), 1).setNumberFormat('@'); });
    sh.setColumnWidth(1, 110); sh.setColumnWidth(2, 160); sh.setColumnWidth(headers.length, 120);
  }
  return sh;
}

function lookup_(coll) { // id -> tên, đọc từ trang tính Khách hàng / Loại cà phê
  var m = {}, sh = sheetFor_(coll), last = sh.getLastRow();
  if (last < 2) return m;
  var v = sh.getRange(2, 1, last - 1, PREFIX.length + 1).getValues();
  v.forEach(function (r) { if (r[0]) m[r[0]] = r[PREFIX.length]; });
  return m;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }
  try {
    var body = JSON.parse(e.postData.contents);
    if (!MA_DONG_BO || MA_DONG_BO === 'DOI-MA-NAY' || body.secret !== MA_DONG_BO) return json_({ ok: false, error: 'auth' });
    var serverTime = new Date().toISOString();
    var since = body.since || '';
    var names = { custMap: null, typeMap: null };
    var N = {
      cust: function (id) { if (!names.custMap) names.custMap = lookup_('customers'); return names.custMap[id] || ''; },
      type: function (id) { if (!names.typeMap) names.typeMap = lookup_('types'); return names.typeMap[id] || ''; }
    };
    var push = (body.push || []).slice();
    // khách hàng + loại cà phê xử lý trước để các phiếu tra được tên
    push.sort(function (a, b) { return ORDER.indexOf(a.coll) - ORDER.indexOf(b.coll); });
    var byColl = {};
    push.forEach(function (it) { if (DEF[it.coll]) (byColl[it.coll] = byColl[it.coll] || []).push(it); });
    ORDER.forEach(function (coll) {
      if (!byColl[coll]) return;
      upsert_(coll, byColl[coll], serverTime, N);
      if (coll === 'customers') names.custMap = null;
      if (coll === 'types') names.typeMap = null;
    });
    // lấy các thay đổi mới hơn "since"
    var changes = [];
    ORDER.forEach(function (coll) {
      var sh = sheetFor_(coll), last = sh.getLastRow();
      if (last < 2) return;
      var n = PREFIX.length + DEF[coll].cols.length + 2;
      var vals = sh.getRange(2, 1, last - 1, n).getValues();
      vals.forEach(function (r) {
        var srv = s_(r[n - 2]);
        if (!r[0] || srv <= since) return;
        var rec = null;
        try { rec = JSON.parse(r[n - 1]); } catch (x) { return; }
        if (r[2] === 'ĐÃ XÓA') changes.push({ coll: coll, id: String(r[0]), deleted: true, at: s_(r[1]) });
        else changes.push({ coll: coll, id: String(r[0]), deleted: false, updatedAt: rec.updatedAt || s_(r[1]), rec: rec });
      });
    });
    return json_({ ok: true, serverTime: serverTime, changes: changes });
  } catch (err) {
    return json_({ ok: false, error: 'server: ' + err });
  } finally {
    lock.releaseLock();
  }
}

function upsert_(coll, items, serverTime, N) {
  var def = DEF[coll], sh = sheetFor_(coll);
  var ncol = PREFIX.length + def.cols.length + 2;
  var last = sh.getLastRow();
  var rowOf = {}, tsOf = {};
  if (last >= 2) {
    var idv = sh.getRange(2, 1, last - 1, 2).getValues();
    idv.forEach(function (r, i) { rowOf[r[0]] = i + 2; tsOf[r[0]] = s_(r[1]); });
  }
  var appendRows = [], appendIdx = {};
  items.forEach(function (it) {
    var id = it.deleted ? it.id : it.rec.id;
    var ts = it.deleted ? it.at : (it.rec.updatedAt || '');
    if (tsOf[id] !== undefined && tsOf[id] > ts) return; // bản trên máy chủ mới hơn -> bỏ qua
    var row;
    if (it.deleted) {
      var old = rowOf[id] ? sh.getRange(rowOf[id], 1, 1, ncol).getValues()[0] : null;
      row = old || new Array(ncol).fill('');
      row[0] = id; row[1] = ts; row[2] = 'ĐÃ XÓA'; row[ncol - 2] = serverTime; row[ncol - 1] = JSON.stringify({ id: id, deleted: true, at: ts });
    } else {
      var r = it.rec;
      row = [id, ts, '', r.createdBy || ''];
      def.cols.forEach(function (c) { var v; try { v = c[1](r, N); } catch (x) { v = ''; } row.push(v === undefined || v === null ? '' : v); });
      row.push(serverTime, JSON.stringify(r));
    }
    if (rowOf[id] > 0) { setText_(sh, coll, ncol, rowOf[id], 1); sh.getRange(rowOf[id], 1, 1, ncol).setValues([row]); }
    else if (appendIdx[id] !== undefined) appendRows[appendIdx[id]] = row;
    else { appendIdx[id] = appendRows.length; appendRows.push(row); }
    tsOf[id] = ts;
  });
  if (appendRows.length) {
    var start = sh.getLastRow() + 1;
    if (start + appendRows.length - 1 > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), start + appendRows.length - 1 - sh.getMaxRows() + 100);
    setText_(sh, coll, ncol, start, appendRows.length);
    sh.getRange(start, 1, appendRows.length, ncol).setValues(appendRows);
  }
}

// ===== Sao lưu tự động hằng ngày lên Google Drive =====
var THU_MUC_SAO_LUU = 'Sao lưu Sổ Cà Phê';
var TIEN_TO_SAO_LUU = 'Sổ Cà Phê – sao lưu';
var SO_BAN_SAO_GIU = 30;

// Tạo một bản sao của Sổ hiện tại vào thư mục Drive, rồi chỉ giữ 30 bản mới nhất (bản cũ hơn vào Thùng rác).
// Cách chạy thử bằng tay: chọn hàm "saoLuuHangNgay" ở ô cạnh nút "Chạy" → bấm "Chạy".
function saoLuuHangNgay() {
  var file = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  var it = DriveApp.getFoldersByName(THU_MUC_SAO_LUU);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(THU_MUC_SAO_LUU);
  var ten = TIEN_TO_SAO_LUU + ' ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HHmm');
  file.makeCopy(ten, folder);
  var ds = [], files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.getName().indexOf(TIEN_TO_SAO_LUU) === 0) ds.push(f);
  }
  ds.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  ds.slice(SO_BAN_SAO_GIU).forEach(function (f) { f.setTrashed(true); });
  return 'Đã sao lưu: ' + ten;
}

// Bật sao lưu tự động lúc 23h mỗi đêm và tạo ngay một bản đầu tiên.
// Cách chạy: chọn hàm "caiDatSaoLuuTuDong" ở ô cạnh nút "Chạy" → bấm "Chạy" (Google sẽ hỏi cấp quyền Drive).
function caiDatSaoLuuTuDong() {
  tatSaoLuuTuDong();
  ScriptApp.newTrigger('saoLuuHangNgay').timeBased().everyDays(1).atHour(23).inTimezone('Asia/Ho_Chi_Minh').create();
  var kq = saoLuuHangNgay();
  var msg = 'Đã bật sao lưu tự động lúc 23h hằng ngày. ' + kq + ' (thư mục Google Drive "' + THU_MUC_SAO_LUU + '").';
  Logger.log(msg);
  return msg;
}

// Tắt sao lưu tự động (xóa lịch chạy hằng đêm).
// Cách chạy: chọn hàm "tatSaoLuuTuDong" ở ô cạnh nút "Chạy" → bấm "Chạy".
function tatSaoLuuTuDong() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'saoLuuHangNgay') { ScriptApp.deleteTrigger(t); n++; }
  });
  var msg = 'Đã tắt sao lưu tự động (xóa ' + n + ' lịch).';
  Logger.log(msg);
  return msg;
}
