# AUDIT_REPORT — HAK Hồ sơ vay (main @ 65b52c9)

Phạm vi lượt này: tiếp nối các đợt kiểm toán trước (PR #12–#17, xem `BAO_CAO_KIEM_TOAN_P0.md`, `BAO_CAO_KIEM_TRA_SUA_MAIN.md`). Lượt này đọc lại Backup.gs, TYGIATUDONG.gs, đường đọc cấu hình, và chạy lại toàn bộ bộ kiểm thử. **Không** kết luận từ manifest; mọi kết luận dựa trên đọc code + test chạy trên giả lập Apps Script.

| ID | Mức | File / hàm | Nguyên nhân | Bằng chứng | Trạng thái |
|---|---|---|---|---|---|
| A-01 | P1 | Backup.gs `saoLuuHangTuan` | `BACKUP_LAN_CUOI_MS` được ghi **trước** khi tạo bản sao. Tạo bản sao lỗi (Drive/thư mục gốc sai) vẫn khóa 20 giờ → mất lần sao lưu kế. | Đọc code; test `chay_sao_luu.js` (ca "THẤT BẠI") | XÁC NHẬN – ĐÃ SỬA |
| A-02 | P1 | Backup.gs `don_DepBanSaoCu_` | Xóa (thùng rác) **mọi** file thứ 13+ trong thư mục, kể cả file không phải bản sao của ứng dụng; không có tiền tố, không bỏ qua file đã xóa. | Đọc code; ca "Dọn bản cũ" tạo file lạ rồi kiểm tra còn nguyên | XÁC NHẬN – ĐÃ SỬA |
| A-03 | P1 | Backup.gs | Không LockService (hai trigger/hai lần gọi cùng lúc cùng tạo bản sao); không xác minh bản sao; bản sao dở dang không dọn; lỗi ném ra không ghi nhật ký. | Đọc code; ca "khoá bị giữ", "Lỗi Drive" | XÁC NHẬN – ĐÃ SỬA |
| A-04 | P1 | DataService.gs `layDanhSachTaiLieuTheoNhaCungCap` | Mở sổ mua hàng bằng hằng số cứng `SS_MUA_HANG_ID`/`SHEET_MUA_HANG`, bỏ qua cấu hình Script Properties (`CH_SS_MUA_HANG_ID`, `CH_SHEET_MUA_HANG`) mà màn Cài đặt lưu. Đổi ID trong Cài đặt không có hiệu lực ở chức năng này. | Test mới fail trên code cũ ("phải mở đúng ID đã cấu hình"), pass sau sửa | XÁC NHẬN – ĐÃ SỬA |
| A-05 | P2 | TYGIATUDONG.gs `chayCapNhatTyGia_`, `ghiTyGiaTuDong_` | (a) Không chặn giá Google lệch bất thường so với giá gần nhất (chỉ chặn <1.000 hoặc >100.000). (b) Dòng tự động không ghi rõ chưa đối chiếu ngân hàng. | Test mới `BAT_THUONG`; GhiChu có "chưa đối chiếu với ngân hàng" | XÁC NHẬN – ĐÃ SỬA |
| A-06 | P1 | Backup.gs (thiết kế) | Chưa có chức năng phục hồi. | Đọc code | **KHÔNG LÀM** có chủ đích: phục hồi tự động ghi đè dữ liệu thật, không thể kiểm chứng trên Google thật trong phiên này. Có quy trình thủ công trong `DEPLOYMENT_GUIDE.md`. Trạng thái: BLOCKED (cần staging Google). |

## Đã rà và KHÔNG thấy lỗi mới (có bằng chứng test, trên giả lập)
- Phân quyền: `chay_bao_mat.js` — mọi hàm công khai nằm trong bảng quyền hoặc allow-list có lý do; mọi API từ chối khi gọi trực tiếp bởi ẩn danh/chưa cấp/chỉ-xem, ở TAM_GOOGLE và CONG_HAK. `chay_dang_nhap.js` — SSO token sai/hết hạn/dùng lại/giả mạo, phiên rỗng, mã ghép cặp.
- Đồng thời/idempotency/revision: `chay_dong_bo.js`, `chay_trang_thai.js`, `chay_quy_trinh.js`, `chay_luong_du_lieu.js`.
- Tiền VND/USD số nguyên, tỷ giá thập phân: `chay_usd_cent.js`, `chay_thu_logic.js`, `chay_tat_toan.js`.
- Cache: `chay_dong_bo.js`, `BAO_CAO_NGUYEN_NHAN_GOC_CACHE.md`.
- Chứng từ DOCX/XLSX/PDF thật (LibreOffice): `test:full` 63/63.

## Giả thuyết / chưa kiểm chứng được
- Hành vi thật của GOOGLEFINANCE, thời gian chạy 6 phút, CacheService eviction, quyền Drive thật, SSO với Cổng thật: **NOT RUN** (không có Google thật/Cổng thật).
- Vòng lặp `getRange().setValue()` trong CAUHINH/TEMPLATEREGISTRY/DOCUMENTAUDIT: lặp trên số khóa/cột nhỏ và cố định; không đo thấy vấn đề, giữ nguyên.
