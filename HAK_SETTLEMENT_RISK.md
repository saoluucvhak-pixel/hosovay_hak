# Tất toán và rủi ro theo khoản vay

Mỗi hồ sơ có cờ DaTatToan riêng, không dùng tình trạng hợp đồng để suy ra khoản nào hết nợ. Nút Đánh dấu đã tất toán trong chi tiết hồ sơ và bảng rủi ro chỉ áp dụng hồ sơ đã giải ngân. Nhập ngày và bằng chứng/ghi chú, xác nhận trước khi ghi. Nếu ghi nhận nhầm, mở hồ sơ chọn mở lại và nhập lý do.

Lưu thêm DaTatToan, NgayTatToan, GhiChuTatToan, NguoiTatToan, TatToanCapNhatLuc ở HoSoGiaiNgan; tự bổ sung cột khi ghi lần đầu, không xóa dữ liệu. Khóa ghi + expectedRevision, phạm vi công ty và quyền NHAP_LIEU được kiểm tra; tăng REV_HOSO và ghi nhật ký. Dữ liệu cũ thiếu cột được hiểu chưa tất toán. Trạng thái giải ngân, số tiền và chứng từ giữ nguyên.

Tổng quan chỉ lấy USD đã giải ngân, chưa tất toán, chưa xóa và đúng phạm vi công ty; bỏ nháp và đã hủy. Đánh dấu tất toán xong tải lại tổng quan và danh sách. Thống kê hồ sơ lịch sử vẫn giữ tất cả; riêng phân tích tỷ giá loại khoản tất toán.

Nhập tỷ giá BIDV BÁN và ngày niêm yết vào bảng Tổng quan, bấm Đánh giá. App chưa tự lấy tỷ giá từ BIDV. Bảng theo từng hồ sơ: gốc đang theo dõi, tỷ giá mua khi giải ngân, quy đổi gốc theo tỷ giá bán và chênh từ giải ngân = gốc × (BÁN đánh giá − MUA giải ngân). Tính trên gốc ban đầu của hồ sơ chưa tất toán; chưa có sổ trả gốc một phần, chưa cộng lãi/phí hoặc nguồn thu USD. Không gọi đây là dư nợ xác nhận, lãi/lỗ kế toán hay thay đổi so với hôm qua. Điểm hòa vốn có lãi VND đối chiếu nằm ở menu So sánh USD/VND.

Kiểm chứng: 16 khẳng định backend tất toán/rủi ro (phiên bản, phạm vi, ngày, cờ, cache danh sách, mở lại); UI mô phỏng hai khoản mở, chênh quy đổi, truyền revision, loại ngay khoản tất toán, ẩn kết quả cũ, mobile. Các 16 nhóm portable cũ đã đạt sau thay đổi backend. Chưa triển khai hoặc kiểm thử trên Google thật.

Cài đặt: thêm TatToan.gs và RuiRoTyGia.html; thay Index.html, JavaScript.html, PHANTRANG.gs, PHIEN.gs. Hoặc dùng toàn bộ Code_Copy nếu thiếu các đợt cập nhật trước. Lưu và triển khai phiên bản Apps Script mới; giữ cấu hình Sheet/Drive hiện có.
