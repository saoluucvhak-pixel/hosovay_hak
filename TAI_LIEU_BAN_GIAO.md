# TÀI LIỆU BÀN GIAO — HOSOVAY_HAK (tổng hợp)

Nhánh làm việc: `claude/friendly-faraday-g049cv` (không đụng `main`). Mọi kiểm thử dưới đây chạy trên **giả lập** (Node vm + LibreOffice + Chromium với `google.script.run` giả). Chưa chạy trên Google Sheets/Drive/LockService/CacheService thật và chưa tích hợp cổng HAK.

## 1. Kiến trúc phân lớp
```
Trình duyệt (Index.html / JavaScript.html)
  RequestCoordinator → AppDataStore → render        ← DataSyncDiagnostics (Cài đặt → Đồng bộ dữ liệu)
        │ google.script.run (mọi hàm bắt đầu bằng yeuCauDangNhap_)
Apps Script
  Đăng nhập       PortalAuthAdapter.gs (danh tính/quyền), Phien.gs (SSO HMAC, phiên, vai trò, api(), người dùng), Auth.gs
  Dịch vụ / API   DataService.gs  DocGenerator.gs  ATTACHMENTSERVICE.gs  Setting.gs  DoiSoat.gs  Template*.gs
  Miền            HoSoDomain.gs (máy trạng thái, revision, khoá voiKhoa_, sinh mã, xoá mềm, journal ghi dở dang)
  Đồng bộ/Cache   DataSync.gs (revision theo miền, CacheManager, docMien_, phong bì {ok,data,meta,error})
  Kho dữ liệu     docBangChanDoan_ / sheetToObjects_ / themDongVaoCuoiThat_ / xoaCacDongNhom_ (DataService.gs) — đóng vai trò DataRepository
  Tài liệu        DocumentService/Export/Renderer/Storage/Audit/Validator + engine DOCX/XLSX
Google Sheets (HoSoGiaiNgan, ChiTietThuHuong, DM_*, LichSu*, NhatKy*, DM_MauVanBan…)  +  Drive (file chứng từ)
```
Ghi chú trung thực: tôi **không** tách thêm một lớp `SheetRepository` bằng cách đổi tên hàng loạt (rủi ro hồi quy lớn, lợi ích thấp); các hàm đọc/ghi Sheet tập trung ở `DataService.gs`/`DataSync.gs` làm nhiệm vụ đó.

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
