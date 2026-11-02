# Dùng cùng bộ mã cho công ty khác (ví dụ Đại Hiệp)

Mã nguồn **không còn ID riêng của công ty nào**. Mọi thông số nằm ở **Script Properties**
(Apps Script > Cài đặt dự án > Thuộc tính tập lệnh). Copy nguyên bộ mã sang công ty mới, rồi điền các khóa sau:

| Khóa | Ý nghĩa | Bắt buộc |
|---|---|---|
| `CH_THU_MUC_GOC_ID` | ID thư mục Drive gốc lưu hồ sơ, báo cáo, sao lưu | Có |
| `CH_SPREADSHEET_ID` | ID Google Sheet dữ liệu. Bỏ trống = dùng Sheet đang gắn script | Không (nếu script tạo từ Sheet) |
| `CH_SS_MUA_HANG_ID` | ID Sheet "Sổ chi tiết mua hàng" (gợi ý nhà cung cấp) | Không — bỏ trống thì tắt tính năng |
| `CH_SS_BANG_LUONG_ID` | ID Sheet bảng lương | Không |
| `CH_TEN_UNG_DUNG` | Tên hiển thị trong thư nhắc nợ (mặc định "Hồ sơ vay") | Không |

## Các bước cho công ty mới
1. Tạo Google Sheet mới, mở **Tiện ích mở rộng > Apps Script**, dán toàn bộ mã.
2. Tạo một thư mục Drive, copy ID (phần cuối đường link) điền vào `CH_THU_MUC_GOC_ID`.
3. Chạy `initializeSpreadsheet` (menu Sheet "Khởi tạo / kiểm tra cấu trúc Sheet") để dựng các tab.
4. Triển khai Ứng dụng web, thêm công ty và người dùng, tải mẫu Word/Excel ở tab "Mẫu Word" (thư mục `mau_that/`).

## Với HAK
Trước khi dán bản mã này vào dự án HAK, đặt trong Script Properties của HAK:
`CH_THU_MUC_GOC_ID` = `1OmF33Lb03Iu2Tzk0-08nBYFBY9u_OM3t`,
`CH_SS_MUA_HANG_ID` = `1KdbvfpXI3EBaFlq4bfv9ZSala-D3Pe-6tZZYQArt-vU`
(Sheet dữ liệu HAK là Sheet đang gắn script nên không cần `CH_SPREADSHEET_ID`; đặt thêm `CH_TEN_UNG_DUNG` = `Hồ sơ vay HAK` nếu muốn giữ tên cũ trong thư nhắc nợ).

Kiểm thử tự động chạy trên môi trường giả lập Apps Script/Sheets, chưa chạy trên Google thật.
