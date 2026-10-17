# Kết quả kiểm tra tích hợp HAK — 17/10/2026

Nền mã kiểm tra: `main` tại `1a47ffd5b1a8334b7740ba3f9c9f678604b68c12` cộng các thay đổi trong bản tích hợp này. Môi trường Windows, Node 24.21.0; Apps Script/Sheets/Drive giả lập. CI Node 20/22 đã được cấu hình nhưng chưa có kết quả chạy trên GitHub tại thời điểm lập báo cáo.

| Bộ kiểm tra | Kết quả tại máy phát triển |
|---|---|
| Logic tiền và engine XML | 49/49 |
| Hồi quy HAK mới: ngày sai, khóa lạ, lọc không sửa nguồn, tổng riêng tiền tệ, truyền tùy chọn xuất và hiển thị | 5/5 nhóm |
| Đóng gói phản hồi | 34 hàm đã thử, 1 bỏ qua, 0 lỗi |
| Hồi quy chức năng | 22/22 |
| Vòng đời hồ sơ | 54/54 |
| Đồng bộ/cache | 27/27 |
| Đăng nhập/quyền | 51/51 |
| Quy trình nghiệp vụ | 30 tình huống chạy đạt; TC30 chạy lồng tài liệu/PDF bỏ qua có chủ đích |
| Bề mặt API và gọi trực tiếp | 8/8 nhóm |
| Hiệu năng giả lập | 28 phép đo, 4 quy mô, 0 lỗi ngưỡng |
| Phân trang, quyền, tổng, cache | 27/27 |
| Giao diện Chrome + Playwright, backend giả lập | 124/124 |
| Kiểm tra tĩnh gồm Apps Script và script trong HTML | Không lỗi cú pháp, không vòng import; 4 cảnh báo file dài |

Ảnh trước/sau được tạo tại 1366×768, 1920×1080, 390×844. Kiểm tra thêm reduced motion; xem trực quan màn hình desktop và điện thoại. Lỗi nhãn điều hướng bị ép chữ trên điện thoại đã sửa bằng kích thước cố định và cuộn ngang.

Log và ảnh nằm trong `kiem_thu/ket_qua_hak/`; báo cáo tĩnh trong `reports/` (đều không commit để tránh đưa dữ liệu chạy kiểm thử vào mã nguồn). Chạy lại bằng các lệnh trong `HAK_INTEGRATION.md`.

## Chưa được chứng minh

- Lần chạy đầy đủ có TC30 đã thất bại ở 3 bộ tích hợp/xuất tài liệu/trình tạo mẫu. Môi trường thiếu LibreOffice nên không tạo được PDF thật; một số kiểm thử sau đó truy cập link PDF rỗng và dừng. Không coi các bài đó là đã đạt. `npm test` tách kiểm tra logic khỏi yêu cầu môi trường PDF, và ghi nhận TC30 bị bỏ qua trong `summary.json`.
- Không triển khai lên Google; chưa kiểm tra dịch vụ Google thật, SSO thật, PDF Google hay Microsoft Word/Excel thật.
- Các cảnh báo file dài còn tồn tại ở Index.html, JavaScript.html, DataService.gs và DocGenerator.gs; cần kế hoạch tách module riêng. Số cảnh báo tăng so với analyzer gốc vì nay quét thêm `.gs`, không phải tự động coi là lỗi mới.
- Đồ thị import chỉ là phân tích regex; không bao quát lời gọi hàm toàn cục Apps Script. Các kết quả giả lập không thay thế nghiệm thu trên bản sao dữ liệu thực tế.
