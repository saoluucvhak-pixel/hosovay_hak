# Rà soát giao diện, định dạng và mẫu biểu — 18/10/2026

## Nguồn dùng chung

Dùng các phiên bản ghim trong HAK_SOURCES.json: HAK_AI_SKILLS (UI Designer, Code Auditor), HAK-Enterprise-Design-System (bố cục, focus, master–detail, màn hình nhỏ), HAK_CODE_QUALITY_TEST (phân tích mã/CI), HAK_SMART_FILTER (bộ lọc hồ sơ hiện có), HAK_ACCOUNTING_REPORT_STANDARD (phạm vi lọc, ngày, tổng và đơn vị tiền; đặc tả kỹ thuật dự thảo). Giữ theme neutral của ứng dụng, không đổi dữ liệu hoặc công thức nghiệp vụ để sửa giao diện.

## Đã sửa

- Hợp đồng vay là menu Danh mục riêng: danh sách đầy chiều ngang, tìm số hợp đồng/ngân hàng/chi nhánh không dấu, mở/thêm/sửa, quay lại danh sách, xem hồ sơ liên quan. Cài đặt chỉ giữ thông tin công ty. Giữ các mã và liên kết dữ liệu cũ.
- Ngày hợp đồng trong bảng dùng dd/MM/yyyy; ô nhập ngày vẫn dùng chuẩn date của trình duyệt.
- Sửa grid có trường chiếm nhiều cột gây tràn khi xuống một cột trên điện thoại.
- Tăng độ rộng các ô tên, tài khoản, ngân hàng, nội dung và tiền trong bảng thụ hưởng; bảng lớn cuộn trong vùng riêng. Dùng chữ số tabular cho tiền.
- Nhãn trường gắn với ô nhập; breadcrumb hợp đồng dùng nút bàn phím thao tác được; menu có aria-current; giữ focus-visible và reduced motion.
- Badge menu đang chọn dùng chữ trắng để rõ trên nền tối; font mono chỉ dùng mã thay vì mọi chữ đậm. Menu điện thoại thu gọn nhận diện để lộ các mục nghiệp vụ.
- Bộ quality adapter không đếm hai lần HTML và bản JavaScript nhúng; giữ các phát hiện riêng biệt, cú pháp và vòng phụ thuộc.

## Phạm vi kiểm chứng

Mở rộng kiểm thử Chromium cho chín màn hình ở 1366×768, 1920×1080 và 390×844: Tổng quan, Hợp đồng, Công ty, Khách hàng, Hồ sơ, Báo cáo, Đính kèm, Cài đặt, Hướng dẫn; thêm form hợp đồng và ảnh đầu ra. Các ca menu, tìm không dấu, rỗng, ngày, nhãn/focus, quay lại, lưu USD và đồng bộ vẫn chạy trong bộ hồi quy. Kết quả chính xác theo commit nằm ở GitHub Actions.

Bộ đầy đủ tiếp tục kiểm tra mẫu DOCX/XLSX, placeholder, ô số, công thức tổng, ô ghép, font/định dạng, nội dung và PDF thật bằng LibreOffice. Các kiểm tra này không tự chứng minh mọi chi tiết bố cục của mọi mẫu ngân hàng đều đạt. Bằng chứng Google thật dùng dữ liệu giả trên bản TEST và được bàn giao riêng, không đưa dữ liệu vận hành vào repo.

## Còn cần theo dõi

- Tệp DataService.gs, Index.html và JavaScript.html còn dài: cảnh báo bảo trì, chưa tách module trong đợt sửa UI.
- Hồ sơ thử chỉ chọn được mẫu có hiệu lực khớp ngân hàng/loại tiền/số người; không khớp sẽ dùng mẫu dựng sẵn và hiện cảnh báo. Cần nghiệm thu mẫu cụ thể theo ngân hàng sử dụng trước khi phát hành thật.
- Không tự đổi điều khoản, logo, chữ ký hoặc gộp các hợp đồng dữ liệu cũ. Chưa triển khai production.
