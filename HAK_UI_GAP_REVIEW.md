# Rà soát giao diện so với HAK_LUONG_OFFLINE — 20/10/2026

Nguồn đối chiếu: saoluucvhak-pixel/HAK_LUONG_OFFLINE, nhánh feature/luong-hak-v10-4-enterprise-ui, commit f93ffc42a24a8ec30b24493178368471d310c63f. Main của repo tham chiếu chỉ có README; không coi main là bản ứng dụng đầy đủ.

Tệp đã đọc: LuongHAK_Offline/style.css, index.html, ui/workspace-v104.js, ui/workspace-v104.css; design-system/README.md, V10.4-LAYOUT.md; docs/HAK_V10_4_LUXURY_DESIGN_BASELINE.md. Các tài liệu thiết kế có cả mục tiêu chưa triển khai; không xem mọi mục là tính năng đã hoạt động trong Luong Offline.

## Đã bổ sung trong app vay

| Thành phần | Kết quả |
|---|---|
| Sáng/tối | Sáng, Tối, Theo máy; cập nhật khi hệ điều hành đổi chế độ |
| Bảng màu | Luxe mặc định, Classic, Neutral, Champagne; 8 tổ hợp sáng/tối |
| Lưu tùy chọn | LocalStorage chỉ chứa bảng màu/chế độ/mật độ/menu; không chứa dữ liệu tài chính; vẫn đổi được khi lưu trữ bị chặn |
| Menu | Nút thu gọn trên desktop, tên truy cập/tooltip giữ nguyên; mobile giữ điều hướng hiện có |
| Tìm màn hình | Ctrl/Command K, tìm không dấu, Enter mở màn hình thật qua luồng điều hướng hiện có; giữ cảnh báo form chưa lưu; Escape đóng, giữ focus trong hộp tìm |
| Mật độ | Gọn/Thoáng; không đổi số liệu hoặc nghiệp vụ |
| Thành phần tối | Nền, ô nhập, trường chỉ đọc, bảng, thẻ, menu mẫu, modal, trạng thái; sửa màu cảnh báo tối khó đọc |
| Hướng dẫn | Sửa nội dung USD lỗi thời: cha nhập tiền vay/bán/thực nhận; con chọn VND hoặc USD, 1/2/3+ chọn đúng bộ chứng từ; báo cáo tổng nguyên tệ riêng |

## Còn khác biệt / cần hoàn thiện tiếp

| Mức | Nội dung | Hiện trạng / ảnh hưởng |
|---|---|---|
| P2 | Khung cha–con cùng màn hình và Drawer | App có quan hệ hợp đồng → hồ sơ → người hưởng, nhưng chủ yếu chuyển danh sách/chi tiết/form. Chưa có workspace hai vùng đồng nhất như mẫu thiết kế; cần thiết kế riêng cho luồng vay, không chép engine lương. |
| P2 | Tùy chọn cột bảng | Có bảng cuộn, lọc, sắp xếp, phân trang; chưa có lưu bộ cột/độ rộng cột cho từng người dùng. |
| P2 | Bộ lọc đã lưu | Có bộ lọc nhanh/nâng cao/chip, nhưng chưa có giao diện lưu và gọi lại bộ lọc đặt tên. |
| P2 | Bàn phím cho lưới dữ liệu | Tìm màn hình có bàn phím; chưa có điều hướng ô bằng phím mũi tên trên toàn bộ bảng. |
| P2 | Focus của modal cũ | Hộp tìm mới quản lý focus; các modal nghiệp vụ cũ chưa được chuẩn hóa toàn bộ theo một bộ focus trap/return focus. |
| P2 | Thanh tài khoản và trạng thái tải | Tài khoản vẫn ở chip điều hướng hiện có; chưa thống nhất một thanh trên chứa tài khoản, thời điểm tải và trạng thái yêu cầu cho mọi màn hình. |
| P2 | CSS kế thừa | Các lớp CSS cũ và lớp adapter đang cùng tồn tại. Cần gom về token chuẩn theo từng nhóm ở một đợt riêng để giảm chi phí bảo trì. |

Không thêm hành động hàng loạt hoặc nút nhập/xuất giả: các nút phải nối với API, quyền và quy tắc hồ sơ thực tế. Không thêm công thức/kỳ lương vào app vay. Những mục còn khác biệt trên không được công bố là đã hoàn thiện.

## Kiểm chứng

- Chay_theme: 286 kiểm tra đạt, gồm 8 tổ hợp × 1366/1920/390px, 9 màn hình không tràn ngang, tương phản của các thành phần được đo, lưu qua tải lại, chế độ theo máy, tìm nhanh/bàn phím, lưu trữ bị chặn, không gọi Google khi đổi giao diện và không đổi kho dữ liệu nghiệp vụ.
- Kiểm thử giao diện hiện có: 183/183 đạt với backend giả lập.
- Ảnh lấy từ Chromium chạy mã thật của app trong môi trường kiểm thử; không phải ảnh xác nhận Web App Google đang chạy bản này.
- Kiểm tra tương phản có giới hạn ở các thành phần đã đo; không phải chứng nhận WCAG cho toàn bộ ứng dụng.
- Không sửa hoặc tự động ghi lại file Word/Excel mẫu trên Drive khi đổi giao diện. Chế độ in giữ nền sáng.

## Cài đặt

Code GitHub không tự triển khai Apps Script. Bộ bàn giao chứa toàn bộ .gs/.html hiện hành, kèm appsscript.json để đối chiếu. Thêm GiaoDien.html (mới đợt này) và DinhDang.gs (nếu chưa thêm ở đợt trước); thay nội dung các tệp hiện có bằng nội dung tương ứng, tránh tạo trùng hai file cùng khai báo. Giữ đúng ID Sheet/Drive của dự án đang dùng. Lưu và cập nhật triển khai New version. Không cần cài lại mẫu Drive.

Hai tên file HAKReport.gs.gs và HAKSmartFilter.gs.gs trên main cũ chỉ khác tên, nội dung đúng; trong bộ copy dùng tên chuẩn. Nếu dự án đang có tên dư đuôi, thay nội dung vào tệp đó hoặc đổi tên, không giữ thêm một bản sao khai báo cùng hàm.

## Lỗi bổ sung tìm thấy trong đợt rà soát
Full CI ở d718313 từng dừng tại UI gate do bảng chẩn đoán rộng 431px trên màn hình 390px. Đã bọc bảng vào vùng cuộn và giới hạn flex-child; không bỏ kiểm tra tràn. Đồng thời thêm mock PropertiesService mặc định cho hai bộ kiểm thử DOCX độc lập sau khi định dạng chuyển sang cấu hình. Kết quả full của commit mới cần xem workflow hiện hành, không dùng kết quả portable để khẳng định full đã đạt.
