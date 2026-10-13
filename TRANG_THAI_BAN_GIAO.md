# Trạng thái bàn giao — DOCX Template Engine

Quy ước môi trường kiểm thử:
- **[N]** Node.js chạy đúng mã `*.gs` của repo; **[L]** file DOCX/PDF thật, mở bằng python-docx và chuyển PDF bằng **LibreOffice**.
- **[G]** dịch vụ Google Apps Script (Sheets/Drive/Lock/zip/XmlService) được **giả lập** trong bộ nhớ — chứng minh *logic* chứ không chứng minh Google thật.
- **[B]** giao diện trong Chromium với `google.script.run` giả lập.
- **Chưa chạy trên Google thật và chưa mở bằng Microsoft Word thật** trong bất kỳ hạng mục nào.

Kết quả lần chạy cuối: logic 49/49, engine 12 kịch bản DOCX 0 lỗi, tích hợp 117/117, kiểm tra độc lập 14 chứng từ 0 lỗi, giao diện 20/20.

## 1. Đã hoàn thành và chạy thử thành công (trong môi trường nêu ở cột phải)

| Hạng mục | Bằng chứng | Môi trường |
|---|---|---|
| Thay placeholder bị Word tách thành 2–3 run, giữ định dạng run đầu | `chay_thu_logic.js`, mẫu `DE_NGHI_*` (cố ý tách run) | N, L |
| Placeholder trong header, footer, thân, bảng; mã hoá `& < > " $&`; xuống dòng → `<w:br/>` | idem + PDF | N, L |
| Nhân bản hàng bảng: **1, 2, 5, 20** người thụ hưởng (VND & USD); giữ căn phải ô tiền, độ cao hàng, hàng tiêu đề lặp, ô ghép hàng tổng; bảng tràn 2–3 trang không mất hàng | `kiem_tra_docx.py` đọc lại từ file; ảnh PDF | L |
| Tổng các dòng = tổng hiển thị; tổng bằng chữ khớp; USD 25.000 → "Hai mươi lăm ngàn đô la Mỹ"; không cents/`,00`/`.00` | `kiem_tra_docx.py` | L |
| Điều khoản cố định, header/footer, khổ giấy, lề **không đổi** so với mẫu | `kiem_tra_docx.py` | L |
| Bản DOCX hợp lệ: ZIP nguyên vẹn, XML đúng cú pháp, **python-docx mở được**, **LibreOffice mở và xuất PDF được** | `kiem_tra_docx.py` | L |
| Bảng lồng nhau, hộp văn bản, vMerge: cảnh báo; 0 dòng: cảnh báo; mẫu 1 khoản dùng cho hồ sơ nhiều dòng → báo lỗi chứ không điền bừa | `chay_thu_logic.js` | N |
| Quy tắc tiền: 25.000 hợp lệ; `25.000,50`, `25000.50`, `0,5`, số lẻ, số âm báo lỗi; không biến 25.000,50 thành 25.001/25.000; quy đổi BigInt đối chiếu độc lập; tỷ giá có phần thập phân | `chay_thu_logic.js` | N |
| Kiểm tra trước phát hành: chặn số lẻ, quy đổi lệch, tổng lệch, bằng chữ lệch, thiếu tỷ giá, không có dòng — nêu từng trường | `chay_thu_logic.js` | N |
| Nhập hoá đơn/bảng lương: `7.234.567,5` không còn bị cắt thành 7234; XML `25000000.00` không còn bị hiểu thành 2,5 tỷ; số lẻ không bị làm tròn âm thầm | `chay_thu_logic.js` | N |
| Tải mẫu (hợp lệ/bị từ chối), phiên bản v1→v2, chọn đúng mẫu theo loại tiền/số dòng/ngân hàng, phát hành từ mẫu, **không ghi đè** bản đã phát hành (L1/L2, "Đã thay thế"), file mẫu gốc không bị sửa | `chay_tich_hop.js` | G |
| Link ghi **đúng cột** (DOCX/PDF/XLSX tách riêng); nhánh mặc định không còn ghi XLSX vào cột PDF; sửa link cũ | `chay_tich_hop.js` | G |
| Hồ sơ cũ có số lẻ: xem nguyên trạng; phát hành bị chặn; sửa thông tin khác **giữ nguyên tuyệt đối** số cũ; đổi số dòng bị từ chối; nhập lại số nguyên → thay + ghi vết giá trị cũ; báo cáo đánh dấu; rà soát không đổi dữ liệu | `chay_tich_hop.js` | G |
| Lỗi ghi Sheet giữa chừng → phục hồi nguyên trạng (hồ sơ cha + 4 dòng chi tiết); khoá bận → từ chối rõ ràng; hồ sơ khoá (Đã giải ngân/Đã hủy) | `chay_tich_hop.js` | G |
| Phân quyền: không phải quản trị bị chặn tải mẫu/xem mẫu/xem cấu hình | `chay_tich_hop.js` | G |
| Giao diện: tab Mẫu Word (tải, danh sách, escape HTML, chạy thử, lịch sử), banner hồ sơ số lẻ, ô tiền chỉ đọc, "Sửa số tiền", chặn `15.000,50` ở trình duyệt, gửi số nguyên | `chay_giao_dien.js` + ảnh | B |
| `CauHinh_()` (trước đây **chưa định nghĩa**, làm `Setting.gs`/`Backup.gs` lỗi) | `chay_tich_hop.js` (gọi qua `layThuMucGoc_`) | G |

## 2. Đã viết code nhưng chưa tích hợp

| Hạng mục | Ghi chú |
|---|---|
| `layCauHinhHeThong`, `luuCauHinhHeThong`, `kiemTraCauHinh` (Setting.gs) | Có sẵn từ trước, nay có kiểm tra quyền quản trị, nhưng **giao diện chưa có tab "Cài đặt"** gọi chúng |
| Mẫu Google Docs/Sheets kiểu cũ (5 ID `templateXxxId` trong cấu hình) | Chỉ giữ ID đã lưu; luồng mới dùng mẫu DOCX |

## 3. Đã tích hợp nhưng chưa kiểm thử thực tế (Google / Word thật)

| Hạng mục | Rủi ro cần kiểm khi triển khai |
|---|---|
| `Utilities.unzip` / `Utilities.zip` ghép lại DOCX trên Google | Tên entry có thư mục, thứ tự `[Content_Types].xml`; cần mở thử file bằng **Microsoft Word** |
| **Microsoft Word mở file** | Chưa mở bằng Word; chỉ có python-docx + LibreOffice. Cần kiểm "Word có báo file lỗi/phục hồi không" |
| `XmlService.parse` kiểm tra XML; `LockService`; `Session.getActiveUser()` | Hành vi thật của quyền/email ngoài domain |
| `Drive.Files.insert(..., {convert:true})` → `getAs(PDF)` → xoá bản trung gian | PDF qua Google có thể lệch font/khoảng cách so với Word; chưa đo trên Google |
| Lưu file vào thư mục Drive của hồ sơ, `DriveApp` | Quyền thư mục, hạn mức |
| Tab "Mẫu Word": `FileReader` → `google.script.run.taiMauDocx` (file lớn, giới hạn payload) | Mới chạy với stub, file mẫu thử ~38 KB |
| Nhánh mặc định (biểu mẫu dựng bằng code: `DocumentApp`, `SpreadsheetApp.create`, `UrlFetchApp`) | Chỉ kiểm phần nối + ghi link (đầu ra được giả lập) |
| Menu Sheet (Cấu hình quản trị, Rà soát tiền lẻ, Sửa link cũ) | Chưa bấm trên Google Sheet |
| `ghiNhatKy_` + khoá khi nhập hoá đơn/bảng lương | Chưa chạy thật OCR/XML thật |

## 4. Chưa hoàn thành

| Hạng mục | Lý do / việc còn lại |
|---|---|
| **Kiểm thử end-to-end trên Google Apps Script thật + Microsoft Word thật** | Môi trường làm việc không có Google/Word. Cần người triển khai chạy theo mục 5 `HUONG_DAN_MAU_DOCX.md` |
| Phân quyền thật sự theo người dùng | `ADMIN_EMAILS` + kiểm tra phía máy chủ đã có, nhưng Web App vẫn `ANYONE_ANONYMOUS` + `USER_DEPLOYING`; chưa đổi để không ngưng hệ thống. Người triển khai cần đặt access = domain |
| Phân quyền cho các thao tác "bình thường" (lưu/xoá hồ sơ) | Chưa chặn theo vai trò, chỉ chặn mẫu/cấu hình/xuất toàn bộ/rà soát/xem thông tin Spreadsheet |
| Hàng mẫu có ô ghép **dọc**, văn bản trong **text box**, điều kiện/vòng lặp ngoài hàng bảng | Engine cảnh báo, chưa xử lý; cần bộ xử lý DOCX chuyên dụng nếu mẫu thật dùng |
| Khoá chống trùng mã khi tải **hoá đơn** (`sinhMaTuDong_` + `appendRow`) | Mới khoá phần ghi bảng lương; hoá đơn còn khả năng trùng mã nếu 2 người tải cùng lúc |
| Đọc hoá đơn bằng OCR thật / XML thật | Chỉ kiểm hàm chuyển số, chưa chạy OCR |

## 5. Lỗi đã phát hiện và sửa trong lúc kiểm thử (ghi lại để minh bạch)

1. `CauHinh_()` không tồn tại → `Setting.gs`, `Backup.gs` sẽ lỗi (đã bổ sung).
2. Link `.xlsx` bị ghi vào `Link_ChungTuThanhToan_PDF` (đã tách 3 cột + hàm sửa dữ liệu cũ).
3. Ngày dạng `yyyy-MM-dd` hiển thị nguyên chuỗi trong văn bản (đã chuyển `dd/MM/yyyy`) — từ vòng trước.
4. Phân tích mẫu khi tải lên coi nhầm mọi placeholder hợp lệ là "gõ sai"; coi `{{CT.*}}` ngoài bảng là "có hàng mẫu"; HDMB bị đòi hàng mẫu (đã sửa — bộ kiểm thử tích hợp bắt được).
5. Thẻ `<w:t>` chứa placeholder có thể thiếu `xml:space="preserve"` (Word sẽ cắt khoảng trắng đầu/cuối của giá trị) — đã sửa.
6. Khi sửa file tôi từng làm mất 4 hàm cuối `DocGenerator.gs` và làm rỗng `Setting.gs`; bộ kiểm thử phát hiện, đã khôi phục từ git.
7. Mở hồ sơ số lẻ: tổng bị tính lại bằng số đã làm tròn do cờ bật muộn (kiểm thử giao diện bắt được) — đã sửa.
8. Tổng gửi lên server giờ được tính lại ngay trước khi gửi (không phụ thuộc sự kiện gõ phím).
9. Nhập hoá đơn XML: `25000000.00` bị hiểu là 2,5 tỷ; bảng lương `7.234.567,5` bị cắt — đã sửa.
