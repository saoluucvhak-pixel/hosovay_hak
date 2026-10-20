# Tất toán và rủi ro theo khoản vay

Mỗi hồ sơ có cờ DaTatToan riêng, không dùng tình trạng hợp đồng để suy ra khoản nào hết nợ. Menu Tất toán khoản vay nằm dưới Hồ sơ giải ngân. Trang riêng có danh sách phân trang 30 khoản, bộ lọc Chưa/Đã/Tất cả và VND/USD, tìm mã/giấy nhận nợ/hợp đồng/doanh nghiệp. Chọn khoản vay để mở form bên phải; nhập ngày và bằng chứng/ghi chú, đánh dấu xác nhận rồi lưu. Nút trong hồ sơ và bảng rủi ro dẫn tới trang này. Chỉ thao tác với hồ sơ đã giải ngân. Nếu ghi nhận nhầm, mở hồ sơ chọn mở lại và nhập lý do.

Lưu thêm DaTatToan, NgayTatToan, GhiChuTatToan, NguoiTatToan, TatToanCapNhatLuc ở HoSoGiaiNgan; tự bổ sung cột khi ghi lần đầu, không xóa dữ liệu. Khóa ghi + expectedRevision, phạm vi công ty và quyền NHAP_LIEU được kiểm tra; tăng REV_HOSO và ghi nhật ký. Dữ liệu cũ thiếu cột được hiểu chưa tất toán. Trạng thái giải ngân, số tiền và chứng từ giữ nguyên.

Tổng quan chỉ lấy USD đã giải ngân, chưa tất toán, chưa xóa và đúng phạm vi công ty; bỏ nháp và đã hủy. Đánh dấu tất toán xong tải lại tổng quan và danh sách. Thống kê hồ sơ lịch sử vẫn giữ tất cả; riêng phân tích tỷ giá loại khoản tất toán.

Nhập tỷ giá BIDV BÁN và ngày niêm yết vào bảng Tổng quan, bấm Đánh giá. App chưa tự lấy tỷ giá từ BIDV. Bảng theo từng hồ sơ: gốc đang theo dõi, tỷ giá mua khi giải ngân, quy đổi gốc theo tỷ giá bán và chênh từ giải ngân = gốc × (BÁN đánh giá − MUA giải ngân). Tính trên gốc ban đầu của hồ sơ chưa tất toán; chưa có sổ trả gốc một phần, chưa cộng lãi/phí hoặc nguồn thu USD. Không gọi đây là dư nợ xác nhận, lãi/lỗ kế toán hay thay đổi so với hôm qua. Điểm hòa vốn có lãi VND đối chiếu nằm ở menu So sánh USD/VND.

Kiểm chứng: 25 khẳng định backend tất toán/rủi ro (phiên bản, phạm vi, ngày, cờ, cache danh sách, mở lại); 20 kiểm tra UI trang Tổng quan và Tất toán: tìm kiếm, lịch sử đã tất toán, form xác nhận, lỗi phiên bản, mở lại, cập nhật bảng rủi ro, sáng/tối và mobile. 334 kiểm tra giao diện màu và kích thước đạt. Chưa triển khai hoặc kiểm thử trên Google thật.

Cài đặt: thêm TatToan.gs, TatToan.html và RuiRoTyGia.html; thay Index.html, JavaScript.html, Stylesheet.html, PHANTRANG.gs, PHIEN.gs. Hoặc dùng toàn bộ Code_Copy nếu thiếu các đợt cập nhật trước. Lưu và triển khai phiên bản Apps Script mới; giữ cấu hình Sheet/Drive hiện có.

Tổng quan mới: bốn thẻ gốc USD, gốc VND chưa tất toán, số khoản đến hạn trong 7 ngày và số đã tất toán; bảng rủi ro USD đặt ngay bên dưới. Thống kê hồ sơ và kiểm tra kết nối thu gọn. Giá trị gốc là số ban đầu của khoản chưa tất toán, chưa thay thế dư nợ sau trả gốc từng phần. Các số trên thẻ tổng hợp không phụ thuộc bộ lọc của danh sách tất toán.
