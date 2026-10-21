# Báo cáo kiểm tra và sửa main — 21/10/2026

Nhánh: `claude/kiem-tra-sua-main` (tách từ `main` tại `1882ead`, đã gồm PR #9, #10, #11). **Chưa tạo PR, chưa merge, chưa triển khai, không đụng dữ liệu vận hành.**

> **Phân biệt môi trường kiểm thử.** Mọi kết quả dưới đây chạy trên **bộ giả lập Apps Script/Sheets/Drive** (`kiem_thu/gia_lap_apps_script.js`), LibreOffice (PDF) và Chromium + Playwright với `google.script.run` giả lập. **Chưa chạy trên Google thật** (chưa có bản sao staging); phần “Việc cần làm trên staging Google” ở cuối liệt kê những gì phải kiểm lại.

## 1. Cách làm
Với từng yêu cầu: viết kiểm thử **hành vi** trên main mới nhất → nếu đã đạt thì chỉ thêm hồi quy, **không sửa lại**; nếu chưa đạt thì sửa tối thiểu và kèm kiểm thử. Bộ kiểm thử mới: `chay_kiem_tra_toan_dien.js` (14), `chay_luong_day_du.js` (10), `chay_unc_hai_khoan.js` (5), `chay_giao_dien_kiem_tra_main.js` (26), thêm 2 ca vào `chay_doi_soat_sao_ke.js`.

## 2. Kết quả theo từng yêu cầu

### 2.1 Đối soát sao kê (bốn lỗi từ báo cáo `3aef5c4`)
| Lỗi | Trạng thái trên main `1882ead` | Việc làm |
|---|---|---|
| Hai dòng cùng ngày/số tiền cùng được gợi ý một giao dịch | **Đã sửa sẵn (PR #11)** — ghép một-một, tranh chấp → “nhiều ứng viên”, cần kiểm tra thủ công | Giữ ca hồi quy có sẵn |
| `100 EUR` bị đổi thành VND | Đã sửa sẵn — chỉ nhận USD/VND, loại khác báo lỗi dòng, không quy đổi | Giữ hồi quy |
| `12-34` → `1234` | Đã sửa sẵn — kiểm tra vị trí dấu âm/ngoặc/ký hiệu/nhóm phân cách | Giữ hồi quy |
| `31/02/2026` được nhận | Đã sửa sẵn — kiểm tra lịch thật, năm nhuận | Giữ hồi quy |
| **Báo lỗi từng dòng** (yêu cầu mới) | **Chưa đủ (lỗi thật):** (a) `loi.slice(0, 20)` cắt bớt — từ dòng lỗi thứ 21 bị bỏ qua **im lặng**; (b) giao diện chỉ hiện **dòng lỗi đầu tiên** + số lượng; (c) dòng có **cả Ghi nợ lẫn Ghi có** bị tự chọn Ghi nợ | **Đã sửa:** trả đủ mọi dòng lỗi (có số dòng), giao diện có danh sách mở sẵn “N dòng bị bỏ qua vì lỗi”, dòng nợ+có cùng lúc báo “cần kiểm tra thủ công”. 2 ca kiểm thử mới |

### 2.2 Bảo vệ dữ liệu / nghiệp vụ
| Yêu cầu | Kết quả kiểm tra | Việc làm |
|---|---|---|
| Idempotency phía máy chủ (bấm lặp, gửi lại khi mạng đứt) | Đạt sẵn (`KhoaYeuCau`; xác nhận giải ngân trùng bị chặn) | Hồi quy mới (luồng đầy đủ, bước 1 và 6) |
| Hai người cùng sửa (revision) | Đạt sẵn | Hồi quy mới (bước 7) |
| Hồ sơ đã giải ngân được bảo vệ; điều chỉnh cần lý do/người/lịch sử | Đạt sẵn (`ghiNhanDieuChinhGiaiNgan`, TC19–TC20) | Giữ |
| Cha–con theo từng loại tiền, giữ USD thực, làm tròn | Đạt sẵn (`chay_cha_con`, `chay_usd_cent`); thêm ca USD 1.000,25 + 500,25 | Hồi quy mới |
| **Phân quyền theo công ty phía máy chủ** | **LỖI THẬT (P1):** chỉ danh sách/trả nợ/tất toán có lọc theo công ty; **đọc/sửa/xóa/xác nhận/hủy/phát hành chứng từ/xem xác nhận/xem lịch sử theo mã hồ sơ, tạo hồ sơ vào hợp đồng công ty khác, sửa/xóa hợp đồng và công ty ngoài phạm vi, `layToanBoHoSoGoc`, danh sách công ty/hợp đồng đều KHÔNG bị chặn** (người có quyền thấp hơn vẫn gọi trực tiếp được) | **Đã sửa:** file mới `PHAMVI.gs`; `layHoSoTheoMa_` (cổng chung của mọi hàm ghi/xác nhận/hủy/phát hành) từ chối hồ sơ ngoài phạm vi; `docDanhSachHoSo_` lọc tại nguồn (mọi báo cáo); chặn tạo hồ sơ/sửa/xóa hợp đồng, sửa/tạo công ty ngoài phạm vi; các hàm đọc theo mã có chặn. Quản trị toàn hệ thống (phạm vi rỗng) **không đổi hành vi** |
| Hợp đồng mới mặc định “Nháp”; chỉ “Đang hiệu lực” tạo hồ sơ; không xóa hợp đồng đã có hồ sơ | Đạt sẵn | Hồi quy mới |
| Tách trạng thái chứng từ / giải ngân / tất toán | Đạt sẵn (hồ sơ “Đã tạo hồ sơ” không vào báo cáo giải ngân thực tế) | Hồi quy mới |
| **Rủi ro tỷ giá chỉ cho khoản đã giải ngân còn dư nợ** | **LỖI THẬT (P2):** khoản đã trả hết gốc nhưng chưa bấm Tất toán vẫn nằm trong rủi ro USD; thẻ “Quá hạn / Đến hạn 7 ngày” còn đếm cả khoản đã trả hết gốc | **Đã sửa** (`TatToan.gs`: `duLieuRuiRoKhoanVay_`, `thongKeTatToan_`). Trả một phần: tính trên dư nợ còn lại (1.500,50 − 500,50 = 1.000 USD) — có kiểm thử |
| Cảnh báo tài liệu cũ không khớp dữ liệu/mẫu | Đạt sẵn (dấu vân tay bộ chứng từ → “hết hiệu lực”) | Hồi quy mới (bước 4) |
| **Lưu hồ sơ với ngày không tồn tại** (phát hiện thêm khi viết luồng đầy đủ) | **LỖI THẬT (P1, hỏng dữ liệu im lặng):** `ngayGiaiNgan = 2026-02-31` được lưu thành **03/03/2026**; `31/02/2026` lưu nguyên chuỗi sai; áp dụng cả ngày giấy nhận nợ, ngày đến hạn, ngày hợp đồng, ngày tài liệu | **Đã sửa:** `kiemTraNgayTonTai_` (kể cả năm nhuận; 29/02/2028 hợp lệ). Không ghi gì khi ngày sai |
| Kiểm tra ngày trả nợ/xác nhận phụ thuộc múi giờ máy chạy | **Lỗi thật (P2):** `ngayChuanISO_` dựng `Date` theo múi giờ cục bộ → ở UTC+13 báo “ngày không tồn tại” cho ngày hợp lệ | **Đã sửa** bằng kiểm tra lịch thuần (UTC). `chay_nhac_no` nay đạt ở UTC, Asia/Ho_Chi_Minh, America/Los_Angeles, Pacific/Auckland, Pacific/Kiritimati |

### 2.3 Nhắc nợ & tỷ giá
- Chống gửi email trùng khi chạy đồng thời, lỗi sau khi giành quyền gửi: **đạt sẵn (PR #11)** — giữ hồi quy (14 ca), chạy ở 5 múi giờ. Kiểm thử không gửi email thật, không tạo lịch thật (mock `MailApp`/`CalendarApp`).
- **Tỷ giá — nguồn, thời điểm, trạng thái: CHƯA CÓ (đã thêm).** `layTyGiaThuCongMoiNhat_` nay trả nguồn, thời điểm ghi, số ngày cũ, `MOI/CU` (ngưỡng cấu hình `TY_GIA_CU_SAU_NGAY`, mặc định 2 ngày để chịu cuối tuần) và câu cảnh báo. Thiếu hoặc cũ thì: thanh bên hiện “Chưa có” / dấu ⚠ + chú thích; cảnh báo mới “Tỷ giá cũ/thiếu” (chỉ khi còn khoản USD có dư nợ); dự báo dòng tiền hiện cảnh báo, **không** trình bày tỷ giá cũ như tỷ giá hiện hành. 3 ca kiểm thử.

### 2.4 Giao diện (ảnh thật trước/sau trong thư mục ảnh đính kèm)
- **Token:** thêm một khối tiêu chuẩn cuối `Stylesheet.html` (cỡ chữ, khoảng cách, chiều cao điều khiển 34px, bo góc 8px, đổ bóng tối thiểu; tối: không bóng). Màu giữ nguyên bộ token luxe của Design System. Gỡ **3 nhóm định nghĩa nút chồng chéo** (nút chính/phụ/thành công bị định nghĩa 3 lần với màu khác nhau, có đổ bóng).
- **Tổng quan:** 6 chỉ số theo thứ tự ưu tiên *Dư nợ VND → Dư nợ USD → Quá hạn → Đến hạn 7 ngày → Hạn mức còn lại → Ràng buộc/bảo hiểm*; thẻ Quá hạn viền đỏ khi >0; số không xuống dòng vô nghĩa; thẻ “Điều hành khoản vay” và “Đã tất toán” bỏ khỏi hàng chỉ số (nút Quản lý vay/Tất toán đã có ở menu; “đã tất toán” chuyển vào khối thống kê thu gọn). Phiên bản code, kiểm tra cấu trúc dữ liệu, kiểm tra kết nối gom vào **một mục “Thông tin kỹ thuật” thu gọn** cuối trang.
- **Một hành động chính mỗi khu vực:** “Thêm hồ sơ VND” là nút chính, “USD” là nút nhạt (trước đó cả hai cùng nút đậm ở danh sách, ngược nhau ở Tổng quan).
- **Chỉ rõ nơi xác nhận giải ngân / trả nợ / tất toán:** ngay tại từng dòng danh sách hồ sơ — “Đã tạo hồ sơ” → nút **Xác nhận giải ngân** (mở hồ sơ ở bước Thực hiện); “Đã giải ngân” chưa tất toán → nút **Trả nợ / Tất toán** (mở đúng hồ sơ ở màn Tất toán); “Nháp” không có nút nào (không giải ngân khi chưa đủ chứng từ).
- **Ô hợp đồng rỗng:** nay giải thích nguyên nhân (chưa tải xong / lỗi tải / không có hợp đồng nào cho tài khoản / có nhưng toàn “Nháp”) và có nút **Tải lại danh sách** (bỏ qua cache) khi việc tải lại có thể giúp.
- **Màn nhỏ:** ba ô Bảng màu/Sáng–tối/Mật độ (chiếm ~190px mỗi màn) thu vào nút “Giao diện”; thẻ chỉ số xếp một cột; không tràn ngang ở 390px.
- **Ngày/số:** bộ lọc ngày mặc định *đầu tháng → hôm nay theo giờ Việt Nam* (đã đạt sẵn; kiểm thử với múi giờ máy Los Angeles); nhãn lọc nay hiển thị `dd/MM/yyyy` thay `yyyy-MM-dd`; số tiền căn phải, kèm cột loại tiền, định dạng 1.234,56.
- **Giới hạn:** ô chọn ngày gốc của trình duyệt hiển thị theo ngôn ngữ trình duyệt (máy tiếng Việt → dd/mm/yyyy); ảnh chụp trong môi trường kiểm thử hiện `mm/dd/yyyy` vì trình duyệt máy chủ là en-US.

### 2.5 Mẫu 1 món / 2 món / nhiều món
- **Phát hiện:** trên main, hồ sơ **2 món** ra **Bảng kê** (UNC chỉ có cho 1 món). Hệ thống đã có sẵn cơ chế UNC 2 món (placeholder `MON_1.*`/`MON_2.*`, điều kiện `2`) nhưng **không có tệp mẫu** — chính là yêu cầu “2 món → hai UNC riêng, mỗi món 2 liên”.
- **Đã làm:** `mau_that/UNC_2_KHOAN.xlsx` được **sinh từ chính mẫu thật `UNC_1_KHOAN.xlsx`** (không vẽ lại): nhân nguyên văn khối UNC (logo, ô tích, khung, phông, độ rộng cột) thành 4 khối — trang 1 = món 1 (liên 1 + liên 2), trang 2 = món 2 (liên 1 + liên 2); A4 dọc, tỉ lệ 74%. Đổi placeholder `{{CT.*}}` → `{{MON_i.*}}`; số tiền = `{{MON_i.SO_TIEN_VN}} {{MON_i.LOAI_TIEN}}` (mỗi món có loại tiền riêng), tài khoản trích nợ theo loại tiền của món. Script sinh: `kiem_thu/tao_mau_unc_2_khoan.py`. Tải lên với điều kiện `2` (hệ thống tự gắn `[UNC_2_MON]`); Bảng kê đổi sang `3+`. **Khác mẫu thật 1 món:** số tiền hiển thị theo loại tiền của món (không phải “quy đổi VND”) vì UNC 2 món phải xử lý món USD/VND độc lập; bỏ 2 hàng trống cuối và các ô trợ giúp ngoài vùng in; thêm dòng nhãn “Món i — Liên j” phía trên mỗi khối.
- **Kiểm thử trên PDF thật (LibreOffice):** 2 món VND → đúng 2 trang, mỗi trang 2 liên, trang 1 chỉ món 1 (×2), trang 2 chỉ món 2 (×2), không còn `{{…}}`; 2 món USD số lẻ 1.234,56 và 0,5 → “Một ngàn, hai trăm ba mươi bốn đô la Mỹ và năm mươi sáu cent”, tài khoản USD; 1 món → UNC_1_KHOAN; 5 món → Bảng kê. (Quy ước đọc số của hệ thống là “ngàn”/“cent”.)

### 2.6 Luồng đầy đủ (`chay_luong_day_du.js`, mẫu thật)
Lập hồ sơ USD 2 món → bấm lặp → tổng lệch bị chặn → tạo bộ chứng từ (Đề nghị + UNC 2 món + HĐMB) → sửa sau phát hành (cảnh báo tài liệu cũ) → bật duyệt hai cấp (người lập không tự duyệt, người xem bị chặn) → xác nhận giải ngân (thiếu tham chiếu/sai số tiền/gửi lặp bị chặn) → hai phiên cùng sửa → trả nợ từng phần (không mất cent) → trả nợ vượt dư nợ bị chặn → tất toán (còn dư nợ bị chặn) → hồ sơ đã giải ngân không xóa được; ngày sai bị từ chối.

## 3. Nội dung áp dụng từ 5 repository chuẩn (đọc ở chế độ chỉ-đọc)
| Repo | Đã áp dụng | Không áp dụng / lý do |
|---|---|---|
| **HAK_CODE_QUALITY_TEST** | Chạy CLI `hak-quality` trên bản sạch (tệp được Git theo dõi) của cả `main 1882ead` và nhánh này: **cùng 7 cảnh báo** (2 `long-file`: Index.html, JavaScript.html; 5 `debugger` là chuỗi trong chính công cụ kiểm tra), 0 vòng phụ thuộc. Không phát sinh cảnh báo mới | Quét thư mục làm việc (có kết quả kiểm thử) sinh 41 cảnh báo giả do tệp kết quả — đã loại |
| **HAK_AI_SKILLS** | Quy trình `hak-code-auditor` (phân loại P0/P1/P2, ghi vị trí + cách tái hiện + chạy lại test), `hak-data-integrity` (idempotency, mồ côi, báo cáo sai lệch trước khi sửa), `hak-parent-child-data-model` (tổng cha = tổng con theo loại tiền, 1/2/nhiều con, tạo đồng thời, xóa, phân quyền), `hak-ui-designer` (ảnh trước/sau, màn nhỏ, focus) | `hak-payroll-validator`, `hak-electron-security`, `hak-release-builder`, `hak-migration-manager`: không thuộc phạm vi |
| **HAK_SMART_FILTER** | Đã có sẵn `HAKSmartFilter.gs` + `HAKFilterAdapter.gs` (cùng quy tắc từ chối khoảng ngày đảo ngược). **Bổ sung hồi quy:** từ > đến bị từ chối; ngày không tồn tại bị từ chối; lọc áp phạm vi công ty trước phân trang (tổng = 0 khi ngoài phạm vi) | Adapter giao diện `ui/*.js` (kế thừa LUONG_HAK, cần ứng dụng chủ cung cấp hàm) — không nhúng |
| **HAK_ACCOUNTING_REPORT_STANDARD** | Đối chiếu `formatNumber`/`formatDateISO` của chuẩn với `formatSo_`/`ngayChoMau_` của ứng dụng trên 16 giá trị: khớp với mọi giá trị hợp lệ (1.250.000,75; −1.250.000,75; 26.145,5…). Khác biệt có chủ ý và **chặt hơn chuẩn**: tiền USD không làm tròn ngầm (0,005 và 100,255 bị từ chối thay vì làm tròn), từ chối ≥ 10^15; `-0` hiển thị `0`. Áp dụng quy tắc: số căn phải kèm đơn vị, ngày `dd/MM/yyyy`, không đổi số tài khoản thành số, ngày không tồn tại bị từ chối | Chuẩn là nền định dạng, chưa có bộ xuất PDF/XLSX — không dùng thay engine mẫu |
| **HAK-Enterprise-Design-System** | Khối token cuối `Stylesheet.html` theo tinh thần `tokens/luxe.css` + `docs/DESIGN_SYSTEM_V10_4.md`: giữ nguyên bảng màu luxe/classic/neutral/champagne sáng–tối (đã có `--mut-aa`), chỉ chuẩn hóa cỡ chữ/khoảng cách/bo góc/bóng/chiều cao điều khiển; kiểm tra tương phản qua `chay_theme.js` (358 ca, 8 giao diện × 3 kích thước) và 14,1:1 cho chữ số liệu chế độ tối trên màn nhỏ | Mẫu “Lưu trữ theo năm” (`ARCHIVE_YEARBOOK_PATTERN.md`) và CSS bố cục workspace V10.4 — chưa nhúng (đổi lớn, ngoài phạm vi, cần kiểm thử tích hợp riêng) |

## 4. Kết quả chạy
(xem mục “Kết quả cuối” cập nhật khi chạy xong `npm run test:full`)

## 5. Thay đổi cấu trúc dữ liệu
**Không đổi cột/sheet.** Cấu hình tùy chọn mới (nếu muốn đổi ngưỡng): thuộc tính hệ thống `TY_GIA_CU_SAU_NGAY` (số ngày, mặc định 2). Mẫu mới `UNC_2_KHOAN.xlsx` là tệp tải lên qua *Cài đặt → Quản lý mẫu văn bản*.

## 6. Việc cần làm trên staging Google (chưa chạy)
1. Sao chép Sheet + Drive sang bản **staging**, dán code, kiểm tra `api()` với người dùng có phạm vi công ty hạn chế (cổng HAK) — hành vi “ngoài phạm vi” chỉ chạy được trên cổng thật.
2. Tải `UNC_2_KHOAN.xlsx` (điều kiện `2`), sửa điều kiện Bảng kê thành `3+`, tạo hồ sơ 2 món → xem PDF do Google xuất (phông, ngắt trang, logo có thể khác LibreOffice).
3. Chạy nhắc nợ trên Calendar/MailApp **tài khoản thử** (không gửi cho khách thật).
4. Kiểm tra tỷ giá tự động (Vietcombank) ghi nguồn/giờ đúng.
