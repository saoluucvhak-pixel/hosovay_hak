/* Dữ liệu mẫu cho các bộ chụp/kiểm thử giao diện (google.script.run giả lập — không phải Google thật). */
const HOM_NAY = '2026-10-21';
const hs = (i, o) => Object.assign({ MaHoSo: 'HS' + String(i).padStart(4, '0'), MaHD: 'HD1', SoGiayNhanNo: 'GNN-' + i, TrangThai: 'Đã giải ngân', LoaiTien: 'VND', SoTienNhanNoLanNay: 1500000000 + i * 37000000, NgayGiaiNgan: '2026-09-' + String(10 + i).padStart(2, '0'), NgayDenHan: '2026-12-' + String(10 + i).padStart(2, '0'), Revision: 2 }, o || {});
const HO_SO = [hs(1), hs(2, { LoaiTien: 'USD', SoTienNhanNoLanNay: 120000.5, TyGiaBan: 25800 }), hs(3, { TrangThai: 'Nháp' }), hs(4, { TrangThai: 'Đã tạo hồ sơ' }), hs(5, { NgayDenHan: '2026-10-05' })];
const CONG_TY = [{ MaCty: 'CTY001', TenCty: 'CÔNG TY TNHH HIỆP VĨNH AN', MaSoThue: '0400000001' }];
const HOP_DONG = [{ MaHD: 'HD1', MaCty: 'CTY001', SoHopDong: 'HĐTD-01/2026', TinhTrang: 'Đang hiệu lực', TenNganHang: 'Vietcombank', HanMucVay: 20000000000, NgayHopDong: '2026-01-05' }];
const DL = {
  layCauHinhDangNhap: { cheDo: 'TAM_GOOGLE', chuScript: 'a@b.c', congUrl: '' }, layDanhSachNguoiDung: [], layTrangThaiQuyen: { daCauHinh: false, quanTri: true, email: 'a@b.c' },
  thongTinDangNhap: { cheDo: 'TAM_GOOGLE', daDangNhap: true, email: 'a@b.c', vaiTro: 'QUAN_TRI', vaiTroNhan: 'Quản trị', quyen: [], quaPhien: false, phienMoi: '', congDangNhapUrl: '' },
  layNgayHomNay: HOM_NAY,
  layDuLieuKhoiTao: { ok: true, data: { ngay: HOM_NAY, congTy: CONG_TY, hopDong: HOP_DONG, khachHang: [], hoSoGoc: HO_SO }, meta: { phienBanDoc: { CONGTY: 1, HOPDONG: 1, KHACHHANG: 1, HOSO: 1 }, cache: {} }, error: null },
  layRevisionDuLieu: { ok: true, data: { CONGTY: 1, HOPDONG: 1, KHACHHANG: 1, HOSO: 1 }, meta: { tongMs: 1 }, error: null },
  layTongQuanHoSo: { tongHoSo: 5, daGiaiNgan: 2, daHuy: 0, choXuLy: 3, hoSoVND: 4, hoSoUSD: 1, theoTrangThai: { 'Đã giải ngân': 2, 'Nháp': 1, 'Đã tạo hồ sơ': 1 }, ganDay: [],
    ruiRoUSD: [{ maHoSo: 'HS0002', tenCty: 'CÔNG TY TNHH HIỆP VĨNH AN', soGiayNhanNo: 'GNN-2', soHopDong: 'HĐTD-01/2026', gocUSD: 120000.5, tyGiaGoc: 25800, ngayDenHan: '2026-12-12', revision: 2 }],
    tatToan: { daTatToan: 0, chuaTatToan: 4, gocUSD: 120000.5, gocVND: 4800000000, sapDenHan: 1, quaHan: 1 }, canhBao: { ngayKiemTra: HOM_NAY, tyGiaMoiNhat: { ngay: '2026-10-14', tyGiaBan: 26150, nguon: 'Vietcombank', soNgayCu: 7, trangThai: 'CU', canhBao: 'Tỷ giá đã cũ 7 ngày' }, nguongTyGia: 0.01, tongSo: 2,
      dong: [{ loai: 'QUA_HAN', mucDo: 'cao', maHoSo: 'HS0005', moTa: 'Quá hạn 16 ngày (đến hạn 2026-10-05).', duNoGoc: 1685000000, loaiTien: 'VND', soNgay: 16 }, { loai: 'TY_GIA_CU', mucDo: 'vua', maHoSo: '', moTa: 'Tỷ giá đã cũ 7 ngày — cần cập nhật.', duNoGoc: 0, loaiTien: 'USD' }] },
    quanLyVay: { hanMuc: { tongHanMuc: 20000000000, tongDaDung: 8500000000, tongConLai: 11500000000, soVuot: 0 }, rangBuoc: { VI_PHAM: 0, SAP_VI_PHAM: 1 }, baoHiemCanChuY: 1 }, revision: 'HOSO:2', revisionSo: 2 },
  layTyGiaHienThi: { ngay: '2026-10-14', tyGiaBan: 26150, nguon: 'Vietcombank', soNgayCu: 7, trangThai: 'CU', canhBao: 'Tỷ giá đã cũ 7 ngày', ghiLuc: '14/10/2026 09:05' },
  layBangDieuHanh: { ngay: HOM_NAY, hanMuc: { tongHanMuc: 20000000000, tongDaDung: 8500000000, tongConLai: 11500000000, soVuot: 0, top: [] }, phaiTra3Thang: { vnd: 1234567000, usd: 250.5 }, quaHan: { tong: 1, bac: [] }, rangBuoc: { VI_PHAM: 0, SAP_VI_PHAM: 1 }, soTaiSanDangBaoDam: 2, tongGiaTriBaoDam: 50000000000, tyGia: { tyGiaBan: 26150, ngay: '2026-10-14' }, viecCanLam: [{ muc: 'cao', loai: 'QUA_HAN', maHoSo: 'HS0005', moTa: 'HS0005 quá hạn 16 ngày.' }] },
  layHanMucTinDung: { ngay: HOM_NAY, tongHanMuc: 20000000000, tongDaDung: 8500000000, tongConLai: 11500000000, rows: [{ maHD: 'HD1', soHopDong: 'HĐTD-01/2026', tenCty: 'CÔNG TY TNHH HIỆP VĨNH AN', hanMuc: 20000000000, daDung: 8500000000, dangCho: 0, conLai: 11500000000, tyLe: 42.5, muc: 'ok', soKhoan: 4, thieuTyGia: 0, giaTriBaoDam: 50000000000, tyLeVayTrenTaiSan: 17 }] },
  layDanhSachPheDuyet: { batBuoc: false, toiLaQuanTri: true, email: 'a@b.c', soChoDuyet: 0, rows: [] }, layThietLapQuanLyVay: {}, layThietLapNhacNo: { ngayNhacTruocHan: 7, quyUocNgayLai: '365' }, layPhienBanUngDung: { version: '2026.10.23.01' },
  layTrangHoSo: { success: true, data: HO_SO.map(h => ({ maHoSo: h.MaHoSo, tenCty: 'CÔNG TY TNHH HIỆP VĨNH AN', maCty: 'CTY001', maHD: 'HD1', soHopDong: 'HĐTD-01/2026', tenNganHang: 'Vietcombank', soGiayNhanNo: h.SoGiayNhanNo, ngayGiaiNgan: h.NgayGiaiNgan.split('-').reverse().join('/'), ngayDenHan: h.NgayDenHan.split('-').reverse().join('/'), loaiTien: h.LoaiTien, soTien: h.SoTienNhanNoLanNay, daTatToan: false, trangThai: h.TrangThai, revision: 2, nguoiXuLy: 'a@b.c', ngayCapNhat: '20/10/2026 09:00' })),
    pagination: { page: 1, pageSize: 20, totalRows: 5, totalPages: 1 }, revision: 'HOSO:2', revisionSo: 2, tongTheoLoaiTien: { VND: 8000000000, USD: 120000.5 }, cache: 'HIT' },
  layCauHinhHeThong: {}, layDanhSachCongTy: CONG_TY, layDanhSachHopDongDayDu: HOP_DONG, layDanhSachKhachHangDayDu: [], layToanBoHoSoGoc: HO_SO,
};
module.exports = { DL, HOM_NAY, HO_SO, CONG_TY, HOP_DONG };
