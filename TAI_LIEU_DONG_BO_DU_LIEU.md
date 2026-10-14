# ĐỒNG BỘ DỮ LIỆU, CACHE VÀ TÍCH HỢP CỔNG — PHẦN A (đã làm) / PHẦN B (chờ hợp đồng tích hợp)

> Mọi kết quả kiểm thử dưới đây chạy trên **giả lập** Apps Script (Node) + Chromium với `google.script.run` giả. Chưa thử trên Google Sheets/CacheService/LockService/Drive thật, chưa thử với cổng HAK.

## 1. Nguyên nhân gốc và xử lý
| Mã | Triệu chứng | Nguyên nhân (đã xác định / còn là giả thuyết) | Xử lý |
|---|---|---|---|
| F1 | Danh sách rỗng thật mất thêm 2,7 s/danh sách | `docCoThuLai_` coi rỗng = lỗi, `Utilities.sleep` 0,5+0,9+1,3 s | **Gỡ**. Rỗng là hợp lệ, lỗi là lỗi |
| F2 | Dòng dữ liệu "biến mất" | `sheetToObjects_` bỏ qua dòng lỗi trong try/catch im lặng | `docBangChanDoan_`: dòng thiếu khoá ghi nhận `THIEU_KHOA`; thiếu tab/cột bắt buộc → lỗi cấu trúc (không trả `[]`) |
| F3–F4 | 5 lượt gọi lồng nhau + `tuChuaHopDongNeuRong_` (setTimeout 1,5 s) | Chữa triệu chứng "về rỗng" | 1 lượt `layDuLieuKhoiTao`; gỡ `tuChuaHopDongNeuRong_` |
| F5 | 6 mảng toàn cục mâu thuẫn (`DS_HOP_DONG` vs `DS_HOP_DONG_ALL`…) | Không có nguồn dữ liệu thống nhất | `AppDataStore` duy nhất |
| F6 | Response cũ ghi đè mới | Không đánh số request | `RequestCoordinator` (mỗi khoá chỉ nhận lượt gọi mới nhất) + so phiên bản miền |
| F7 | Trả rỗng/`null` dù server không lỗi | **Giả thuyết mạnh**: `Date` lồng sâu không đóng gói qua `google.script.run` (chỉ chuẩn hoá Date ở tầng 1). **Chưa tái hiện được trên Google thật** | `anToanChoTrinhDuyet_` đệ quy (Date/NaN/Infinity/hàm); phản hồi `null` → báo lỗi thật |
| F8 | Không biết lỗi do đâu | Không có phong bì | `{ok,data,meta,error}` cho API nạp dữ liệu (`phongBi_`) |

## 2. Kiến trúc mới
```
Trình duyệt                                  Apps Script
 RequestCoordinator ──► layDuLieuKhoiTao ──► phongBi_ ──► docMien_ ──► CacheManager (danh mục) ─┐
  (seq theo khoá,        layRevisionDuLieu     │            └──────────► Sheet (nguồn thẩm quyền) ◄┘
   log chẩn đoán)                              └─ meta{idYeuCau,phienBanDoc,cache,soBanGhi,tongMs,revisions}
 AppDataStore (congTy, hopDong, khachHang, hoSoGoc, hoSoLoc + phienBan[miền])
 DataSyncDiagnostics (Cài đặt → Đồng bộ dữ liệu)
```
- **Revision theo miền** `CONGTY|HOPDONG|KHACHHANG|HOSO` (Script Properties `REV_*`), tăng trong khoá ghi sau mỗi lần ghi. Revision của từng hồ sơ (`Revision`) giữ nguyên cho phát hiện xung đột sửa.
- **Cache** chỉ cho danh mục: khoá `HOSOVAY:V2:{phạm vi}:{miền}:{revision}`, TTL 300 s, giá trị > 90 KB thì BYPASS. Hồ sơ (giao dịch) và báo cáo **không cache** (đọc từ Sheet). Không dùng cache thay khoá/giao dịch; không có dữ liệu nhạy cảm trong khoá/nhật ký chẩn đoán. Phạm vi `ALL` hiện nay (1 công ty); khi cổng cấp phạm vi công ty, khoá tự tách theo `CT-{danh sách công ty}`.
- **Sửa tay trực tiếp trên Sheet** không đổi revision → danh mục cũ tối đa 300 s; nút "Làm mới dữ liệu (bỏ qua cache)" xử lý ngay.
- **Phát hiện thay đổi từ phiên khác**: khi quay lại tab trình duyệt hoặc đổi tab giao diện (giới hạn 15 s/lần) hỏi `layRevisionDuLieu` (rẻ) và chỉ nạp lại miền bị đổi. Không dùng bộ đếm giờ.
- **Idempotency**: tạo hồ sơ mới mang `khoaYeuCau`; gửi lại cùng khoá trả hồ sơ đã tạo (`daCoTuTruoc`). Cập nhật dùng `expectedRevision`. **Không có retry tự động cho thao tác ghi.**

### Ma trận vô hiệu hoá (mutation → miền tăng revision → client nạp lại)
| Thao tác | Revision tăng | Client nạp lại |
|---|---|---|
| Lưu công ty | CONGTY | CONGTY (+ vẽ lại hợp đồng/dropdown) |
| Lưu hợp đồng | HOPDONG | HOPDONG |
| Lưu khách hàng; hoá đơn tự thêm KH theo MST | KHACHHANG | KHACHHANG |
| Lưu/sửa hồ sơ, đổi trạng thái, xoá mềm, khôi phục, phục hồi ghi dở, cập nhật link chứng từ | HOSO | HOSO (+ chạy lại bộ lọc) |
Không xoá toàn bộ cache: chỉ khoá của miền đổi đổi phiên bản (khoá cũ tự hết hạn).

## 3. Benchmark (số đếm trên giả lập — xem `kiem_thu/do_hieu_suat_dong_bo.js`)
| Kịch bản | Trước | Sau |
|---|---|---|
| Mở trang, Sheets **rỗng** | 5 lượt gọi; 12 lần `sleep` = **10 800 ms** ngủ phía máy chủ; 16 lần đọc Range | 1 lượt gọi; **0 sleep**; 4 lần đọc Range (lần 2: 1) |
| Mở trang, 150 hồ sơ + 20 khách hàng | 5 lượt gọi; 4 lần đọc Range mỗi lần | 1 lượt gọi; 4 lần đọc (lần 2, danh mục HIT: 1 lần — chỉ hồ sơ) |
Thời gian thực (ms) trong bảng log phản ánh Node, **không** phải độ trễ mạng/Google; số lượt gọi, số lần đọc và thời gian ngủ là số đếm đáng tin.

## 4. Triển khai
1. Dán các file: **mới** `DataSync.gs`, `HoSoDomain.gs`, `PortalAuthAdapter.gs`; **sửa** `DataService.gs`, `HoSoDomain.gs`, `DocGenerator.gs`, `ATTACHMENTSERVICE.gs`, `Setup.gs`, `Index.html`, `JavaScript.html` (+ các file đã gửi ở lần trước).
2. Chạy menu "Khởi tạo / kiểm tra cấu trúc Sheet" (thêm cột `KhoaYeuCau`, `Revision`… nếu chưa có). **Sheet thiếu cột bắt buộc nay báo lỗi cấu trúc thay vì trả rỗng.**
3. Deploy Web App phiên bản mới. Mở Cài đặt → Đồng bộ dữ liệu → "Làm mới" để kiểm tra.
4. Kiểm tra bằng bản **sao** của Spreadsheet trước; không thử thao tác phá huỷ trên dữ liệu sản xuất.

## 5. Rollback
Giữ bản Deployment cũ (Apps Script → Manage deployments → chọn phiên bản trước). Dữ liệu tương thích ngược: chỉ **thêm** cột/tab (`Revision`, `KhoaYeuCau`, `DaXoa`…, `LichSuTrangThaiHoSo`, `NhatKyGhiDoDang`) và Script Properties `REV_*`/`SEQ_*`; bản cũ bỏ qua các cột/khoá này. Hồ sơ đã **xoá mềm** sẽ hiện lại ở bản cũ (bản cũ không biết `DaXoa`) — nếu cần, lọc theo cột `DaXoa=TRUE` trước khi quay lại.

## 6. Chưa thể kiểm thử thực tế
- Hành vi thật của `LockService`/`CacheService`/Sheets trên Google (đồng thời thật nhiều người, TTL, eviction thật).
- Nguyên nhân F7 trên Google thật (giả thuyết Date); cần quan sát log Executions sau khi triển khai.
- Hai trình duyệt thật cùng thao tác (TC19 mới mô phỏng bằng revision máy chủ trả về).
- Mọi tích hợp cổng HAK (xem mục 7).

## 7. PHẦN B — Tích hợp cổng HAK (chưa hiện thực; cần quyết định)
Đã đọc `saoluucvhak-pixel/HDMB_HAK` (tham chiếu, `34_PhanQuyen.gs`). Quan sát từ **mã nguồn** (chưa chạy):
- Đăng nhập qua một Web App "Cổng đăng nhập" riêng (execute as người truy cập) ký **HMAC-SHA256** payload `{email, exp (5 phút), n (nonce dùng 1 lần), yc}` bằng bí mật chung `SSO_SECRET`; ứng dụng nhận `?sso=` → xác minh chữ ký/hạn/nonce → cấp mã phiên 64 hex trong ScriptCache (6 giờ, tối đa 7 ngày). Trình duyệt gọi qua `api(phien, tenHam, thamSo)` với bảng quyền.
- **Vai trò (ADMIN/NHAP_LIEU/XEM) lưu ngay trong từng ứng dụng** (sheet `SYS_NguoiDung` + danh sách quản trị cố định trong mã). Token từ cổng **chỉ chứa email** — không có vai trò hay phạm vi công ty.
- Hệ quả: giao thức xác thực danh tính **đọc được** từ repo, nhưng **nguồn quyền "đáng tin" từ cổng trung tâm thì repo không định nghĩa** — nó là RBAC riêng mỗi ứng dụng, đúng điều yêu cầu cấm cho HOSOVAY_HAK. Vì vậy `PORTAL_CHE_DO=CONG_HAK` vẫn **từ chối mọi truy cập** (không mở ẩn danh, không tự đặt giao thức).
- Cần bạn chọn: (a) cổng có API/sheet trung tâm trả vai trò + công ty cho email (cho biết cách gọi và cách xác thực), hay (b) chấp nhận chỉ dùng SSO HMAC để lấy **danh tính** và vai trò lấy từ danh sách trung tâm HAK do bạn chỉ định. Sau khi chốt, chỉ cần hiện thực `xacMinhPhienCong_()` (và `getCompanyScope`, `checkPermission`, `handleSessionExpired` mapping trong `PortalAuthAdapter.gs`).
