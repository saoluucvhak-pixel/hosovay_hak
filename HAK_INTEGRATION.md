# Tích hợp các repo HAK — 17/10/2026

## Thay đổi

- **HAK_SMART_FILTER:** lõi được giữ nguyên bên trong wrapper riêng ở `HAKSmartFilter.gs`; adapter `HAKFilterAdapter.gs` lọc chỉ mục đã giới hạn quyền, trước khi sắp xếp/phân trang. Hỗ trợ tìm không dấu, trạng thái nhiều giá trị, tiền tệ, công ty, hợp đồng, người hưởng, thiếu ngày và khoảng ngày. Ngày không tồn tại, khoảng ngày đảo và khóa lọc lạ bị từ chối. Không thay đổi dữ liệu nguồn.
- **HAK_ACCOUNTING_REPORT_STANDARD:** áp dụng khung kỹ thuật dự thảo về phạm vi lọc và tổng nguyên tệ. Excel/PDF nhận thêm tùy chọn ngày thực tế/chỉ thiếu ngày như màn hình. Tổng VND và USD tách riêng ở màn hình, Excel và bản in; quy đổi giữ nguyên công thức hiện có. Không tuyên bố đây là chuẩn pháp lý đã phê duyệt.
- **HAK-Enterprise-Design-System:** ánh xạ token vào giao diện neutral hiện có, bổ sung focus bàn phím, reduced motion, giới hạn ô nhập trong modal và điều hướng cuộn ngang trên điện thoại. Không nhập giao diện mẫu làm logic nghiệp vụ.
- **HAK_CODE_QUALITY_TEST:** giữ analyzer gốc trong `tools/vendor`; adapter `tools/check.cjs` bổ sung `.gs`, kiểm tra cú pháp và script trong HTML. Có JSON/dashboard và workflow CI Node 20/22. File dài là cảnh báo; lỗi cú pháp, debugger và vòng phụ thuộc chặn kiểm tra. Regex của analyzer có thể báo nhầm; các chuỗi tên rule trong chính adapter được ghi riêng ở `suppressions`. Đồ thị import không mô hình hóa phụ thuộc toàn cục của Apps Script.
- **HAK_AI_SKILLS:** áp dụng `hak-code-auditor`, `hak-smart-filter`, `hak-ui-designer`, `hak-data-integrity`; không cài toàn bộ skill vào môi trường người dùng.
- Sửa thông báo lỗi khởi tạo còn lưu trên màn hình sau khi tải lại thành công.
- Giả lập zip dùng Python chuẩn trên Windows; kiểm thử giao diện nhận đường dẫn trình duyệt qua biến môi trường.

Commit nguồn của từng repo được cố định trong `HAK_SOURCES.json`. Các bản sao nguồn chỉ dùng khi phát triển; ứng dụng không tải mã động từ GitHub.

## Chạy kiểm tra

```sh
npm run check
npm test
```

Node >=18; Windows cần Python 3 (`HAK_PYTHON` có thể chỉ định đường dẫn). Không cần cài dependency cho hai lệnh này. `npm test` chạy 11 bộ logic/Apps Script giả lập; TC30 chạy lồng các bộ xuất tài liệu được bỏ qua có ghi nhận; bộ đóng gói còn một hàm không hỗ trợ giả lập như kết quả hiện có.

Giao diện cần Playwright và Chromium/Chrome, có thể dùng `HAK_BROWSER_PATH`:

```sh
npm run test:ui
```

Kiểm tra toàn bộ tài liệu/PDF thật: dùng `kiem_thu/chay_tat_ca.sh` trong môi trường có zip, unzip, LibreOffice, pdftotext, Python và các thư viện được liệt kê đầu script. Không coi PDF giả lập là PDF thật đã kiểm chứng.

## Triển khai và giới hạn

Đưa các file `.gs` và `.html` đã thay đổi vào dự án Apps Script, bao gồm **HAKSmartFilter.gs, HAKFilterAdapter.gs, HAKReport.gs**. Công cụ trong `tools/`, npm và workflow chỉ dùng phát triển, không đưa vào Apps Script.

Chạy thử trên bản sao Sheets/Drive với tài khoản có quyền: so sánh báo cáo màn hình/Excel/PDF theo cả hai loại ngày và tùy chọn thiếu ngày; xác minh tổng riêng VND/USD; kiểm tra đăng nhập, lưu và phát hành chứng từ. Sau đó mới cập nhật phiên bản Web App theo quy trình triển khai hiện hành. Rollback bằng phiên bản Apps Script trước đó.

Chưa triển khai lên Google thật, chưa xác minh PDF xuất qua Google hoặc Microsoft Word/Excel thật. Không sửa dữ liệu sản xuất, quyền triển khai hay cấu hình đăng nhập. Tài liệu trạng thái cũ trong repo mô tả các lần kiểm thử trước, không phải bằng chứng cho lần tích hợp này.
