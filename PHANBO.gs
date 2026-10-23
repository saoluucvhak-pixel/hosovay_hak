/**
 * PHANBO.GS — LÃI PHẠT QUÁ HẠN và PHÂN BỔ MỘT KHOẢN TIỀN TRẢ theo thứ tự cấu hình (mặc định: lãi phạt → lãi → gốc).
 *
 * LÃI PHẠT (ƯỚC TÍNH — số chính thức theo thông báo của ngân hàng):
 *  • Gốc quá hạn tính lãi theo lãi suất quá hạn = lãi suất trong hạn × TY_LE_LAI_QUA_HAN% (mặc định 150%), tính trên SỐ NỢ QUÁ HẠN
 *    từ ngày đến hạn của kỳ đó đến ngày trả (phần đã trả) hoặc đến ngày tính (phần chưa trả).
 *  • Lãi chậm trả: LAI_CHAM_TRA_NAM %/năm trên lãi quá hạn chưa trả (mặc định 0 = không tính).
 *  • Tiền đã trả được phân bổ cho các kỳ theo thứ tự thời gian (kỳ cũ trước), giống lịch trả nợ.
 * Mọi hàm tính là THUẦN (không đọc sheet) để kiểm thử bằng số tay; hàm công khai chỉ đọc dữ liệu rồi gọi hàm thuần.
 */

/** Phân bổ tiền đã trả cho từng khoản đến hạn theo thứ tự thời gian, GIỮ CHI TIẾT từng đoạn (ngày, số tiền). dues: [{den, so}]; pays: [{ngay, tien}]. */
function phanBoChiTietTheoKy_(dues, pays, homNay) {
  var ps = pays.filter(function (p) { return p.ngay <= homNay && p.tien > 0; })
    .sort(function (a, b) { return a.ngay < b.ngay ? -1 : (a.ngay > b.ngay ? 1 : 0); }).map(function (p) { return { ngay: p.ngay, con: p.tien }; });
  var i = 0;
  return dues.map(function (d) {
    var can = d.so, seg = [];
    while (can > 0.005 && i < ps.length) {
      if (ps[i].con <= 0.005) { i++; continue; }
      var lay = Math.min(can, ps[i].con);
      seg.push({ ngay: ps[i].ngay, tien: lay }); can -= lay; ps[i].con -= lay;
    }
    return { seg: seg, conNo: can > 0.005 ? can : 0 };
  });
}
/** Lãi phạt của 1 nhóm khoản đến hạn với lãi suất năm `laiSuatNam` (%/năm). Trả {tong, chiTiet}. */
function laiPhatNhomKy_(dues, pays, ngayTinh, laiSuatNam, coSo) {
  var pb = phanBoChiTietTheoKy_(dues, pays, ngayTinh), tong = 0, ct = [];
  dues.forEach(function (d, i) {
    if (!(d.so > 0.005) || !(laiSuatNam > 0)) return;
    var phat = 0, tre = 0;
    pb[i].seg.forEach(function (s) { var n = soNgayGiuaIso_(d.den, s.ngay); if (n > 0) { phat += s.tien * laiSuatNam / 100 * n / coSo; tre = Math.max(tre, n); } });
    if (pb[i].conNo > 0.005 && d.den < ngayTinh) { var n2 = soNgayGiuaIso_(d.den, ngayTinh); phat += pb[i].conNo * laiSuatNam / 100 * n2 / coSo; tre = Math.max(tre, n2); }
    if (phat > 0) { tong += phat; ct.push({ ky: d.ky, denNgay: d.den, soNo: d.so, conNo: pb[i].conNo, soNgayTre: tre, phat: phat }); }
  });
  return { tong: tong, chiTiet: ct };
}
/**
 * Lãi phạt ƯỚC TÍNH đến cfg.today của 1 hồ sơ (thuần).
 * @param {Object} h hồ sơ; hd hợp đồng; ds bản ghi trả nợ hiệu lực của hồ sơ; cfg {coSo, nhac, today}; qh {tyLeQuaHan, chamTraNam}
 */
function tinhLaiPhat_(h, hd, ds, cfg, qh) {
  var lich = tinhLichTraNo_(h, hd, ds, cfg), loai = lich.loaiTien;
  var lsQuaHan = (Number(lich.laiSuatNam) || 0) * ((qh && qh.tyLeQuaHan) || 150) / 100, cham = (qh && qh.chamTraNam) || 0;
  var pay = function (ld) { return ds.filter(function (r) { return r.LoaiTra === ld; }).map(function (r) { return { ngay: String(r.NgayTra).substring(0, 10), tien: Number(r.SoTien) || 0 }; }); };
  var gocDues = lich.gocRows.map(function (r) { return { ky: r.ky, den: r.ngayDen, so: r.gocPhaiTra }; });
  var laiDues = lich.laiRows.map(function (r) { return { ky: r.ky, den: r.denNgay, so: r.laiPhaiTra }; });
  var g = laiPhatNhomKy_(gocDues, pay(TRA_GOC), cfg.today, lsQuaHan, cfg.coSo), l = laiPhatNhomKy_(laiDues, pay(TRA_LAI), cfg.today, cham, cfg.coSo);
  var daTraPhat = ds.filter(function (r) { return r.LoaiTra === TRA_PHAT; }).reduce(function (a, r) { return congSoTien_(a, Number(r.SoTien) || 0); }, 0);
  var lt = function (x) { return lamTronTienKy_(x, loai); };
  var phatGoc = lt(g.tong), phatLai = lt(l.tong), tong = congSoTien_(phatGoc, phatLai);
  return { maHoSo: String(h.MaHoSo), loaiTien: loai, ngayTinh: cfg.today, tyLeLaiQuaHan: (qh && qh.tyLeQuaHan) || 150, laiChamTraNam: cham,
    laiSuatQuaHanNam: Math.round(lsQuaHan * 10000) / 10000, laiPhatTrenGoc: phatGoc, laiPhatTrenLai: phatLai, tong: tong, daTra: daTraPhat,
    conNo: Math.max(0, congSoTien_(tong, -daTraPhat)),
    chiTiet: g.chiTiet.map(function (x) { return { loai: 'GOC', ky: x.ky, denNgay: x.denNgay, soNo: x.soNo, conNo: lt(x.conNo), soNgayTre: x.soNgayTre, phat: lt(x.phat) }; })
      .concat(l.chiTiet.map(function (x) { return { loai: 'LAI', ky: x.ky, denNgay: x.denNgay, soNo: x.soNo, conNo: lt(x.conNo), soNgayTre: x.soNgayTre, phat: lt(x.phat) }; })) };
}
function thamSoQuaHan_() { return { tyLeQuaHan: Number(layCauHinh_('TY_LE_LAI_QUA_HAN')) || 150, chamTraNam: Number(layCauHinh_('LAI_CHAM_TRA_NAM')) || 0 }; }
function layNguCanhTra_(maHoSo) {
  var h = layHoSoTheoMa_(maHoSo);
  if (!h || laDaXoa_(h.DaXoa)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  kiemTraPhamViTraNo_(h);
  var hd = layTraCuuDanhMuc_().hd[String(h.MaHD)] || {};
  var ds = docTraNo_().filter(function (r) { return String(r.MaHoSo) === String(maHoSo) && r.TrangThai === TRA_HIEU_LUC; });
  return { h: h, hd: hd, ds: ds };
}
/** API: lãi phạt quá hạn ước tính của 1 hồ sơ đến hôm nay (chỉ đọc). */
function layLaiPhatQuaHan(maHoSo) {
  yeuCauDangNhap_();
  var c = layNguCanhTra_(maHoSo), cfg = cauHinhLichTra_();
  return tinhLaiPhat_(c.h, c.hd, c.ds, cfg, thamSoQuaHan_());
}

/**
 * Gợi ý phân bổ một khoản tiền trả theo thứ tự cấu hình (thuần).
 * Mỗi mục bị chặn trên bởi số còn phải trả: PHAT = lãi phạt còn nợ; LAI = lãi các kỳ đã đến hạn còn nợ; GOC = toàn bộ dư nợ gốc (kỳ đến hạn trước, phần còn lại là trả trước).
 */
function phanBoKhoanTra_(h, hd, ds, cfgGoc, qh, soTien, ngayTra, thuTu) {
  var dsTruoc = ds.filter(function (r) { return String(r.NgayTra).substring(0, 10) <= ngayTra; });
  var cfg = { coSo: cfgGoc.coSo, nhac: cfgGoc.nhac, today: ngayTra };
  var lich = tinhLichTraNo_(h, hd, dsTruoc, cfg), phat = tinhLaiPhat_(h, hd, dsTruoc, cfg, qh);
  var laiDue = lich.laiRows.filter(function (r) { return r.denNgay <= ngayTra; }).reduce(function (a, r) { return congSoTien_(a, r.conNo); }, 0);
  var gocDue = lich.gocRows.filter(function (r) { return r.ngayDen <= ngayTra; }).reduce(function (a, r) { return congSoTien_(a, r.conNo); }, 0);
  var tran = { PHAT: phat.conNo, LAI: laiDue, GOC: lich.duNoGocHienTai };
  var con = soTien, kq = { PHAT: 0, LAI: 0, GOC: 0 };
  (thuTu || ['PHAT', 'LAI', 'GOC']).forEach(function (k) {
    var lay = Math.min(con, tran[k]); lay = Math.max(0, lay); kq[k] = lay; con = congSoTien_(con, -lay);
  });
  return { ngayTra: ngayTra, soTien: soTien, loaiTien: lich.loaiTien, thuTu: thuTu, phat: kq.PHAT, lai: kq.LAI, goc: kq.GOC, thua: con > 0 ? con : 0,
    conPhaiTra: { phat: phat.conNo, lai: laiDue, gocDenHan: gocDue, duNoGoc: lich.duNoGocHienTai, tong: congSoTien_(congSoTien_(phat.conNo, laiDue), lich.duNoGocHienTai) } };
}
function thuTuPhanBoCauHinh_() { return String(layCauHinh_('THU_TU_PHAN_BO')).split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
/** API: gợi ý cách chia một khoản tiền trả thành lãi phạt / lãi / gốc (chỉ đọc). */
function layGoiYPhanBoTra(maHoSo, soTien, ngayTra) {
  yeuCauDangNhap_();
  var c = layNguCanhTra_(maHoSo), ngay = ngayChuanISO_(ngayTra, 'Ngày trả', true);
  var st = docTienTheoLoai_(soTien, c.h.LoaiTien, 'Số tiền trả', true);
  if (!(st > 0)) throw new Error('Số tiền trả phải lớn hơn 0.');
  return phanBoKhoanTra_(c.h, c.hd, c.ds, cauHinhLichTra_(), thamSoQuaHan_(), st, ngay, thuTuPhanBoCauHinh_());
}

/**
 * GHI NHẬN MỘT KHOẢN TIỀN TRẢ GỘP: tự chia thành lãi phạt / lãi / gốc theo thứ tự cấu hình (hoặc theo phanBo do người dùng chỉnh) rồi ghi vào sổ trả nợ.
 * Mỗi phần là một dòng sổ riêng (mã tham chiếu thêm hậu tố -P / -L / -G khi có từ 2 phần). Lỗi giữa chừng → tự hủy các dòng đã ghi.
 * @param {{ngayTra:string, soTien:number|string, soThamChieu:string, chungTu:string, ghiChu:string=, phanBo:{phat:number,lai:number,goc:number}=}} tt
 */
function ghiNhanTraNoGop(maHoSo, tt, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    tt = tt || {};
    var c = layNguCanhTra_(maHoSo), hs = c.h;
    kiemTraRevisionBatBuoc_(hs, expectedRevision);
    var ngay = ngayChuanISO_(tt.ngayTra, 'Ngày trả', true), st = docTienTheoLoai_(tt.soTien, hs.LoaiTien, 'Số tiền trả', true);
    if (!(st > 0)) throw new Error('Số tiền trả phải lớn hơn 0.');
    var pb;
    if (tt.phanBo) {
      pb = { PHAT: docTienTheoLoai_(tt.phanBo.phat || 0, hs.LoaiTien, 'Phần lãi phạt', false), LAI: docTienTheoLoai_(tt.phanBo.lai || 0, hs.LoaiTien, 'Phần lãi', false), GOC: docTienTheoLoai_(tt.phanBo.goc || 0, hs.LoaiTien, 'Phần gốc', false) };
      if (congSoTien_(congSoTien_(pb.PHAT, pb.LAI), pb.GOC) !== st) throw new Error('Tổng các phần (' + formatSo_(congSoTien_(congSoTien_(pb.PHAT, pb.LAI), pb.GOC)) + ') phải bằng số tiền trả (' + formatSo_(st) + ').');
    } else {
      var g = phanBoKhoanTra_(hs, c.hd, c.ds, cauHinhLichTra_(), thamSoQuaHan_(), st, ngay, thuTuPhanBoCauHinh_());
      if (g.thua > 0) throw new Error('Số tiền trả vượt tổng còn phải trả (' + formatSo_(g.conPhaiTra.tong) + ' ' + g.loaiTien + ': lãi phạt ' + formatSo_(g.conPhaiTra.phat) + ', lãi đến hạn ' + formatSo_(g.conPhaiTra.lai) + ', dư nợ gốc ' + formatSo_(g.conPhaiTra.duNoGoc) + '). Giảm số tiền hoặc ghi riêng.');
      pb = { PHAT: g.phat, LAI: g.lai, GOC: g.goc };
    }
    var soTC = String(tt.soThamChieu || '').trim();
    if (soTC.length < 3) throw new Error('Số tham chiếu giao dịch ngân hàng bắt buộc (tối thiểu 3 ký tự).');
    // Kiểm tra mã gốc trước khi tạo hậu tố: không cho tách lại giao dịch đã ghi.
    var maGoc = soTC.toLowerCase();
    var daDung = docTraNo_().filter(function (r) {
      var ref = String(r.SoThamChieu).trim().toLowerCase();
      return r.TrangThai === TRA_HIEU_LUC && (ref === maGoc || ref.replace(/-(p|l|g)$/, '') === maGoc);
    })[0];
    if (daDung) throw new Error('Số tham chiếu "' + soTC + '" đã dùng cho bản ghi ' + daDung.MaTra + ' — không ghi nhận trùng giao dịch.');
    var phan = [['PHAT', TRA_PHAT, '-P'], ['LAI', TRA_LAI, '-L'], ['GOC', TRA_GOC, '-G']].filter(function (x) { return pb[x[0]] > 0; });
    if (!phan.length) throw new Error('Không có phần nào để ghi.');
    var daGhi = [], rev = expectedRevision;
    try {
      phan.forEach(function (x) {
        var r = ghiNhanTraNo(maHoSo, { loaiTra: x[1], ngayTra: ngay, soTien: pb[x[0]], soThamChieu: phan.length > 1 ? soTC + x[2] : soTC, chungTu: tt.chungTu,
          ghiChu: (String(tt.ghiChu || '').trim() + (phan.length > 1 ? ' [Trả gộp ' + soTC + ']' : '')).trim() }, rev);
        rev = r.revision; daGhi.push({ loai: x[1], soTien: pb[x[0]], maTra: r.maTra });
      });
    } catch (e) {
      daGhi.forEach(function (d) { try { rev = huyTraNo(d.maTra, 'Tự hoàn tác: ghi nhận trả gộp bị lỗi giữa chừng (' + String(e.message).substring(0, 120) + ')', rev).revision; } catch (e2) { /* giữ lỗi gốc */ } });
      throw e;
    }
    ghiNhatKy_(maHoSo, 'TRA_NO_GOP', soTC + ' | ' + st + ' | ' + phan.map(function (x) { return x[1] + '=' + pb[x[0]]; }).join(', '));
    return { maHoSo: maHoSo, parts: daGhi, revision: rev, duNoGoc: duNoGocConLai_(layHoSoTheoMa_(maHoSo), tongTraGocTheoHoSo_(docTraNo_())) };
  });
}
