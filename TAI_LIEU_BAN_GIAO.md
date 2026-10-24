# TÀI LIỆU BÀN GIAO — HOSOVAY_HAK (tổng hợp)

Nhánh làm việc: `claude/friendly-faraday-g049cv` (không đụng `main`). Mọi kiểm thử dưới đây chạy trên **giả lập** (Node vm + LibreOffice + Chromium với `google.script.run` giả). Chưa chạy trên Google Sheets/Drive/LockService/CacheService thật và chưa tích hợp cổng HAK.

## 1. Kiến trúc phân lớp
```
Trình duyệt (Index.html / JavaScript.html)
  RequestCoordinator → AppDataStore → render        ← DataSyncDiagnostics (Cài đặt → Đồng bộ dữ liệu)
        │ google.script.run (mọi hàm bắt đầu bằng yeuCauDangNhap_)
Apps Script
  Đăng nhập       PORTALAUTHADAPTER.gs (danh tính/quyền), PHIEN.gs (SSO HMAC, phiên, vai trò, api(), người dùng), AUTH.gs
  Dịch vụ / API   DataService.gs  DocGenerator.gs  ATTACHMENTSERVICE.gs  Setting.gs  DOISOAT.gs  Template*.gs
  Miền            HOSODOMAIN.gs (máy trạng thái, revision, khoá voiKhoa_, sinh mã, xoá mềm, journal ghi dở dang)
  Đồng bộ/Cache   DATASYNC.gs (revision theo miền, CacheManager, docMien_, phong bì {ok,data,meta,error})
  Kho dữ liệu     docBangChanDoan_ / sheetToObjects_ / themDongVaoCuoiThat_ / xoaCacDongNhom_ (DataService.gs) — đóng vai trò DataRepository
  Tài liệu        DocumentService/Export/Renderer/Storage/Audit/Validator + engine DOCX/XLSX
Google Sheets (HoSoGiaiNgan, ChiTietThuHuong, DM_*, LichSu*, NhatKy*, DM_MauVanBan…)  +  Drive (file chứng từ)
```
Ghi chú trung thực: tôi **không** tách thêm một lớp `SheetRepository` bằng cách đổi tên hàng loạt (rủi ro hồi quy lớn, lợi ích thấp); các hàm đọc/ghi Sheet tập trung ở `DataService.gs`/`DATASYNC.gs` làm nhiệm vụ đó.

## 2. Thiết kế dữ liệu (thay đổi)
- `HoSoGiaiNgan` thêm: `LoaiHoSoGiaiNgan, KhoaYeuCau, Revision, CapNhatLuc, CapNhatBoi, DaXoa, NgayXoa, NguoiXoa, LyDoXoa` (tự thêm cuối bảng).
- Tab mới (tự tạo): `LichSuTrangThaiHoSo`, `NhatKyGhiDoDang`.
- Script Properties: `REV_CONGTY|HOPDONG|KHACHHANG|HOSO`, `SEQ_*` (bộ đếm mã), `PORTAL_CHE_DO`, `ADMIN_EMAILS`.
- Khoá kỹ thuật `MaHoSo/MaHD/MaKH…` ổn định, tách khỏi số chứng từ nghiệp vụ (`SoGiayNhanNo`, `SoHopDong`).
- Trạng thái: `Nháp → Đã tạo hồ sơ → Đã giải ngân → Đã hủy` (+ `Đã tạo hồ sơ → Nháp`); `Đã hủy` kết thúc. Chỉ `chuyenTrangThaiHoSo_` đổi được cột `TrangThai`.

## 3. Danh sách lỗi đã xử lý (tóm tắt)
Ghi đè thầm lặng khi sửa đồng thời (→ revision/`XUNG_DOT_PHIEN_BAN`); lưu cha–con dở dang (→ kiểm tra trước, journal, đối chiếu sau ghi, tự phục hồi); mã trùng/bị cấp lại (→ khoá + bộ đếm bền); trạng thái do client quyết (→ backend); xoá cứng hồ sơ (→ xoá mềm); retry-vì-rỗng + sleep (→ gỡ); mảng toàn cục mâu thuẫn và response cũ ghi đè (→ AppDataStore/RequestCoordinator); lỗi cấu trúc Sheet bị che bằng `[]` (→ lỗi cấu trúc); báo cáo/hoá đơn vẫn tính hồ sơ xoá mềm (→ sửa); tạo hồ sơ trùng khi mất kết nối (→ `khoaYeuCau`); chứng từ tạo từ dữ liệu bị sửa giữa chừng (→ chặn chuyển trạng thái); ZIP ContentType trên Google (→ `giaiNenOffice_`).

## 4. Hướng dẫn di chuyển dữ liệu (Sheets)
1. **Sao chép** Spreadsheet sản xuất → thử trên bản sao.
2. Dán toàn bộ file `.gs`/`.html` mới; chạy "Khởi tạo / kiểm tra cấu trúc Sheet" (chỉ thêm cột/tab).
3. Hồ sơ cũ: `Revision` trống = 0 (lần lưu đầu thành 1); `DaXoa` trống = chưa xoá; không cần sửa tay.
4. Chạy Báo cáo → "Chạy đối soát" để xem số liệu và các vấn đề toàn vẹn sẵn có (tiền lẻ lịch sử, chi tiết mồ côi…) — **không tự sửa**.
5. Chỉ sau khi đối soát bản sao ổn mới deploy cho bản chính.

## 5. Hướng dẫn triển khai & rollback
Xem `TAI_LIEU_DONG_BO_DU_LIEU.md` mục 4–5. Tóm tắt: deploy phiên bản mới; giữ deployment cũ để quay lại; dữ liệu chỉ thêm cột/tab/khoá nên bản cũ vẫn chạy (hồ sơ xoá mềm sẽ hiện lại ở bản cũ).

## 6. Hướng dẫn vận hành & phục hồi
- **Lưu hồ sơ báo lỗi "Hệ thống đang xử lý…"**: có người đang giữ khoá; thử lại sau vài giây (không tự thử lại).
- **Báo `XUNG_DOT_PHIEN_BAN`**: người khác đã sửa; bấm "Tải lại hồ sơ", sửa lại.
- **Nghi ghi dở dang** (đối soát báo `GHI_DO_DANG` hoặc lưu bị gián đoạn): lần lưu kế tiếp của hồ sơ đó tự phục hồi; hoặc quản trị chạy `layGhiDoDang()` rồi `phucHoiGhiDoDang(idGhi)` (dùng bản sao trong tab `NhatKyGhiDoDang`; bản sao > 45.000 ký tự không có → xử lý tay theo ghi chú).
- **Xoá nhầm hồ sơ**: là xoá mềm → quản trị chạy `khoiPhucHoSo(maHoSo)`.
- **Dữ liệu trên màn hình cũ**: Cài đặt → Đồng bộ dữ liệu → "Làm mới (bỏ qua cache)".
- **Sửa tay trên Sheet**: không đổi revision; làm mới như trên (cache danh mục tối đa 300 s).
- Nhật ký: `NhatKyHeThong` (nghiệp vụ), `LichSuTrangThaiHoSo` (trạng thái, lý do, người), `LichSuPhatHanhTaiLieu`, log thực thi Apps Script (`[HIEU_NANG]` khi API > 3 s, `[LOI_API]` khi lỗi).

## 7. Tích hợp cổng HAK
Xem `TAI_LIEU_DONG_BO_DU_LIEU.md` mục 7. Đã làm theo mô hình HDMB_HAK (SSO HMAC + phiên + 3 vai trò + `api()`); chưa thử trên Google thật.

## 8. Bộ kiểm thử (`kiem_thu/chay_tat_ca.sh`, 14 giai đoạn)
Logic/tiền · engine DOCX/XLSX (mẫu thử + 7 mẫu thật) · tích hợp phát hành · hồi quy · trình tạo mẫu · đóng gói kết quả · giao diện (Chromium) · vòng đời hồ sơ · đồng bộ/cache/đối soát. Báo cáo bằng chứng: `BAO_CAO_KIEM_THU_DONG_BO.md`.

## 9. Danh sách chưa hoàn thành / chưa kiểm chứng
1. Đăng nhập qua Cổng đã làm theo HDMB_HAK (mục 7) nhưng **chưa thử với Cổng/Google thật**; mặc định vẫn `TAM_GOOGLE` cho tới khi quản trị bật. Ở `TAM_GOOGLE` Web App vẫn `ANYONE_ANONYMOUS` + `executeAs USER_DEPLOYING` — chỉ an toàn khi bật chế độ Cổng và siết quyền truy cập Web App.
2. Chưa chạy thật trên Google: khoá đồng thời, cache TTL/eviction, giới hạn thời gian 6 phút của Apps Script với hồ sơ rất nhiều dòng, OCR/Drive Advanced.
3. Giả thuyết nguyên nhân "đọc về rỗng" (Date lồng sâu) chưa tái hiện trên Google.
4. Giao diện: **chưa** thiết kế lại hoàn toàn theo "HAK Enterprise" — đã bổ sung phân trang/sắp xếp bảng hồ sơ, cảnh báo thay đổi chưa lưu, trang chẩn đoán, đối soát. Form cha–con dạng tab sẵn có được giữ. Bộ lọc dùng chung cho mọi bảng và phân trang các bảng khác (khách hàng, hợp đồng, báo cáo) **chưa làm**.
5. Báo cáo đối soát: chưa có xuất Excel riêng cho đối soát; giải ngân kiểm tối đa 100 hồ sơ mỗi lần.
6. Chưa kiểm thử tải nhiều người dùng thật; chưa có benchmark thời gian thực trên Google (chỉ số đếm trên giả lập).
7. Xoá tài liệu đính kèm (`xoaTaiLieuDinhKem`) vẫn xoá dòng metadata (file Drive chuyển vào thùng rác) theo thao tác chủ động của người dùng — chưa đổi sang xoá mềm.
8. Idempotency chỉ áp cho tạo hồ sơ mới; tạo công ty/hợp đồng/khách hàng mới chưa có khoá chống trùng (không tự động thử lại nên rủi ro chỉ khi người dùng bấm lặp).

## 10. Bổ sung 23–24/10/2026

### 10.1. Tệp mới / thay đổi
- **Tệp `.gs` MỚI (phải thêm mới trong Apps Script):** `LUUTRU.gs` (lưu trữ theo năm, tệp Drive, dung lượng, so sánh/khôi phục), `CHOTBAOCAO.gs` (chốt kỳ lãi, xuất Excel/PDF), `CAPNHATBAOHIEM.gs` (cập nhật bảo hiểm TSĐB từ Excel, thêm công ty bảo hiểm vào Khách hàng).
- Tệp sửa: `PHIEN.gs` (bảng quyền API), `TatToan.gs` (báo cáo lãi, tất toán theo ngày), `DOCUMENTVALIDATOR.gs`, `TEMPLATEREGISTRY.gs`, `PHAMVI.gs`, `HOADONNHIEUTRANG.gs`, `ATTACHMENTSERVICE.gs`, `DataService.gs`, `OCRSERVICE.gs`, `Demo.gs`, `Setup.gs`, `BAODAM.gs`, `HANMUC.gs`, `DUYET.gs`, `DOCUMENTSERVICE.gs`; giao diện `Index.html`, `JavaScript.html`, `Stylesheet.html`, `QuanLyVayGiaoDien.html`, `TatToanGiaoDien.html`.
- Thiếu `PHIEN.gs` mới thì giao diện báo “Chức năng không tồn tại”: mọi hàm công khai phải có trong bảng quyền (`Q_XEM_` / `Q_NHAP_` / `Q_QT_`).

### 10.2. Sheet mới (tự tạo khi dùng lần đầu)
`LuuTruNam`, `LuuTruTep`, `ChotBaoCaoLai`, `ChotBaoCaoLaiCT`, `BaoHiemTaiSan`, `BaoHiemTaiSanChiTiet`. Không cần chạy di chuyển dữ liệu. Thư mục Drive mới: `LuuTru_Nam` (và các thư mục `…_TEP` con).

### 10.3. API mới (quyền)
- Xem (mọi vai trò): `layBaoCaoTienLai`, `xuatBaoCaoLai`, `xuatTheoDoiTatToan`, `layTheoDoiTatToanTheoNgay`, `layThieuDuLieuChungTu`, `layCanhBaoDungLuong`, `layDanhSachLuuTru`, `layDuLieuLuuTru`, `layDanhSachChotLai`, `layChiTietChotLai` (riêng các hàm lưu trữ, chốt và `layCanhBaoDungLuong` còn chặn tài khoản bị giới hạn theo công ty).
- Quản trị: `luuTruNam`, `huyLuuTru`, `taoLichLuuTruNam`, `uocTinhLuuTruTep`, `lapSoTepLuuTru`, `luuTruSaoTep`, `layTepLuuTru`, `soSanhLuuTru`, `khoiPhucTuLuuTru`, `chotBaoCaoLai`, `huyChotLai`.
- Nhập liệu: `xemTruocCapNhatTSDB`, `apDungCapNhatTSDB`, `themCongTyBaoHiem`; xem: `taiMauCapNhatTSDB`, `layTrangThaiLichLuuTruNam`; Quản trị: `tatLichLuuTruNam`.
- Cột mới của sheet `TaiSanBaoDam` (tự thêm khi ghi): `NguyenGia`, `KhauHao`, `GiaTriConLai` (`GiaTriVND` vẫn là Giá trị định giá).
- Đích trình kích hoạt: `luuTruNamTuDong` (mỗi ngày 3h, chỉ có tác dụng 15 ngày đầu tháng 1).

### 10.4. Quyền OAuth
Xuất Excel/PDF dùng `UrlFetchApp` + `ScriptApp.getOAuthToken()` tới `docs.google.com` (đã dùng sẵn cho xuất chứng từ); lần đầu có thể phải cấp lại quyền. Dung lượng Drive đọc bằng `DriveApp.getStorageUsed/getStorageLimit`.

### 10.5. Quy tắc dữ liệu cần biết
- Lãi trong hạn = dư nợ gốc thực tế × lãi suất ÷ cơ số (365/360), từ ngày giải ngân (gồm) đến ngày đến hạn/tất toán (không gồm). Lãi quá hạn là ước tính (`tinhLaiPhat_`). Quy đổi USD theo tỷ giá cuối tháng (bản ghi gần nhất trước/đúng ngày).
- Bản chốt không sửa/xoá; hủy chốt = đánh dấu. Lưu trữ không tự dọn. Khôi phục chỉ thêm dòng mất, không ghi đè.
- Google Sheets tự đổi chuỗi “MM/yyyy” thành ngày; đọc về luôn chuẩn hoá bằng `chuanThang_`.

### 10.6. Chưa kiểm chứng trên Google thật
1. Xuất Excel/PDF (`SpreadsheetApp.create` + export URL), thời gian xuất với nhiều dòng (giới hạn 5.000 dòng/lần).
2. Sao tệp Drive hàng loạt (`makeCopy`, giới hạn 6 phút/lần chạy — đã chia lô 4 phút và tiếp tục được), số liệu `getStorageUsed/Limit` của tài khoản Workspace.
3. Lưu trữ file dữ liệu rất lớn (`makeCopy` toàn file) và mở bản lưu trữ để xem.
4. Phạm vi công ty: `phamViCongTyNguoiDung_()` hiện luôn rỗng ở môi trường thật (chưa có Cổng cấp phạm vi); các nhánh “bị giới hạn công ty” mới chỉ kiểm bằng giả lập.
5. Lỗi “Those rows are out of bounds” người dùng gặp trên Google thật **chưa xác định được thao tác gây ra** — cần dòng log trong Apps Script › Thực thi (Executions) để khoanh vùng.
6. `kiem_thu/chay_doc_nhieu_trang_ui.js` không chạy được ở môi trường không có mạng (tải pdf.js từ CDN); lỗi giống nhau trước và sau các thay đổi.
7. Đọc Excel của “Cập nhật bảo hiểm TSĐB” dùng Drive nâng cao v2 (`Drive.Files.copy` convert, như đọc bảng lương) — chưa thử trên Google thật với file Excel thật của đơn vị; cột được nhận theo tên tiêu đề (xem mô tả đầu `CAPNHATBAOHIEM.gs`).

## 11. Toàn vẹn tài sản thế chấp / bảo hiểm (24/10/2026)
- Cột mới: `TaiSanBaoDam.Revision`, `BaoHiemTaiSan.Revision/TheHe`, `BaoHiemTaiSanChiTiet.TheHe`. Nâng cấp bằng `nangCapCauTrucBaoDam_()` (idempotent; chạy lại được; đã gắn vào `khoiTaoCauTrucSheet_`). Bản cũ chưa có cột vẫn đọc được.
- API mới (Quản trị): `layTrangThaiToanVenBaoHiem`, `donChiTietBaoHiemThua`. Hợp đồng ghi: sửa/hủy/giải chấp bắt buộc `expectedRevision`.
- Giới hạn kiểm chứng: toàn bộ kiểm thử chạy trên giả lập Apps Script + Chromium với stub `google.script.run`; CHƯA kiểm với Google Sheets/Drive thật. `LockService` chỉ tuần tự hoá, không phải giao dịch — tính nhất quán dựa vào thế hệ + đọc lại.

### 11b. Giao dịch ghi bảo hiểm (bổ sung)
- Cột/bảng mới: `TaiSanBaoDam.KhoaYeuCau`, `BaoHiemTaiSan.SoDong/MaGD`, bảng `GiaoDichBaoHiem` (chỉ thêm dòng: CHO_CHOT, LOI_CHUA_CHOT, CHUA_XAC_DINH, XAC_MINH_*, PHUC_HOI). `nangCapCauTrucBaoDam_()` tạo/bổ sung, chạy lại an toàn.
- Hợp đồng `TheHe` chỉ tăng, không tái sử dụng; cha lưu `SoDong` để biết thế hệ hiện hành có đủ chi tiết. API Quản trị mới: `xacMinhPhucHoiBaoHiem(maBH)`. Hợp đồng “CHƯA XÁC ĐỊNH” → Cài đặt › Đồng bộ › Kiểm tra toàn vẹn bảo hiểm › Xác minh/phục hồi.
- `luuTaiSanBaoDam` (tạo) cần `khoaYeuCau`; `huyBaoHiemTaiSan`/`giaiChapTaiSan` cần `expectedRevision` (máy chủ từ chối nếu thiếu).
- Giới hạn kiểm chứng: mock Node + Chromium với stub `google.script.run`; số liệu hiệu năng là số thao tác mock, KHÔNG phải thời gian của Google thật; chưa kiểm trên Google Sheets/Drive thật.

### 11c. Rà soát luồng dữ liệu (bổ sung)
- Cột mới tự thêm khi ghi lần đầu: `DM_KhachHang.Revision/KhoaYeuCau`. `luuKhachHang`: tạo mới nên gửi `khoaYeuCau`; sửa BẮT BUỘC `expectedRevision` (giao diện đã cập nhật).
- `luuChungTuNhieuTrang` trả thêm `boQuaTrung[]` và `soDong` = số dòng thực ghi.
- `luuCongTy`: nhiều công ty phải gửi đúng `maCty`.
- Tệp .html mới `HuongDanQuyTrinh.html` — PHẢI thêm vào dự án Apps Script (Index.html include nó).
