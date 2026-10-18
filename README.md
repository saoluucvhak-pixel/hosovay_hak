# hosovay_hak
Hồ sơ vay ngân hàng (Google Apps Script + Sheets + Drive): lập hồ sơ giải ngân VND/USD, phát hành chứng từ từ **mẫu Word (.docx) và Excel (.xlsx)** đã đăng ký trong *Cài đặt → Quản lý mẫu văn bản*.

- Kiến trúc, soạn mẫu, triển khai, rollback: [HUONG_DAN_MAU_VAN_BAN.md](HUONG_DAN_MAU_VAN_BAN.md)
- Trạng thái bàn giao (đã chứng minh gì, ở môi trường nào, còn thiếu gì): [TRANG_THAI_BAN_GIAO.md](TRANG_THAI_BAN_GIAO.md)
- Thêm mẫu mới không cần sửa code: *Cài đặt → Quản lý mẫu văn bản → Tạo mẫu từ file Word có sẵn* (hướng dẫn mục 2b)
- Mẫu: `mau_that/` (từ 4 biểu mẫu công ty) · `mau_thu/` (mẫu sinh tự động để kiểm thử) · Kiểm thử: `kiem_thu/chay_tat_ca.sh`
- Quy tắc tiền: VND/USD là số nguyên, không cents; chỉ tỷ giá được có phần thập phân.

- Tích hợp bộ công cụ HAK, kiểm thử và triển khai: [HAK_INTEGRATION.md](HAK_INTEGRATION.md). Chạy `npm run check` và `npm test`; kết quả môi trường giả lập được phân biệt với kiểm thử Google/PDF thật.
