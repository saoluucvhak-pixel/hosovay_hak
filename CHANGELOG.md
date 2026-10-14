# CHANGELOG

## Giai đoạn 2 — An toàn dữ liệu, vòng đời hồ sơ, tích hợp cổng (nhánh `claude/friendly-faraday-g049cv`)

### Thêm
- `HoSoDomain.gs` — lớp miền: máy trạng thái ở backend, revision, khoá ghi lồng được (`voiKhoa_`), sinh mã bền, xoá mềm, nhật ký ghi dở dang + phục hồi.
- `PortalAuthAdapter.gs` — chỉ là **adapter**; ứng dụng KHÔNG có đăng nhập/RBAC riêng. Chế độ `TAM_GOOGLE` (mặc định, danh sách `ADMIN_EMAILS`) và `CONG_HAK` (chưa có giao thức từ HAK_HDMB nên **từ chối mọi truy cập** cho tới khi hiện thực `xacMinhPhienCong_`).
- Sheet mới (tự tạo): `LichSuTrangThaiHoSo`, `NhatKyGhiDoDang`. Cột mới của `HoSoGiaiNgan` (tự thêm, không đụng dữ liệu cũ): `Revision, CapNhatLuc, CapNhatBoi, DaXoa, NgayXoa, NguoiXoa, LyDoXoa`.
- API: `kiemTraDieuKienGiaiNgan`, `layLichSuTrangThaiHoSo`, `khoiPhucHoSo` (quản trị), `layGhiDoDang`/`phucHoiGhiDoDang` (quản trị).

### Đổi hành vi (cần biết)
- **Trạng thái do máy chủ quyết định**: `luuHoSoGiaiNgan` bỏ qua `trangThai` của client. Chuyển hợp lệ: Nháp→Đã tạo hồ sơ→Đã giải ngân→Đã hủy; Đã tạo hồ sơ→Nháp. `Đã hủy` là kết thúc. Hủy bắt buộc lý do. Đánh dấu giải ngân chỉ khi đủ dữ liệu + chứng từ bắt buộc đã tạo và khớp dữ liệu hiện tại.
- **Chỉ sửa được hồ sơ ở Nháp** (trước đây cho sửa cả “Đã tạo hồ sơ”): muốn sửa phải “Chuyển về Nháp”.
- **Revision**: client gửi `expectedRevision`; lệch → lỗi `XUNG_DOT_PHIEN_BAN` thay vì ghi đè. Hồ sơ cũ chưa có Revision coi là 0.
- **Xoá hồ sơ là xoá mềm** (đặt `DaXoa`): dòng, chi tiết, lịch sử phát hành, file Drive giữ nguyên; hồ sơ có tài liệu phải xác nhận (`CO_TAI_LIEU`). Không xoá hồ sơ Đã giải ngân/Đã hủy.
- **Sinh mã**: trong khoá, lấy max(cột A, bộ đếm bền)+1 và kiểm tra chưa tồn tại → mã đã cấp không bao giờ cấp lại (có thể hở số). Khoá kỹ thuật (`MaHoSo`) tách khỏi số chứng từ nghiệp vụ.
- Lưu cha–con: kiểm tra toàn bộ trước khi ghi; ghi nhật ký `DANG_GHI` + bản sao → ghi → đọc lại đối chiếu số dòng/tổng tiền → `HOAN_TAT`. Lần lưu sau tự phục hồi nếu lần trước chết giữa chừng.
- Mọi API giao diện gọi đều bắt đầu bằng `yeuCauDangNhap_()`.

### Kiểm thử (chạy trên **giả lập** Apps Script, không phải Google thật)
`kiem_thu/chay_tat_ca.sh` — 13 giai đoạn; mới: `chay_trang_thai.js` (53 khẳng định) và 3 khẳng định giao diện.

### Chưa làm / chưa kiểm chứng
- Tích hợp cổng HAK thật (thiếu hợp đồng giao thức HAK_HDMB).
- “Đồng thời” mới được kiểm bằng khoá giả lập tuần tự; chưa thử hai phiên thật trên Google.
- Chưa làm: refactor `AppDataStore`/phong bì API/đánh số request (phụ lục P0 bị cắt), `SheetRepository`, đối soát báo cáo mở rộng, giao diện Enterprise.
