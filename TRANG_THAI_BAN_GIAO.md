# Trạng thái bàn giao — Template Engine (DOCX + XLSX)

Quy ước môi trường kiểm thử:
- **[N]** Node.js chạy đúng mã `*.gs` của repo; **[L]** file DOCX/XLSX/PDF thật, mở bằng python-docx/openpyxl/lxml và chuyển PDF bằng **LibreOffice**.
- **[G]** dịch vụ Google Apps Script (Sheets/Drive/Lock/zip/XmlService) được **giả lập** trong bộ nhớ — chứng minh *logic*, không chứng minh Google thật.
- **[B]** giao diện trong Chromium + Playwright với `google.script.run` giả lập.
- **Chưa chạy trên Google thật và chưa mở bằng Microsoft Word/Excel thật** trong bất kỳ hạng mục nào.

Kết quả lần chạy cuối (`kiem_thu/chay_tat_ca.sh`, 9 giai đoạn, tất cả đạt): logic 49/49 · engine mẫu thử 0 lỗi · engine **7 mẫu thật** 0 lỗi · tích hợp 118/118 · tích hợp mẫu thật 62/62 · trình tạo mẫu 28/28 · kiểm tra độc lập 0 lỗi · hồi quy 22/22 · giao diện 48/48 (11 giai đoạn).

## 1. Đã hoàn thành và chạy thử thành công

| Hạng mục | Môi trường |
|---|---|
| Engine Word: placeholder bị tách run, header/footer/bảng, nhân bản hàng 1/2/5/10/20 người, tổng, nhiều trang, giữ logo/hộp kiểm/ô ghép/font | N, L |
| Engine Excel: ô số giữ định dạng, nhân bản hàng + dời công thức `SUM`, ô ghép, vùng in, tính lại khi mở, bỏ calcChain | N, L |
| 4 biểu mẫu công ty gửi (HĐTD USD, HĐMB, UNC, Bảng kê) đã chuẩn bị thành 5 mẫu trong `mau_that/`, điền đúng, kiểm tra độc lập, xuất PDF | N, L |
| Từ điển placeholder (nguồn/kiểu/bắt buộc/giá trị trống/bí danh), chặn phát hành khi thiếu trường bắt buộc, nêu khoá + nguồn | N, G |
| **Trình tạo mẫu từ file Word thô** (`TemplateBuilder.gs` + giao diện): phân tích, gợi ý tự động (dữ liệu công ty/hợp đồng, nhãn, bảng thụ hưởng), bôi chọn/chèn, xoá hàng ví dụ thừa, căn lề theo kiểu dữ liệu, tạo mẫu → đăng ký → phát hành lại cho hồ sơ khác; các tình huống lỗi bị từ chối | N, G, B, L |
| 2 mẫu **HĐTD VND** (1 khoản / nhiều khoản) từ 2 file Word công ty gửi, tạo bằng trình tạo; điền 1/2/5/20 người, bảng nhiều trang, bằng chữ VND, PDF | N, L |
| Quản lý mẫu: tải lên, phiên bản bất biến + hash, ngừng, khôi phục, mặc định, chọn mẫu theo loại/tiền/số người/ngân hàng, kiểm tra lại, xem trước, lịch sử chỉnh sửa, quyền quản trị | G |
| Phát hành: tích hợp `taoTronBoTheoMau`, đề nghị, chứng từ thanh toán, HĐ mua bán ngoại tệ; 1 người→UNC, nhiều→Bảng kê, USD→+HĐMB, VND→không; không ghi đè (`_L{n}`), chống tạo trùng 15 giây, lịch sử kể cả lỗi, link đúng cột, fallback biểu mẫu cũ | G |
| Quy tắc tiền (số nguyên, BigInt, tỷ giá thập phân, bằng chữ), dữ liệu lịch sử số lẻ (xem được, chặn phát hành, sửa phần khác giữ nguyên, ghi vết) | N, G |
| Lưu nhiều dòng an toàn (phục hồi khi lỗi), khoá đồng thời, `CauHinh_()` | G |
| Giao diện: Cài đặt → Quản lý mẫu văn bản, Danh sách chứng từ hồ sơ (xem trước, tạo/tạo lại, DOCX/PDF/XLSX, Google, lịch sử, thư mục, chọn nhiều), chặn số lẻ | B |
| Hồi quy: hồ sơ, hợp đồng, khách hàng, hoá đơn, báo cáo, khoá, xoá | G |

## 2. Đã viết code nhưng chưa tích hợp / chưa dùng mặc định

| Hạng mục | Ghi chú |
|---|---|
| Chế độ B (bộ xử lý DOCX ngoài) | Có adapter + kiểm thử bằng máy chủ giả; **tắt mặc định**, không có dịch vụ thật nào được triển khai |
| Chế độ A (điền bên trong Google Docs) | **Không triển khai** (xem hướng dẫn mục 1) |

## 3. Đã tích hợp nhưng chưa kiểm thử thực tế (Google / Word / Excel thật)

| Hạng mục | Rủi ro cần kiểm khi triển khai |
|---|---|
| `Utilities.zip/unzip`, `XmlService`, `LockService`, `Session.getActiveUser()` | Hành vi thật; mở file bằng **Microsoft Word/Excel** xem có báo lỗi/phục hồi |
| Drive API chuyển Google Docs/Sheets → PDF và mở Google | PDF có thể lệch font/khoảng cách so với Word; **chưa đo trên Google** |
| Tải mẫu lớn từ trình duyệt (`FileReader` → `google.script.run`) | Giới hạn payload; mới thử file ~25–40 KB |
| Biểu mẫu mặc định dựng bằng code (`DocumentApp`, `SpreadsheetApp.create`, xuất Excel qua `UrlFetchApp`) | Chỉ kiểm phần nối + ghi link |
| Menu Sheet (cấu hình quản trị, rà soát tiền lẻ, sửa link cũ) | Chưa bấm trên Google Sheet |
| OCR/XML hoá đơn thật | Chỉ kiểm hàm chuyển số |

## 4. Chưa hoàn thành

| Hạng mục | Lý do / việc còn lại |
|---|---|
| Kiểm thử end-to-end trên Google Apps Script thật + Word/Excel thật | Môi trường làm việc không có; làm theo mục 6 `HUONG_DAN_MAU_VAN_BAN.md` |
| Trình tạo mẫu cho **Excel** | Chỉ nhận .docx; Excel gõ `{{...}}` trực tiếp. Chưa thử trên trình duyệt thật (chỉ Chromium + google.script.run giả lập) |
| Mẫu của ngân hàng/loại tiền khác | Thêm bằng trình tạo (không sửa code); chưa có file nào khác để thử |
| Phân quyền theo vai trò cho thao tác thường (lưu/xoá hồ sơ) | Mới chặn mẫu/cấu hình/xuất toàn bộ/rà soát |
| Web App vẫn `ANYONE_ANONYMOUS` + `USER_DEPLOYING` | Không đổi để khỏi ngưng hệ thống; người triển khai nên đặt access = domain |
| Thư mục `TaiLieuDinhKem` | Giữ `HoaDonGTGT`/`BangLuong` hiện có; chưa đổi tên |
| Text box, ô ghép dọc trong hàng mẫu, vòng lặp ngoài hàng bảng | Engine cảnh báo, chưa xử lý |
| Trường chưa có dữ liệu: số "…/BIDV-HAK" đầu HĐMB, đoạn đăng ký kinh doanh cố định | Để nguyên trong mẫu |
| Khoá chống trùng mã hoá đơn (`sinhMaTuDong_`) | Còn khả năng trùng nếu 2 người tải cùng lúc |
| Hiệu năng | Mới có cache mẫu; chưa đo trên Google |

## 5. Số lẻ trong dữ liệu lịch sử

Hồ sơ cũ còn số tiền lẻ: **xem được nguyên trạng**, có banner; sửa thông tin không phải tiền **không ghi lại** các số tiền; sửa tiền yêu cầu nhập số nguyên (ghi vết giá trị cũ ở `NhatKyHeThong`); **phát hành chứng từ bị chặn** và nêu mã hồ sơ/dòng/trường/giá trị; menu "Rà soát tiền lẻ" chỉ liệt kê, không đổi dữ liệu.

## 6. Báo cáo lỗi trước/sau

| Lỗi | Trước | Sau |
|---|---|---|
| Link PDF/DOCX/XLSX | XLSX ghi vào `Link_*_PDF` | 3 cột riêng + menu sửa link cũ |
| `CauHinh_()` | Không tồn tại → `Setting.gs`/`Backup.gs` lỗi | Đã định nghĩa |
| Tiền lẻ | Làm tròn âm thầm / hiểu sai `25000000.00` | Số nguyên bắt buộc, thông báo rõ |
| Tạo trùng chứng từ | Bấm đúp sinh nhiều bản | Khoá + chống trùng 15 giây |
| Ghi đè chứng từ | Dễ ghi đè | Mỗi lần một file `_L{n}`, bản cũ "Đã thay thế" |
| Lưu nhiều dòng | Lỗi giữa chừng để dữ liệu nửa vời | Phục hồi nguyên trạng |
| Quyền | Mọi người đổi cấu hình | Quản trị viên phía máy chủ |
| Chứng từ | Dựng cứng trong code | Từ mẫu Word/Excel đã đăng ký, fallback cũ |

## 7. Lỗi phát hiện và sửa trong lúc kiểm thử (minh bạch)
 và sửa trong lúc kiểm thử (ghi lại để minh bạch)

1. `CauHinh_()` không tồn tại → `Setting.gs`, `Backup.gs` sẽ lỗi (đã bổ sung).
2. Link `.xlsx` bị ghi vào `Link_ChungTuThanhToan_PDF` (đã tách 3 cột + hàm sửa dữ liệu cũ).
3. Ngày dạng `yyyy-MM-dd` hiển thị nguyên chuỗi trong văn bản (đã chuyển `dd/MM/yyyy`) — từ vòng trước.
4. Phân tích mẫu khi tải lên coi nhầm mọi placeholder hợp lệ là "gõ sai"; coi `{{CT.*}}` ngoài bảng là "có hàng mẫu"; HDMB bị đòi hàng mẫu (đã sửa — bộ kiểm thử tích hợp bắt được).
5. Thẻ `<w:t>` chứa placeholder có thể thiếu `xml:space="preserve"` (Word sẽ cắt khoảng trắng đầu/cuối của giá trị) — đã sửa.
6. Khi sửa file tôi từng làm mất 4 hàm cuối `DocGenerator.gs` và làm rỗng `Setting.gs`; bộ kiểm thử phát hiện, đã khôi phục từ git.
7. Mở hồ sơ số lẻ: tổng bị tính lại bằng số đã làm tròn do cờ bật muộn (kiểm thử giao diện bắt được) — đã sửa.
8. Tổng gửi lên server giờ được tính lại ngay trước khi gửi (không phụ thuộc sự kiện gõ phím).
9. Nhập hoá đơn XML: `25000000.00` bị hiểu là 2,5 tỷ; bảng lương `7.234.567,5` bị cắt — đã sửa.
