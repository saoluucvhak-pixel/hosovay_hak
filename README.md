# hosovay_hak
Hồ sơ vay ngân hàng (Google Apps Script + Sheets + Drive): lập hồ sơ giải ngân VND/USD, phát hành chứng từ từ **mẫu Word (.docx) và Excel (.xlsx)** đã đăng ký trong *Cài đặt → Quản lý mẫu văn bản*.

- Kiến trúc, soạn mẫu, triển khai, rollback: [HUONG_DAN_MAU_VAN_BAN.md](HUONG_DAN_MAU_VAN_BAN.md)
- Trạng thái bàn giao (đã chứng minh gì, ở môi trường nào, còn thiếu gì): [TRANG_THAI_BAN_GIAO.md](TRANG_THAI_BAN_GIAO.md)
- Thêm mẫu mới không cần sửa code: *Cài đặt → Quản lý mẫu văn bản → Tạo mẫu từ file Word có sẵn* (hướng dẫn mục 2b)
- Mẫu: `mau_that/` (từ 4 biểu mẫu công ty) · `mau_thu/` (mẫu sinh tự động để kiểm thử) · Kiểm thử: `kiem_thu/chay_tat_ca.sh`
- Quy tắc tiền: VND/USD là số nguyên, không cents; chỉ tỷ giá được có phần thập phân.

## Chạy kiểm thử từ bản tải mới

Yêu cầu Node.js >=18. Cài phụ thuộc đã khóa phiên bản bằng `npm ci`.

- `npm run check`: kiểm tra cú pháp và chất lượng mã.
- `npm test`: bộ hồi quy portable; Google được giả lập, TC30 đệ quy được bỏ qua có ghi nhận.
- `npx playwright install chromium`, rồi `npm run test:ui`: kiểm thử giao diện.
- `npm run test:full`: toàn bộ hồi quy, giao diện và chứng từ. Cần Python + python-docx/openpyxl/lxml, zip/unzip, LibreOffice và pdftotext trên PATH; CI Ubuntu cài đầy đủ trong `.github/workflows/hak-full-validation.yml`.

Windows có thể dùng `npm.cmd` nếu PowerShell chặn npm.ps1; đặt `HAK_PYTHON` hoặc `HAK_BROWSER_PATH` khi cần chọn Python/trình duyệt. Kết quả lưu dưới `kiem_thu/ket_qua_hak/` và `kiem_thu/ket_qua_full/`. Các bài này không triển khai hoặc kiểm thử trên Google thật.
