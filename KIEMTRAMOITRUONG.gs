/**
 * KIỂM TRA MÔI TRƯỜNG THẬT (Quản trị). Chạy trên GOOGLE SHEETS THẬT để kiểm các giả định mà bộ test giả lập không chứng minh được:
 * múi giờ, kiểu dữ liệu khi đọc lại (ngày/số/số tài khoản), ghi MỘT khối nhiều dòng, flush, xoá dòng, khoá ghi — và ĐO thời gian thật của từng thao tác.
 * AN TOÀN: chỉ tạo một sheet tạm tên cố định (_HAK_THU_MOI_TRUONG), ghi/đọc/xoá trong đó rồi xoá chính sheet đó; không đọc, ghi hay xoá bất kỳ sheet dữ liệu nào khác.
 * Nên chạy trên BẢN SAO của file dữ liệu trước khi dùng dữ liệu thật.
 */
var TEN_SHEET_THU_MT_ = '_HAK_THU_MOI_TRUONG';
function kiemTraMoiTruongThat() {
  yeuCauDangNhap_(); yeuCauQuanTri_('kiểm tra môi trường thật');
  return voiKhoa_(function () {
    var ss = getSS_(), ket = [], sh = null;
    var t = function (ten, f) { var t0 = Date.now(), ok = true, ghi = ''; try { ghi = f() || ''; } catch (e) { ok = false; ghi = String((e && e.message) || e); } ket.push({ ten: ten, ok: ok, ms: Date.now() - t0, ghi: ghi }); };
    var cu = ss.getSheetByName(TEN_SHEET_THU_MT_); if (cu) ss.deleteSheet(cu); // chỉ xoá sheet tạm của chính bài kiểm tra này (còn sót lần trước)
    var truoc = ss.getSheets().map(function (s) { return s.getName(); }).sort().join('|');
    try {
      sh = ss.insertSheet(TEN_SHEET_THU_MT_);
      t('Múi giờ', function () {
        var tzS = typeof ss.getSpreadsheetTimeZone === 'function' ? ss.getSpreadsheetTimeZone() : '?', tzK = typeof Session.getScriptTimeZone === 'function' ? Session.getScriptTimeZone() : '?';
        if (tzK !== 'Asia/Ho_Chi_Minh') throw new Error('Múi giờ dự án là ' + tzK + ' (cần Asia/Ho_Chi_Minh trong appsscript.json) — ngày có thể lệch 1 ngày.');
        return 'Sheet ' + tzS + ' · dự án ' + tzK + (tzS !== tzK ? ' — KHÁC nhau: nên đặt Sheet về giờ Việt Nam (Tệp › Cài đặt)' : '');
      });
      var N = 200, dong = [['MaThu', 'Ngay', 'Tien', 'SoTaiKhoan', 'Chu', 'Dung']];
      for (var i = 1; i <= N; i++) dong.push(['K' + i, '2026-01-' + (i % 28 + 1 < 10 ? '0' : '') + (i % 28 + 1), 1000000 + i, '0' + (100000000 + i), 'dòng ' + i, i % 2 === 0]);
      t('Ghi MỘT khối ' + N + ' dòng × 6 cột', function () { sh.getRange(1, 1, dong.length, 6).setValues(dong); return ''; });
      t('flush', function () { SpreadsheetApp.flush(); return ''; });
      var doc = null; t('Đọc lại cả khối', function () { doc = sh.getRange(1, 1, dong.length, 6).getValues(); return doc.length + ' dòng'; });
      t('Kiểu dữ liệu đọc lại', function () {
        var r = doc[5], ghi = [];
        var ngayDoc = ngayIsoCuaO_(r[1]); if (ngayDoc !== dong[5][1]) throw new Error('Ngày ghi ' + dong[5][1] + ' đọc lại thành ' + ngayDoc + ' (kiểu ' + Object.prototype.toString.call(r[1]) + ') — lệch ngày.');
        ghi.push('ngày ghi dạng chuỗi → đọc lại ' + Object.prototype.toString.call(r[1]) + ' → chuẩn hoá đúng ' + ngayDoc);
        if (Number(r[2]) !== dong[5][2]) throw new Error('Số tiền đọc lại sai: ' + r[2]);
        ghi.push('số tiền đọc lại ' + typeof r[2]);
        ghi.push('số tài khoản "' + dong[5][3] + '" đọc lại ' + typeof r[3] + ' = ' + r[3] + (String(r[3]) !== dong[5][3] ? ' — MẤT số 0 đầu (cột tài khoản phải định dạng văn bản)' : ''));
        return ghi.join(' · ');
      });
      t('Dòng cuối thật (cột A)', function () { var d = timDongThatCuoiCung_(sh); if (d !== N + 1) throw new Error('Dòng cuối thật = ' + d + ', mong đợi ' + (N + 1)); return 'dòng ' + d; });
      t('Ghi từng ô × 20 (so với khối)', function () { for (var k = 0; k < 20; k++) sh.getRange(2 + k, 5).setValue('x' + k); return '20 lệnh ghi lẻ'; });
      t('Cập nhật một dòng (đọc 1 dòng + ghi 1 dòng)', function () { ghiCotHoSo_(sh, ['MaThu', 'Ngay', 'Tien', 'SoTaiKhoan', 'Chu', 'Dung'], 10, { Chu: 'đã sửa' }); return ''; });
      t('Xoá dòng cuối bằng xoaDongAnToan_', function () { var d = timDongThatCuoiCung_(sh); xoaDongAnToan_(sh, d); var d2 = timDongThatCuoiCung_(sh); if (d2 !== d - 1) throw new Error('Sau xoá dòng cuối thật = ' + d2 + ', mong đợi ' + (d - 1)); return ''; });
      t('Khoá ghi (LockService)', function () { var k = LockService.getScriptLock(); if (!k.tryLock(5000)) throw new Error('Không lấy được khoá'); k.releaseLock(); return 'lấy/nhả khoá được (khoá chỉ xếp hàng ghi, không phải giao dịch)'; });
    } finally {
      try { if (sh) ss.deleteSheet(sh); } catch (e2) { ket.push({ ten: 'Dọn sheet tạm', ok: false, ms: 0, ghi: 'Không xoá được ' + TEN_SHEET_THU_MT_ + ' — xoá tay: ' + e2.message }); }
    }
    var sau = ss.getSheets().map(function (s) { return s.getName(); }).sort().join('|');
    ket.push({ ten: 'Không đụng sheet dữ liệu nào khác', ok: sau === truoc, ms: 0, ghi: sau === truoc ? 'danh sách sheet y như trước' : 'danh sách sheet khác trước khi chạy' });
    var loi = ket.filter(function (k) { return !k.ok; }).length;
    try { ghiNhatKy_('', 'KIEM_TRA_MOI_TRUONG', loi + ' lỗi / ' + ket.length + ' bước'); } catch (e3) { /* không chặn */ }
    return { ok: loi === 0, soLoi: loi, buoc: ket, ghiChu: 'Thời gian (ms) là thời gian THẬT của Google trên file này — dùng để so với nhận định về hiệu năng. Chạy vài lần vào các giờ khác nhau.' };
  });
}
