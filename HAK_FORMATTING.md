# Định dạng số, ngày và sửa cảnh báo chẩn đoán

Vào Cài đặt → Cấu hình hệ thống → Định dạng số và ngày. Chọn dấu hàng nghìn (chấm/phẩy/khoảng trắng/nháy/không), dấu thập phân (chấm/phẩy), 0–6 số lẻ hiển thị tối thiểu và một trong 6 kiểu ngày. Xem trước rồi Lưu định dạng. Chỉ quản trị viên được lưu, cấu hình dùng chung.

Không cắt phần lẻ thực tế khi chọn ít số lẻ hơn. VND nhập nguyên, USD tối đa 2 số lẻ; thêm số 0 để hiển thị không đổi giá trị. Ngày trong ô lịch vẫn ISO; các bảng và trường ngày tài liệu áp dụng cách hiển thị đã chọn, không đổi ngày đã lưu. Số tiền bằng chữ UNC vẫn có dấu.

Excel: ô số vẫn là số để tính toán, cách hiển thị ký tự trong ô số phụ thuộc vùng Excel/Google Sheets. Các trường văn bản và Word/PDF từ Word theo đúng ký tự đã chọn. Bản chứng từ đã phát hành không tự đổi, phải Tạo lại để dùng định dạng mới.

Đã bỏ cảnh báo sai CHƯA dán DataService.gs do kiểm tra hàm retry đã loại bỏ. Chẩn đoán báo theo kết quả đọc thực tế, nhận diện cả trường hợp hai nguồn cùng lỗi, không kết luận thiếu code từ số lượng khác nhau.

## Cài vào Apps Script
Thêm file mới DinhDang.gs. Thay toàn bộ nội dung các file .gs/.html có trong Code_Copy bằng file .txt tương ứng. Giữ nguyên ID Sheet, cấu hình Drive và mẫu hiện có. Lưu và cập nhật triển khai phiên bản mới. Cập nhật GitHub không tự cập nhật bản Apps Script.

## Kiểm chứng
15/15 nhóm portable đạt, gồm 216 kiểm tra định dạng/parity trình duyệt–máy chủ, số tiền lưu và ngày chuẩn không đổi. Giao diện Chromium mô phỏng backend: 183/183 đạt, desktop và mobile; thêm 5 luồng cha–con UI đạt. Kiểm tra cú pháp không có lỗi. Các dịch vụ Google trong lượt này là giả lập; chưa triển khai hoặc cấp quyền Google mới.
