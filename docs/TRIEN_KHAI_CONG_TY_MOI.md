# Triển khai ứng dụng cho một công ty mới (dữ liệu tách riêng)

Áp dụng cho **CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ ĐẠI HIỆP** và các công ty khác. Mỗi công ty có Google Sheet, thư mục Drive và dự án Apps Script **riêng**; không dùng chung dữ liệu với HAK.

## 1. Tạo gói mã
```
node tools/tao_goi_trien_khai.cjs "Đại Hiệp" "CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ ĐẠI HIỆP" [thư_mục_đích]
```
Công cụ copy toàn bộ `.gs`/`.html`/`appsscript.json`, bỏ ID Sheet/Drive của HAK trong `Code.gs`, đổi tên thương hiệu thư nhắc nợ, thêm `KHOITAOCONGTY.gs`, rồi dừng với lỗi nếu gói còn sót ID HAK. Mã nguồn HAK không bị sửa.

## 2. Thiết lập (làm bằng tài khoản Google của Đại Hiệp)
1. Tạo Google Sheet mới (ví dụ "Hồ sơ vay Đại Hiệp"). Vào **Tiện ích mở rộng > Apps Script**.
2. Dán toàn bộ tệp trong gói (giữ đúng tên; bật hiển thị `appsscript.json` trong Cài đặt dự án rồi dán nội dung).
3. Chạy `khoiTaoCongTyMoi` một lần (cấp quyền khi được hỏi). Hàm này gắn Sheet, tạo thư mục Drive gốc, dựng các tab. Chạy lại không tạo trùng, không xoá dữ liệu.
4. **Triển khai > Triển khai mới > Ứng dụng web** (Thực thi: tôi; Truy cập: theo chính sách công ty). Người triển khai là quản trị viên.
5. Trong ứng dụng: thêm công ty ĐẠI HIỆP ở màn Công ty, thêm ngân hàng/hợp đồng, phân quyền người dùng, tải mẫu thật ở tab **Mẫu Word** (Giấy nhận nợ, đề nghị giải ngân, UNC, bảng kê, hợp đồng).
6. Bật sao lưu và nhắc nợ theo menu của ứng dụng.

## 3. Lưu ý
- Mẫu của Đại Hiệp giống HAK nên gói kèm thư mục `mau_that/` (bộ mẫu HDTD, HDMB, bảng kê, UNC). Mẫu lưu trong Sheet/Drive chứ không nằm trong mã, nên Sheet mới trống: hãy tải từng tệp trong `mau_that/` lên tab **Mẫu Word**. Riêng `UNC_1_KHOAN.xlsx` có chứa chữ "Hoàng Anh Khôi" cần sửa thành tên Đại Hiệp trước khi tải lên.
- `UNCBIDVMAU.gs` (mẫu UNC BIDV) vẫn nằm trong gói; không dùng thì bỏ qua nút cài mẫu UNC.
- Kiểm thử tự động chỉ chạy trên môi trường giả lập Apps Script/Sheets, chưa chạy trên Google thật; hãy thử một hồ sơ mẫu trước khi dùng thật.
