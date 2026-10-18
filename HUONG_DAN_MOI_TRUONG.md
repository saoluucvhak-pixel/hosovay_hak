# HƯỚNG DẪN MÔI TRƯỜNG: DEVELOPMENT / STAGING / PRODUCTION
Mục đích: không bao giờ kiểm thử phá hủy trên dữ liệu thật. **Chưa có môi trường staging nào được tạo hoặc kiểm thử cho đợt này** — tài liệu dưới đây là quy trình để người quản trị dựng và chạy.

## 1. Ba môi trường
| | Development | Staging | Production |
|---|---|---|---|
| Mục đích | sửa/thử mã trên máy (giả lập Node) | thử trên Google thật bằng dữ liệu giả/ẩn danh | vận hành thật |
| Mã chạy ở | `kiem_thu/` (giả lập) | dự án Apps Script **riêng** | dự án Apps Script hiện hành |
| Spreadsheet | (giả lập) | bản sao **riêng**, dữ liệu giả | Spreadsheet thật |
| Thư mục Drive | (giả lập) | thư mục thử **riêng** | thư mục thật |
| `MOI_TRUONG` | — | `TEST` (hoặc `PRODUCTION` khi thử phân quyền thật) | `PRODUCTION` (mặc định) |
| `CH_SPREADSHEET_ID` | — | **bắt buộc** = ID Spreadsheet thử | không đặt (dùng ID trong mã) |
| `CH_THU_MUC_GOC_ID` | — | **bắt buộc** = thư mục thử | thư mục thật |
| Đăng nhập | giả lập | tài khoản thử (XEM / NHAP_LIEU / ADMIN) + Cổng thử | Cổng HAK thật |

## 2. Dựng staging (một lần)
1. Trong Google Drive: *Tạo bản sao* Spreadsheet → **xoá/ẩn danh** toàn bộ dữ liệu thật (thay tên, MST, số tài khoản, số tiền) rồi dùng; tạo thư mục Drive thử trống.
2. Tạo dự án Apps Script mới (hoặc bản sao script gắn Spreadsheet thử); dán 34 file mã (bỏ đuôi `.txt`).
3. Script Properties: `MOI_TRUONG=TEST`, `CH_SPREADSHEET_ID=<ID bản sao>`, `CH_THU_MUC_GOC_ID=<thư mục thử>`, `ADMIN_EMAILS=<tài khoản thử>`.
4. Chạy menu **Kiểm tra môi trường & cấu hình**: phải KHÔNG có dòng "Cách ly dữ liệu = LỖI" (nếu có nghĩa là bản thử đang trỏ vào Spreadsheet thật — dừng lại).
5. Thêm các tài khoản thử vào tab người dùng với 3 vai trò; triển khai web app **riêng** (URL khác production).

## 3. Kiểm thử nghiệm thu trên staging (CHƯA thực hiện — người quản trị chạy và ghi kết quả)
| # | Nội dung (theo yêu cầu C2–C6) | Cách làm | Kết quả mong đợi | Ghi kết quả |
|---|---|---|---|---|
| 1 | Tạo/sửa hồ sơ, revision | Tạo → lưu → mở lại → sửa; mở 2 cửa sổ, lưu cả hai | cửa sổ lưu sau nhận thông báo xung đột | ☐ |
| 2 | Chứng từ | Chọn mẫu thật → sinh DOCX/PDF → mở bằng Word | số tiền, bằng chữ, placeholder đúng | ☐ |
| 3 | Giải ngân | Xác nhận giải ngân, bấm lặp lại | lần 2 bị từ chối, không trùng | ☐ |
| 4 | Phân quyền | 3 tài khoản + 1 tài khoản lạ + cửa sổ ẩn danh | đúng bảng quyền; gọi trực tiếp bị chặn | ☐ |
| 5 | Phân trang/lọc | 100 → 1.000 → 5.000 hồ sơ giả (sao chép dòng trên Sheet) | đúng tổng, đúng trang; đo thời gian thật bằng đồng hồ | ☐ |
| 6 | Lỗi mạng | Ngắt mạng khi lưu; làm mới trang | không mất dữ liệu đã xác nhận, không trùng | ☐ |
| 7 | Hiệu năng thật | Ghi P50/P95 (≥ 20 lần mỗi thao tác) vào bảng chỉ tiêu | so với chỉ tiêu 2 s/3 s/1,5 s | ☐ |
Tuyệt đối không chạy script dọn dẹp/xoá hàng loạt trên Production. Không dùng dữ liệu tài chính thật cho thử phá hủy.

## 4. Phát hành lên Production (cần người quản trị cho phép)
1. Sao lưu Spreadsheet (Tệp → Tạo bản sao) và ghi số phiên bản triển khai hiện tại.
2. Dán file mã mới (danh sách trong `BAO_CAO_NANG_CAP_HIEU_NANG_UI.md`), xoá file thừa, **không** đổi Script Properties của production.
3. Chạy **Kiểm tra môi trường & cấu hình** → "PRODUCTION"; triển khai lại web app (phiên bản mới).
4. Thử nhanh: mở danh sách, tìm kiếm, mở hồ sơ, lưu một hồ sơ thử rồi xoá mềm.
## 5. Rollback
Triển khai lại **phiên bản cũ** của web app. Đợt này **không đổi cấu trúc dữ liệu** (không thêm cột/tab); chỉ thêm Script Properties tuỳ chọn (`CH_NGUONG_BAO_CAO_NHAP`, `BAO_CAO_NHAP_CU`). Chỉ mục cache tự hết hạn sau 5 phút nên không cần dọn.
