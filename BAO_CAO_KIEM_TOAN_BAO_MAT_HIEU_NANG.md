# BÁO CÁO KIỂM TOÁN BẢO MẬT, ĐỒNG BỘ VÀ HIỆU NĂNG — HOSOVAY_HAK
Nhánh: `claude/kiem-toan-p0-bao-mat` (tách từ `main`). **Mọi kiểm thử dưới đây chạy trên Apps Script GIẢ LẬP (Node) và Chromium với `google.script.run` giả — chưa có bằng chứng trên Google Apps Script/Sheets/Drive/Cổng HAK thật** (xem mục 9).

## 1. Kiến trúc thực tế (đã đọc code)
`Trình duyệt (JavaScript.html: hakRun_ → AppDataStore/RequestCoordinator)` → `api(phien, tenHam, thamSo)` (PHIEN.gs, bảng quyền `bangQuyenApi_`) → `PORTALAUTHADAPTER.gs layDanhTinh_/yeuCauDangNhap_` → dịch vụ nghiệp vụ (DataService, HOSODOMAIN, BOCHUNGTU, GIAINGANTHUCTE, DOCUMENT*, TEMPLATE*) → Google Sheets (nguồn dữ liệu chính, revision từng miền) / Drive. Cache: `CacheService` (danh mục, khoá `HOSOVAY:V2:...:{revision}`), `AppDataStore` phía trình duyệt (không phải nguồn chính).

## 2. Lỗi tìm thấy và đã sửa (có bằng chứng kiểm thử)
| # | Mức | Vị trí (trước khi sửa) | Mô tả / nguyên nhân | Tác động | Sửa | Test |
|---|---|---|---|---|---|---|
| 1 | **P0** | `PORTALAUTHADAPTER.gs:37` (`ds.length === 0 \|\| …`), `:44-47` (`yeuCauDangNhap_` trả `null`) | **Fail-open**: khi `ADMIN_EMAILS` trống thì MỌI người là Quản trị; chế độ TAM_GOOGLE không chặn ai; người ẩn danh (email rỗng) còn nhận quyền NHẬP LIỆU. Kết hợp `ANYONE_ANONYMOUS` + `USER_DEPLOYING` nghĩa là ai có link đều ghi/xoá được dữ liệu tài chính bằng quyền chủ script | Toàn quyền đọc/ghi/xoá dữ liệu | Thêm `MOI_TRUONG` (PRODUCTION mặc định, **fail closed**): bắt buộc email đã xác minh + có vai trò (chủ script / `ADMIN_EMAILS` / `SYS_NguoiDung`); DEV/TEST chỉ khi đặt rõ | `chay_dang_nhap` (Chế độ ×6), `chay_bao_mat` |
| 2 | **P0** | Mọi hàm công khai (`google.script.run` gọi thẳng, bỏ qua `api()`) | Ở TAM_GOOGLE vai trò chỉ kiểm trong `api()`; gọi trực tiếp thì vai trò **XEM** vẫn chạy được 22 API ghi/quản trị | Leo thang đặc quyền | Gọi trực tiếp (không qua `api()`) chỉ chấp nhận ADMIN (giống CONG_HAK); `api()` đặt danh tính hợp lệ cho hàm bên trong | `chay_bao_mat` (4 khẳng định, quét **85 API**) |
| 3 | **P0** | `DataService.gs:~254-260,~268` (`layCongTyTheoMa`, `layHopDongTheoMa`, `layHoSoTheoMa`, `layChiTietTheoHoSo`) | 4 hàm đọc dữ liệu nhạy cảm (MST, số tài khoản, người thụ hưởng) là **hàm công khai, không kiểm đăng nhập** | Người lạ đọc dữ liệu theo mã (IDOR) | Đổi thành hàm nội bộ (`…_`, không gọi được từ trình duyệt) | `chay_bao_mat` (quét bề mặt công khai: 104 hàm) |
| 4 | **P0** | `Setup.gs initializeSpreadsheet`, `Backup.gs saoLuuHangTuan` | Hàm công khai không kiểm quyền: đổi cấu trúc Sheet; tạo bản sao Drive tuỳ ý | Phá cấu trúc / làm đầy Drive | `initializeSpreadsheet` chỉ Quản trị; `saoLuuHangTuan` (đích trigger) chặn tần suất ≥20 giờ | `chay_bao_mat` |
| 5 | **P0** | `JavaScript.html:2609-2612 esc()` | `esc()` chỉ thoát dấu `"` — **không thoát `< > &`** nhưng được dùng ở ~109 chỗ trong nội dung HTML; ngoài ra vài chỗ nối thẳng (tên công ty, thông báo lỗi) | **Stored XSS** qua tên công ty/hợp đồng/người hưởng; XSS phản chiếu qua thông báo lỗi | `esc()` thoát đủ `& < > " '`; escape ở `napDropdownCongTy_`, danh sách hợp đồng, `baoThanhCong/baoLoi`, lỗi modal | `chay_giao_dien` (XSS: không dựng thẻ, không chạy mã) |
| 6 | **P0** | Mọi `setValues` với dữ liệu người dùng | **Formula injection**: chuỗi bắt đầu `= + - @` thành công thức khi ghi Sheet | Chạy công thức/`IMPORTXML`… trong file Sheet | `lamSachCongThuc_` ở cổng `api()` (thêm `'` ở đầu; bỏ qua số thuần, ngày, chuỗi >500 ký tự như base64) | `chay_dang_nhap` (Bảo mật) |
| 7 | P1 | `DATASYNC.gs` + `JavaScript.html:212` | Sheet có khoá trùng (vd `MaHD=HD012`) → **cả màn hình Tổng quan không tải được** | Ngưng hoạt động | Giữ dòng đầu, bỏ dòng trùng, cảnh báo rõ số dòng (đã sửa ở PR #4) | `chay_dong_bo` TC21 |
| 8 | P1 | `DataService.gs luuHopDong_` | Bấm lưu hợp đồng mới nhiều lần tạo nhiều dòng giống nhau (file thật: HD011–HD015) | Dữ liệu trùng | Chặn cùng công ty + cùng số hợp đồng (PR #4) | `chay_dong_bo` TC22 |
| 9 | P1 | `DOISOAT.gs tinhDoiSoat_` | **O(N²) lần đọc Sheet**: mỗi hồ sơ đọc lại toàn bộ sheet | 1.000 hồ sơ: 706 lần đọc/7,5 triệu ô; ~10.000 hồ sơ sẽ vượt giới hạn 6 phút | Nạp một lần hợp đồng/công ty/chi tiết/lịch sử, truyền dữ liệu có sẵn | `chay_hieu_nang` (ngưỡng ≤20 lần đọc) |
| 10 | P2 | `DataService.gs layHoSoTheoMa/layChiTietTheoHoSo` | Mở 1 hồ sơ đọc toàn bộ sheet (10.000 hồ sơ: 740.125 ô) | Chậm khi dữ liệu lớn | `docCacDongTheoKhoaA_`: đọc 1 cột + chỉ các dòng cần (30.196 ô) | `chay_hieu_nang` |
| 11 | P2 | `Code.gs`, `DataService.gs` | ID Spreadsheet gắn cứng không thể tách môi trường; bản thử có thể ghi vào dữ liệu thật; nguồn bảng lương `DÁN_ID…` | Rủi ro ghi nhầm production | `CH_SPREADSHEET_ID`/`CH_SS_BANG_LUONG_ID` (Script Properties, mặc định giữ ID cũ); `kiemTraMoiTruongHeThong` báo LỖI khi DEV/TEST trỏ vào Spreadsheet production | `chay_dang_nhap` (Cấu hình ×3) |
| 12 | P2 | log rời rạc (`console.*`) | Không có request ID/user/mã lỗi thống nhất | Khó truy vết | `ghiLog_` JSON: INFO/WARN/ERROR/SECURITY, che token & dãy 9–12 số, không log tham số/tiền; `layNhatKyLoiGanDay` (Quản trị) | `chay_dang_nhap` (Log ×5), `chay_quy_trinh` TC31 |

Hạng mục đã làm ở các giai đoạn trước (không làm lại): revision bắt buộc + xung đột, state machine, soft delete/khôi phục, journal ghi dở dang, idempotency `khoaYeuCau`, cache có phiên bản + vô hiệu hoá chính xác theo miền, VND/USD số nguyên, engine DOCX/XLSX + 30 test quy trình (xem `BAO_CAO_KIEM_TOAN_QUY_TRINH.md`).

## 3. Cache & đồng bộ (mục IV)
Đã kiểm lại: Google Sheets là nguồn chính; cache danh mục khoá theo `{revision}` nên ghi xong là khoá cũ vô hiệu (chỉ miền đổi); hồ sơ **không cache** (`cache:false`); dữ liệu hỏng không được ghi cache; trình duyệt bỏ phản hồi cũ bằng bộ đếm yêu cầu. Bổ sung kiểm thử đã có: 27 trường hợp (`chay_dong_bo`) gồm hai người cùng sửa, xoá/sửa chéo, cache hết hạn/lỗi, đổi dữ liệu ngoài WebApp, mất mạng sau ghi. Không phát hiện nguồn dữ liệu thứ hai mâu thuẫn.

## 4. Phân quyền theo chức năng (mục III.2)
Bảng quyền `api()` hiện có 3 mức (XEM / NHẬP LIỆU / QUẢN TRỊ) ánh xạ 85 API. Các quyền nghiệp vụ trong yêu cầu (duyệt hồ sơ, khóa/mở khóa, xuất dữ liệu…) **chưa tách thành quyền độc lập**: hệ thống chưa có bước "Duyệt" và hợp đồng quyền chi tiết với cổng HAK_HDMB chưa được cung cấp trong repo. Giữ 3 vai trò, **không** tự đặt thêm hệ thống phân quyền riêng.

## 5. Hiệu năng (mục IX) — số đo xem `BAO_CAO_HIEU_NANG.md`
Trước → sau (10.000 hồ sơ, giả lập): mở hồ sơ 740.125 → **30.196 ô đọc** (187 → 74 ms CPU); đối soát (1.000 hồ sơ) 706 → **8 lần đọc**, 7.489.115 → 74.170 ô (892 → 122 ms). Còn lại tăng tuyến tính theo N (danh sách/lọc/báo cáo/lưu: 0,4–2,6 triệu ô ở 10.000 hồ sơ). Cột "ms" là CPU Node, **không phải độ trễ Google thật**; chưa đo tải nhiều người dùng đồng thời trên môi trường thật.

## 6. Kết quả kiểm thử (GIẢ LẬP)
| Bộ | Kết quả |
|---|---|
| Logic/engine/mẫu thật/hồi quy/tích hợp/trình tạo mẫu/đóng gói/vòng đời/đồng bộ | 49 · 118 · 102 · 22 · 29 · 34 · 54 · 27 — tất cả đạt |
| Giao diện Chromium | 112/112 |
| Đăng nhập, cấu hình, log, formula injection | 51/51 |
| Quy trình TC01–TC31 | 31/31 |
| Bảo mật (bề mặt công khai, gọi trực tiếp) | 8/8 |
| Hiệu năng (ngưỡng hồi quy) | 28 phép đo, 0 lỗi |
Chưa chạy trên môi trường thật: LockService/CacheService/Sheets/Drive thật, SSO với cổng HAK_HDMB thật, mở file bằng Microsoft Word/Excel, token hết hạn thật giữa thao tác, vượt thời gian thực thi 6 phút.

## 7. Triển khai production (BẮT BUỘC đọc — có thể khoá người dùng)
1. **Sao lưu Spreadsheet** (Tệp → Tạo bản sao) và ghi lại phiên bản triển khai hiện tại để rollback.
2. **Trước khi dán code**, mở menu Sheet *Hồ Sơ Vay NH → Cấu hình quản trị viên* và nhập email quản trị (bắt buộc: bản mới KHÔNG còn coi mọi người là quản trị). Các người dùng khác: thêm ở tab "Người dùng" (vai trò XEM / NHAP_LIEU) — email phải là tài khoản Google đã xác minh được.
3. Dán các file đã sửa (xem mục 8), **xoá file cũ** trong dự án Apps Script không có trong repo, triển khai lại web app (phiên bản mới).
4. Chạy menu *Kiểm tra môi trường & cấu hình*: mong đợi "Môi trường = PRODUCTION". Dòng "Nguồn bảng lương" CẢNH BÁO là bình thường nếu không dùng.
5. Thử lần lượt: tài khoản quản trị (đủ quyền), tài khoản NHAP_LIEU (ghi được), tài khoản XEM (chỉ đọc), tài khoản lạ (bị từ chối), mở bằng cửa sổ ẩn danh (bị từ chối).
6. Môi trường thử: đặt `MOI_TRUONG=TEST` **và** `CH_SPREADSHEET_ID` = Spreadsheet thử nghiệm (kiểm tra môi trường sẽ báo LỖI nếu quên).
**Lưu ý nới truy cập:** truy cập ẩn danh (`ANYONE_ANONYMOUS`) chỉ dùng được khi đăng nhập qua Cổng (CONG_HAK). Nếu đang chạy TAM_GOOGLE, người dùng phải có email Google nhận diện được (cùng tổ chức Workspace với chủ script hoặc chính chủ) — tài khoản Gmail khác miền có thể bị coi là ẩn danh và bị từ chối; cách an toàn là chuyển sang CONG_HAK.
**Rollback:** triển khai lại phiên bản cũ. Bản cũ vẫn chạy được với dữ liệu mới (không đổi cấu trúc dữ liệu ở đợt này; chỉ thêm Script Properties `MOI_TRUONG`, `CH_SPREADSHEET_ID`, `CH_SS_BANG_LUONG_ID`, `BACKUP_LAN_CUOI_MS`).

## 8. File thay đổi
`PORTALAUTHADAPTER.gs`, `PHIEN.gs`, `Code.gs`, `Setup.gs`, `Backup.gs`, `DATASYNC.gs`, `DataService.gs`, `DOISOAT.gs`, `DOCUMENTAUDIT.gs`, `BOCHUNGTU.gs`, `HOSODOMAIN.gs`, `JavaScript.html` + (nhánh PR #4: `DATASYNC.gs`, `DataService.gs`, `JavaScript.html`). Hàm đổi tên (không còn gọi được từ trình duyệt): `layCongTyTheoMa`, `layHopDongTheoMa`, `layHoSoTheoMa`, `layChiTietTheoHoSo` → thêm hậu tố `_` (không có nơi nào của giao diện dùng). Kiểm thử mới: `kiem_thu/chay_bao_mat.js`, `kiem_thu/chay_hieu_nang.js` (+ mở rộng `chay_dang_nhap`, `chay_giao_dien`, `chay_dong_bo`, `chay_quy_trinh` TC31).

## 9. Tồn đọng / chưa làm / rủi ro còn lại (trung thực)
1. **Chưa kiểm thử trên Google thật** — toàn bộ bằng chứng là giả lập. Cần chạy mục 7 bước 4–5 trên bản thử.
2. `executeAs: USER_DEPLOYING` + `ANYONE_ANONYMOUS` **giữ nguyên** (cổng HAK cần nhúng/đăng nhập ẩn danh). An toàn dựa hoàn toàn vào kiểm tra ở backend (đã kiểm thử); không còn lớp bảo vệ ở tầng Google. `ALLOWALL` (cho phép nhúng iframe) vẫn bật vì trang cổng cần nhúng; Apps Script không cho giới hạn nguồn nhúng → rủi ro clickjacking còn lại, chỉ giảm bằng việc mọi thao tác ghi cần xác thực + xác nhận.
3. Tách quyền chi tiết (duyệt, khoá/mở khoá, xuất dữ liệu) chưa làm — xem mục 4.
4. Giao diện (design system, modal cha–con, bộ lọc thống nhất, phân trang): **chưa nâng cấp** trong đợt này; chỉ sửa XSS/thông báo. Đây là hạng mục riêng cần thiết kế và duyệt mẫu giao diện.
5. Danh sách/lọc/báo cáo tiền vay/lưu hồ sơ vẫn đọc toàn bộ sheet (tuyến tính theo N); chưa có phân trang phía máy chủ. Ở 10.000 hồ sơ ước tính vài giây trên Google (chưa đo).
6. `layBaoCaoTienVay`, danh sách hồ sơ: chưa lọc ở máy chủ theo quyền dữ liệu (chỉ theo vai trò).
7. Vòng đệm log lỗi dùng CacheService (không bền, tối đa 100 sự kiện/6 giờ); log đầy đủ nằm ở Stackdriver của Apps Script.
8. Phát hiện formula injection dựa vào hành vi "dấu nháy đơn ở đầu = văn bản" của `setValues`; hành vi này đã được giả lập nhưng cần xác nhận trên Sheets thật (một ô thử `'=1+1`).
