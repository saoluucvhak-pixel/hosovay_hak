# ACCEPTANCE_CHECKLIST — bắt buộc kiểm tra trên Google thật (chưa làm)
- [ ] Chạy tay `saoLuuHangTuan`: có bản `BACKUP_<tên>_<thời gian>` trong `Backup_Sheet`, mở được, đủ sheet; Executions ghi `[BACKUP] OK`.
- [ ] Chạy lại ngay: trả bỏ qua, không tạo thêm bản.
- [ ] Đặt `CH_THU_MUC_GOC_ID` sai tạm thời: chạy → `THẤT BẠI`, **không** có `BACKUP_LAN_CUOI_MS`; sửa lại, chạy sau ≥10 phút → thành công.
- [ ] Thả file lạ vào `Backup_Sheet`: sau khi vượt 12 bản, file lạ không bị xóa.
- [ ] Đổi `CH_SS_MUA_HANG_ID` ở Cài đặt: gợi ý tài liệu theo nhà cung cấp đọc đúng file mới.
- [ ] Tỷ giá: chạy `chuanBiTyGiaGoogle`, đợi 1–2 phút, `capNhatLaiTyGiaVCB`; kiểm tra GhiChu, nguồn, không tự ghi khi lệch >5%.
- [ ] Đăng nhập Cổng HAK thật: token sai/hết hạn, vai trò ADMIN/NHAP_LIEU/XEM, phạm vi công ty.
- [ ] In/tải PDF bằng tài khoản không phải chủ: không bị hỏi quyền Drive (mở bằng link `/exec`).
- [ ] Hai người cùng sửa/phát hành một hồ sơ: có thông báo xung đột.
