# DEPLOYMENT_GUIDE
1. Dán đè `Backup.gs`, `DataService.gs`, `TYGIATUDONG.gs` (các file khác không đổi). Triển khai phiên bản mới.
2. Script Properties cần có: `CH_THU_MUC_GOC_ID` (thư mục gốc; bản sao nằm trong `Backup_Sheet`), `CH_SS_MUA_HANG_ID`/`CH_SHEET_MUA_HANG` (nay có hiệu lực ở gợi ý tài liệu theo nhà cung cấp), `PORTAL_CHE_DO`, `SSO_SECRET`, `ADMIN_EMAILS`.
3. Trigger: sao lưu `saoLuuHangTuan` (tuần); tỷ giá chạy `taoLichTuDongTyGia` một lần. Không tạo trigger trùng (hàm tự xóa trigger cũ cùng tên).
4. Kết quả sao lưu: xem Executions (`[BACKUP] OK/THẤT BẠI`) và sheet nhật ký (hành động `SAO_LUU`). Thất bại **không** khóa lần sau; thử lại sau ≥10 phút.
5. Phục hồi (THỦ CÔNG, chưa có chức năng tự động): (a) tạo bản sao của file hiện tại làm điểm quay lại; (b) mở bản `BACKUP_*` cần khôi phục trong `Backup_Sheet`, kiểm tra dữ liệu; (c) chỉ sao chép sheet cần thiết sang file chính hoặc đổi ID file chính khi đã được duyệt; (d) chạy `Kiểm tra cấu hình`/trang chẩn đoán. Không làm trên production nếu chưa thử ở bản sao.
6. Rollback code: Triển khai → Quản lý → chọn phiên bản trước. Bản cũ của `Backup.gs` an toàn để quay lại nhưng có lỗi A-01…A-03.
