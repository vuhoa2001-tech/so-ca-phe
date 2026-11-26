/**
 * SỔ CÀ PHÊ - máy chủ đồng bộ (Google Apps Script)
 * Dán toàn bộ file này vào Apps Script của Google Sheet.
 * Mỗi loại dữ liệu nằm ở một trang tính (tab), mỗi dòng là một phiếu/khách.
 * Cột cuối cùng "Dữ liệu JSON" là bản gốc của phiếu - ĐỪNG sửa/xóa cột này và cột "Mã (id)".
 */

// >>> ĐỔI DÒNG DƯỚI ĐÂY thành mã đồng bộ của bạn (giống hệt mã nhập trong app) <<<
var MA_DONG_BO = 'DOI-MA-NAY';
// true = máy nào còn dùng "mã chung" ở trên vẫn đồng bộ được (quyền Chủ). Khi mọi máy đã chuyển sang mã riêng → đổi thành false rồi triển khai "Phiên bản mới".
var CHO_PHEP_MA_CHUNG = true;

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
    ['Tên', function (r) { return (r.code ? r.code + ' – ' : '') + (r.name || ''); }], ['Số điện thoại', function (r) { return r.phone; }], ['Địa chỉ', function (r) { return r.address; }],
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

// ===== Người dùng & mã riêng cho từng người =====
// Trang tính "Người dùng" do máy chủ tự quản lý (không phải dữ liệu đồng bộ). Chỉ lưu MÃ BĂM của mã truy cập, không lưu mã gốc.
var TAB_NGUOI_DUNG = 'Người dùng';
var USER_HEAD = ['Mã người dùng', 'Tên', 'Vai trò', 'Mã băm', 'Đang hoạt động', 'Tạo lúc', 'Lần đồng bộ cuối', 'Ghi chú'];
var CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 ký tự, không có 0 O 1 I L
var TZ = 'Asia/Ho_Chi_Minh';
// Nhân viên chỉ được TẠO MỚI các loại này (không có: settings, types, adjustments, stocktakes, openings)
var STAFF_CREATE = { purchases: 1, exchanges: 1, beanPayments: 1, sales: 1, stockIns: 1, deposits: 1, advances: 1, cash: 1, customers: 1, cashCounts: 1, auditLog: 1 };

function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function normCode_(t) { return String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function hash_(t) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normCode_(t), Utilities.Charset.UTF_8);
  return b.map(function (x) { var v = x < 0 ? x + 256 : x; return (v < 16 ? '0' : '') + v.toString(16); }).join('');
}
function newCode_() {
  var out = '';
  while (out.length < 12) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Math.random(), Utilities.Charset.UTF_8);
    for (var i = 0; i < bytes.length && out.length < 12; i++) {
      var v = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
      if (v < 248) out += CODE_ALPHABET.charAt(v % 31); // 248 = 31 x 8 → không bị lệch
    }
  }
  return out.substr(0, 4) + '-' + out.substr(4, 4) + '-' + out.substr(8, 4);
}
function roleOut_(r) { return r === 'owner' ? 'Chủ' : 'Nhân viên'; }
function roleIn_(v) { v = String(v || '').trim().toLowerCase(); return (v === 'chủ' || v === 'chu' || v === 'owner') ? 'owner' : 'staff'; } // không rõ → nhân viên (quyền thấp nhất)
function isTrue_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

function usersSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB_NGUOI_DUNG);
  if (!sh) {
    sh = ss.insertSheet(TAB_NGUOI_DUNG);
    sh.getRange(1, 1, 1, USER_HEAD.length).setValues([USER_HEAD]).setFontWeight('bold').setBackground('#efe0cb');
    sh.setFrozenRows(1);
    [1, 4, 6, 7].forEach(function (c) { sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@'); });
    sh.setColumnWidth(1, 120); sh.setColumnWidth(2, 160); sh.setColumnWidth(4, 230); sh.setColumnWidth(6, 170); sh.setColumnWidth(7, 170);
  }
  return sh;
}
function readUsers_() {
  var sh = usersSheet_(), last = sh.getLastRow(), out = [];
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, USER_HEAD.length).getValues().forEach(function (r, i) {
    if (!r[0]) return;
    out.push({ row: i + 2, id: String(r[0]), name: String(r[1]), role: roleIn_(r[2]), hash: String(r[3]).toLowerCase(), active: isTrue_(r[4]), created: s_(r[5]), last: s_(r[6]), note: String(r[7] || '') });
  });
  return out;
}
function writeUser_(u) {
  var sh = usersSheet_();
  if (u.row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 20);
  [1, 4, 6, 7].forEach(function (c) { sh.getRange(u.row, c, 1, 1).setNumberFormat('@'); });
  sh.getRange(u.row, 1, 1, USER_HEAD.length).setValues([[u.id, u.name, roleOut_(u.role), u.hash, !!u.active, u.created, u.last, u.note || '']]);
}
function pub_(u) { return { id: u.id, name: u.name, role: u.role, active: !!u.active, created: u.created, last: u.last, note: u.note }; }
function bad_(msg) { return { ok: false, error: 'bad', message: msg }; }

// Nhận diện người gửi. token (mã riêng) được ưu tiên; mã chung cũ chỉ còn dùng được khi CHO_PHEP_MA_CHUNG = true.
function authUser_(body) {
  if (body.token) {
    if (normCode_(body.token).length < 8) return null;
    var h = hash_(body.token), us = readUsers_();
    for (var i = 0; i < us.length; i++) {
      if (us[i].hash === h && us[i].active) {
        var t = us[i].last ? Date.parse(us[i].last) : 0;
        if (!(t > 0) || Date.now() - t > 600000) { // ghi "lần đồng bộ cuối" tối đa 10 phút / lần
          us[i].last = new Date().toISOString();
          usersSheet_().getRange(us[i].row, 7).setNumberFormat('@').setValue(us[i].last);
        }
        return { id: us[i].id, name: us[i].name, role: us[i].role, legacy: false };
      }
    }
    return null;
  }
  if (CHO_PHEP_MA_CHUNG && MA_DONG_BO && MA_DONG_BO !== 'DOI-MA-NAY' && body.secret === MA_DONG_BO) return { id: 'legacy', name: 'Chủ (mã chung)', role: 'owner', legacy: true };
  return null;
}

function admin_(body, user) {
  var act = body.action;
  if (act === 'whoami') return { ok: true, user: { name: user.name, role: user.role } };
  if (user.role !== 'owner') return { ok: false, error: 'forbidden', message: 'Chỉ chủ mới được làm việc này.' };
  var users = readUsers_();
  var owners = users.filter(function (x) { return x.active && x.role === 'owner'; }).length;
  if (act === 'listUsers') return { ok: true, users: users.map(pub_), legacy: !!user.legacy };
  if (act === 'createUser') {
    var name = String(body.name || '').trim();
    if (!name) return bad_('Chưa nhập tên.');
    if (name.length > 60) return bad_('Tên quá dài.');
    if (nameTaken_(users, name, '')) return bad_('Đã có người tên "' + name + '".');
    var code = newCode_(), sh = usersSheet_();
    var nu = { row: sh.getLastRow() + 1, id: 'U' + Utilities.getUuid().replace(/-/g, '').substr(0, 8).toUpperCase(), name: name, role: body.role === 'owner' ? 'owner' : 'staff',
      hash: hash_(code), active: true, created: new Date().toISOString(), last: '', note: '' };
    writeUser_(nu);
    return { ok: true, user: pub_(nu), code: code };
  }
  var u = null;
  users.forEach(function (x) { if (x.id === String(body.id)) u = x; });
  if (!u) return bad_('Không tìm thấy người này.');
  var lastOwner = !user.legacy && u.active && u.role === 'owner' && owners <= 1; // không để hệ thống không còn chủ nào
  if (act === 'setActive') {
    var on = !!body.active;
    if (!on && lastOwner) return bad_('Đây là chủ cuối cùng đang hoạt động, không thể khóa.');
    u.active = on; writeUser_(u);
    return { ok: true, user: pub_(u) };
  }
  if (act === 'resetCode') {
    var c2 = newCode_(); u.hash = hash_(c2); writeUser_(u);
    return { ok: true, user: pub_(u), code: c2 };
  }
  if (act === 'renameUser') {
    var nn = String(body.name || '').trim();
    if (!nn) return bad_('Chưa nhập tên.');
    if (nn.length > 60) return bad_('Tên quá dài.');
    if (nameTaken_(users, nn, u.id)) return bad_('Đã có người tên "' + nn + '".');
    u.name = nn; writeUser_(u);
    return { ok: true, user: pub_(u) };
  }
  if (act === 'setRole') {
    var r = body.role === 'owner' ? 'owner' : 'staff';
    if (r !== 'owner' && lastOwner) return bad_('Đây là chủ cuối cùng đang hoạt động, không thể đổi thành nhân viên.');
    u.role = r; writeUser_(u);
    return { ok: true, user: pub_(u) };
  }
  return bad_('Không hiểu yêu cầu.');
}
function nameTaken_(users, name, exceptId) {
  var k = name.toLowerCase();
  if (k === 'chủ (mã chung)') return true;
  return users.some(function (x) { return x.id !== exceptId && x.name.toLowerCase() === k; });
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
    var user = authUser_(body);
    if (!user) return json_({ ok: false, error: 'auth' });
    if (body.action) return json_(admin_(body, user));
    var serverTime = new Date().toISOString();
    var since = body.since || '';
    var staff = user.role !== 'owner';
    var ctx = { user: user, staff: staff, today: today_(), rejected: [], extra: [], stale: [], failed: [] };
    var names = { custMap: null, typeMap: null };
    var N = {
      cust: function (id) { if (!names.custMap) names.custMap = lookup_('customers'); return names.custMap[id] || ''; },
      type: function (id) { if (!names.typeMap) names.typeMap = lookup_('types'); return names.typeMap[id] || ''; }
    };
    var push = (body.push || []).filter(function (it) { return it && typeof it === 'object'; });
    // khách hàng + loại cà phê xử lý trước để các phiếu tra được tên
    push.sort(function (a, b) { return ORDER.indexOf(a.coll) - ORDER.indexOf(b.coll); });
    var byColl = {};
    push.forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      if (!it.deleted && (!it.rec || !it.rec.id)) return;
      if (it.deleted && !it.id) return;
      var pid = it.deleted ? it.id : it.rec.id;
      if (DEF[it.coll]) (byColl[it.coll] = byColl[it.coll] || []).push(it);
      else if (staff && it.coll === 'users') {
        ctx.rejected.push({ coll: 'users', id: pid, reason: 'Nhân viên không được sửa danh sách người dùng', label: '' });
        ctx.extra.push({ coll: 'users', id: pid, deleted: true, at: serverTime });
      }
    });
    ORDER.forEach(function (coll) {
      if (!byColl[coll]) return;
      upsert_(coll, byColl[coll], serverTime, N, ctx);
      if (coll === 'customers') names.custMap = null;
      if (coll === 'types') names.typeMap = null;
    });
    // lấy các thay đổi mới hơn "since"
    var changes = [], seen = {};
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
        seen[coll + ':' + r[0]] = 1;
      });
    });
    // bản "đúng theo máy chủ" của các mục bị từ chối (để máy khách hoàn lại)
    ctx.extra.forEach(function (c) {
      var k = c.coll + ':' + c.id;
      if (seen[k]) { changes = changes.filter(function (x) { return x.coll + ':' + x.id !== k; }); }
      changes.push(c);
    });
    // stale = mục bị bỏ qua vì bản trên máy chủ mới hơn (máy khách lệch giờ / sửa chồng); failed = mục lỗi riêng lẻ, không chặn các mục khác. Cả hai là trường TÙY CHỌN (máy cũ bỏ qua được).
    return json_({ ok: true, serverTime: serverTime, changes: changes, rejected: ctx.rejected, stale: ctx.stale, failed: ctx.failed, user: { name: user.name, role: user.role } });
  } catch (err) {
    return json_({ ok: false, error: 'server: ' + err });
  } finally {
    lock.releaseLock();
  }
}

function buildRow_(def, id, ts, r, serverTime, N) {
  var row = [id, ts, '', r.createdBy || ''];
  def.cols.forEach(function (c) { var v; try { v = c[1](r, N); } catch (x) { v = ''; } row.push(v === undefined || v === null ? '' : v); });
  var js = JSON.stringify(r);
  if (js.length > 49000) throw new Error('Phiếu quá lớn (' + js.length + ' ký tự, ô Google Sheet chỉ chứa tối đa 50.000)');
  row.push(serverTime, js);
  return row;
}

// Quy tắc cho NHÂN VIÊN. Trả về {ok:true, rec} (rec đã chỉnh theo quy tắc) hoặc {ok:false, reason, label}.
function staffCheck_(coll, it, st, ctx, serverTime) {
  var rec = it.rec, cur = st.cur, name = ctx.user.name;
  var label = (rec && (rec.code || rec.name)) || (cur && (cur.code || cur.name)) || '';
  var no = function (why) { return { ok: false, reason: why, label: label }; };
  if (it.deleted) return no('Nhân viên không được xóa – báo chủ');
  if (!STAFF_CREATE[coll]) return no('Nhân viên không được ghi vào mục này');
  if (!st.exists) { // tạo mới: máy chủ tự ghi tên người nhập
    rec.createdBy = name;
    if (coll === 'auditLog') rec.by = name;
    return { ok: true, rec: rec };
  }
  if (st.isDel) return no('Phiếu này đã bị xóa, nhân viên không được khôi phục');
  if (!cur) return no('Không đọc được bản trên máy chủ');
  if (coll === 'auditLog') return no('Nhân viên không được sửa nhật ký');
  if (coll === 'cashCounts') return no('Nhân viên không được sửa phiếu chốt quỹ');
  if (coll === 'customers') { // chỉ được sửa điện thoại / địa chỉ / ghi chú
    var m = JSON.parse(JSON.stringify(cur)), keep = { phone: 1, address: 1, note: 1, updatedAt: 1, updatedBy: 1, createdAt: 1, createdBy: 1 }, diff = false;
    ['phone', 'address', 'note'].forEach(function (f) { if (rec[f] !== undefined) m[f] = rec[f]; });
    for (var f in rec) { if (!keep[f] && JSON.stringify(rec[f]) !== JSON.stringify(cur[f])) diff = true; }
    m.updatedAt = diff ? serverTime : (rec.updatedAt || serverTime); // diff: bump để máy khách nhận lại bản máy chủ
    m.updatedBy = name;
    return { ok: true, rec: m, push: diff };
  }
  if (cur.date !== ctx.today) return no('Nhân viên không được sửa phiếu ngày cũ');
  if (rec.date !== ctx.today) return no('Nhân viên không được đổi sang ngày khác');
  if (cur.createdBy !== name) return no('Nhân viên chỉ được sửa phiếu do chính mình nhập');
  rec.createdBy = cur.createdBy; rec.updatedBy = name;
  return { ok: true, rec: rec };
}

function upsert_(coll, items, serverTime, N, ctx) {
  var def = DEF[coll], sh = sheetFor_(coll);
  var ncol = PREFIX.length + def.cols.length + 2;
  var last = sh.getLastRow();
  var rowOf = {}, tsOf = {}, delOf = {};
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 3).getValues().forEach(function (r, i) { rowOf[r[0]] = i + 2; tsOf[r[0]] = s_(r[1]); delOf[r[0]] = (r[2] === 'ĐÃ XÓA'); });
  }
  var appendRows = [], appendIdx = {};
  var curOf = function (id) { if (!rowOf[id]) return null; try { return JSON.parse(sh.getRange(rowOf[id], ncol).getValue()); } catch (x) { return null; } };
  var put = function (id, row, ts) {
    if (rowOf[id] > 0) { setText_(sh, coll, ncol, rowOf[id], 1); sh.getRange(rowOf[id], 1, 1, ncol).setValues([row]); }
    else if (appendIdx[id] !== undefined) appendRows[appendIdx[id]] = row;
    else { appendIdx[id] = appendRows.length; appendRows.push(row); }
    tsOf[id] = ts;
  };
  var serverCopy = function (id, cur) { // bản đúng theo máy chủ của một mục bị từ chối
    if (!rowOf[id]) return { coll: coll, id: id, deleted: true, at: serverTime };
    if (delOf[id]) return { coll: coll, id: id, deleted: true, at: tsOf[id] };
    return cur ? { coll: coll, id: id, deleted: false, updatedAt: cur.updatedAt || tsOf[id], rec: cur } : null;
  };
  var reject = function (id, why, label, cur) {
    ctx.rejected.push({ coll: coll, id: id, reason: why, label: label || '' });
    var c = serverCopy(id, cur); if (c) ctx.extra.push(c);
  };
  var handle = function (it) {
    var id = it.deleted ? it.id : it.rec.id;
    var ts = it.deleted ? (it.at || '') : (it.rec.updatedAt || '');
    var cur = null, extraPush = false;
    if (ctx.staff && coll === 'settings') { // nhân viên chỉ được góp bộ đếm số phiếu (seq): lấy số lớn hơn
      if (it.deleted) { reject(id, 'Nhân viên không được xóa – báo chủ', '', curOf(id)); return; }
      if (!rowOf[id] || delOf[id]) return;
      var cs = curOf(id);
      if (!cs) return;
      var seq = (cs.seq && typeof cs.seq === 'object') ? cs.seq : {}, inc = it.rec.seq, chg = false;
      if (inc && typeof inc === 'object') {
        for (var k in inc) { var v = Number(inc[k]); if (isFinite(v) && !(Number(seq[k]) >= v)) { seq[k] = v; chg = true; } }
      }
      if (chg) { cs.seq = seq; cs.updatedAt = serverTime; cs.updatedBy = ctx.user.name; put(id, buildRow_(def, id, serverTime, cs, serverTime, N), serverTime); }
      return;
    }
    if (coll === 'settings' && !it.deleted && rowOf[id] > 0 && !delOf[id]) { // bộ đếm số phiếu (seq): máy chủ KHÔNG BAO GIỜ hạ số, luôn lấy số lớn hơn
      var cs0 = curOf(id);
      if (cs0 && it.rec && typeof it.rec === 'object') {
        var s0 = (cs0.seq && typeof cs0.seq === 'object') ? cs0.seq : {}, i0 = (it.rec.seq && typeof it.rec.seq === 'object') ? it.rec.seq : {}, m0 = {}, k0, ch0 = false;
        for (k0 in s0) m0[k0] = Number(s0[k0]) || 0;
        for (k0 in i0) { var v0 = Number(i0[k0]); if (isFinite(v0) && !(Number(m0[k0]) >= v0)) { m0[k0] = v0; if (!(Number(s0[k0]) >= v0)) ch0 = true; } }
        if (tsOf[id] > ts) { // bản cài đặt trên máy chủ mới hơn: giữ nguyên, chỉ gộp số đếm
          if (ch0) { cs0.seq = m0; put(id, buildRow_(def, id, tsOf[id], cs0, serverTime, N), tsOf[id]); }
          return;
        }
        it.rec.seq = m0;
      }
    }
    if (tsOf[id] !== undefined && tsOf[id] > ts) { // bản trên máy chủ mới hơn -> bỏ qua, nhưng trả bản máy chủ về cho máy khách (lệch giờ / sửa chồng)
      if (rowOf[id] > 0) { ctx.stale.push({ coll: coll, id: id }); var sc = serverCopy(id, curOf(id)); if (sc) ctx.extra.push(sc); }
      return;
    }
    if (ctx.staff) {
      cur = curOf(id);
      var chk = staffCheck_(coll, it, { exists: rowOf[id] > 0, isDel: !!delOf[id], cur: cur }, ctx, serverTime);
      if (!chk.ok) { reject(id, chk.reason, chk.label, cur); return; }
      it = { rec: chk.rec }; ts = chk.rec.updatedAt || ''; extraPush = !!chk.push;
    }
    var row;
    if (it.deleted) { // chỉ chủ tới được đây
      var old = rowOf[id] ? sh.getRange(rowOf[id], 1, 1, ncol).getValues()[0] : null;
      row = old || new Array(ncol).fill('');
      row[0] = id; row[1] = ts; row[2] = 'ĐÃ XÓA'; row[ncol - 2] = serverTime; row[ncol - 1] = JSON.stringify({ id: id, deleted: true, at: ts, updatedBy: ctx.user.name });
    } else {
      if (!ctx.staff && rowOf[id] > 0 && !delOf[id]) it.rec.updatedBy = ctx.user.name;
      row = buildRow_(def, id, ts, it.rec, serverTime, N);
    }
    put(id, row, ts);
    if (extraPush) ctx.extra.push({ coll: coll, id: id, deleted: false, updatedAt: it.rec.updatedAt, rec: it.rec });
  };
  // mỗi mục xử lý riêng: một mục lỗi (quá lớn, sai dạng...) chỉ báo lỗi mục đó, không chặn các mục khác
  items.forEach(function (it) {
    try { handle(it); }
    catch (err) { ctx.failed.push({ coll: coll, id: String(it && (it.deleted ? it.id : (it.rec && it.rec.id)) || ''), error: String(err && err.message ? err.message : err).substr(0, 200) }); }
  });
  if (appendRows.length) {
    var start = sh.getLastRow() + 1;
    try {
      if (start + appendRows.length - 1 > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), start + appendRows.length - 1 - sh.getMaxRows() + 100);
      setText_(sh, coll, ncol, start, appendRows.length);
      sh.getRange(start, 1, appendRows.length, ncol).setValues(appendRows);
    } catch (err2) { // ghi cả loạt lỗi: thử ghi từng dòng để biết dòng nào hỏng
      appendRows.forEach(function (row) {
        try {
          var at = sh.getLastRow() + 1;
          if (at > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 100);
          setText_(sh, coll, ncol, at, 1);
          sh.getRange(at, 1, 1, ncol).setValues([row]);
        } catch (err3) { ctx.failed.push({ coll: coll, id: String(row[0]), error: String(err3 && err3.message ? err3.message : err3).substr(0, 200) }); }
      });
    }
  }
}

// ===== Sao lưu tự động hằng ngày lên Google Drive =====
var THU_MUC_SAO_LUU = 'Sao lưu Sổ Cà Phê';
var TIEN_TO_SAO_LUU = 'Sổ Cà Phê – sao lưu';
var SO_BAN_SAO_GIU = 30;

// Tạo một bản sao của Sổ hiện tại vào thư mục Drive, rồi chỉ giữ 30 bản mới nhất (bản cũ hơn vào Thùng rác).
// Cách chạy thử bằng tay: chọn hàm "saoLuuHangNgay" ở ô cạnh nút "Chạy" → bấm "Chạy".
function saoLuuHangNgay() {
  var lock = LockService.getScriptLock();
  lock.waitLock(120000); // chờ đồng bộ đang ghi dở xong rồi mới chụp bản sao; không lấy được khóa thì báo lỗi, không sao lưu dở
  try {
    return saoLuu_();
  } finally {
    lock.releaseLock();
  }
}
function saoLuu_() {
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
