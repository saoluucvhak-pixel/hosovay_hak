# Kiểm chứng tích hợp HAK — cập nhật 17/10/2026

Full workflow tại commit b96cc61409e7e46ef550300494625f59879bbdfd đã đạt **23/23 giai đoạn**, gồm LibreOffice/PDF thật và TC30 chạy hồi quy lồng, không đặt BO_QUA_TC30.

Bằng chứng: https://github.com/saoluucvhak-pixel/hosovay_hak/actions/runs/39010303070

| Nhóm | Kết quả đợt full |
|---|---|
| Logic tiền/XML | 49/49 |
| HAK adapter/báo cáo | 5/5 nhóm |
| Engine mẫu thử + đọc độc lập + PDF thật | 0 lỗi |
| Engine 7 mẫu công ty + đọc độc lập + PDF thật | 0 lỗi kiểm tra dữ liệu |
| Tích hợp phát hành mẫu thử | 118/118 |
| Tích hợp phát hành mẫu công ty | 102/102 |
| Đọc độc lập chứng từ tích hợp | 0 lỗi |
| Hồi quy chức năng | 22/22 |
| Trình tạo mẫu | 29/29, đọc độc lập 0 lỗi |
| Giao diện Chromium, backend giả lập | 124/124 |
| Vòng đời hồ sơ | 54/54 |
| Đồng bộ/cache | 27/27 |
| Đăng nhập/quyền | 51/51 |
| Quy trình gồm TC30 đầy đủ | 31/31 |
| Bề mặt API/gọi trực tiếp | 8/8 nhóm |
| Hiệu năng giả lập | 28 phép đo, 4 quy mô, 0 lỗi ngưỡng |
| Phân trang/quyền/tổng/cache | 27/27 |

Đợt chạy đầu phát hiện 48 lỗi khẳng định chiều cao hàng Excel. Nguyên nhân: kiểm thử cũ yêu cầu bằng đúng chiều cao mẫu, trong khi engine chủ động tăng chiều cao cho nội dung xuống dòng. Đã sửa kiểm tra giữ chiều cao tối thiểu, giới hạn hợp lệ và wrap text; giữ nguyên kiểm tra công thức, giá trị, ô ghép và tổng. Không sửa số tiền hoặc công thức nghiệp vụ.

Kiểm tra bổ sung:

- chay_luong_du_lieu.js: 13/13 ảnh chụp trạng thái sau từng thao tác đạt tại máy phát triển. Đối chiếu ô ở danh mục, hồ sơ, chi tiết, lịch sử và báo cáo nháp; bấm lặp/xung đột/đọc không đổi ô nghiệp vụ; tổng VND/USD tách riêng, quy đổi và revision đúng.
- chay_dong_goi.js đã thay tên API cũ không còn tồn tại bằng API tổng quan/phân trang hiện hành: **35 lời gọi, 0 bỏ qua, 0 lỗi** tại máy phát triển. Hàm thiếu hoặc gọi lỗi bất ngờ nay làm kiểm tra thất bại.
- Workflow đầy đủ đã bổ sung các kiểm tra mới; xem GitHub Actions của PR để lấy trạng thái trên commit mới nhất.

## Giới hạn của kết luận

CI chạy nguyên mã .gs với Google services giả lập, nhưng DOCX/XLSX là file thật và PDF được LibreOffice tạo thật. Không xem CI là chứng minh Sheets/Drive/SSO thật.

Tạo được PDF và đúng tổng tiền chưa đủ để kết luận bố cục đạt. Khi xem ảnh đầu ra, một số mẫu Excel cũ chưa có cấu hình trang in thể hiện cắt chữ/tách trang; cần nghiệm thu riêng theo mẫu sử dụng thực tế. CI kiểm tra nội dung, placeholder, định dạng và công thức trong phạm vi các khẳng định hiện có, không bảo đảm tự phát hiện mọi lỗi nhãn tiền tệ hoặc bố cục.

Các kiểm tra Google thật được thực hiện và báo cáo riêng tư cho chủ tài khoản. Chưa hợp nhất PR hay triển khai mã mới vào Web App vận hành. Luồng ghi/xóa/xung đột nhiều tài khoản trên bản Google tách riêng vẫn cần staging có đúng phiên bản mã và quyền truy cập tương ứng.

Log/ảnh/bản xuất thử có tại artifact của workflow. Không đưa dữ liệu tài chính đang vận hành vào repository công khai.
