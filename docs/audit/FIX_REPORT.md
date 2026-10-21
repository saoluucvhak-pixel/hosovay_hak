# FIX_REPORT
| File | Thay đổi | Lý do |
|---|---|---|
| `Backup.gs` | Viết lại `saoLuuHangTuan`: khóa script; chỉ ghi `BACKUP_LAN_CUOI_MS` sau khi xác minh bản sao (tên, không thùng rác, đủ sheet); `BACKUP_LAN_THU_MS` chặn thử dồn dập 10 phút; bản sao hỏng bị bỏ thùng rác; try/finally nhả khóa; ghi nhật ký; trả `{ok,…}` thay vì ném lỗi. `don_DepBanSaoCu_` chỉ động tới file đúng tiền tố, bỏ qua file đã xóa, luôn giữ ≥1 bản. | A-01…A-03 |
| `DataService.gs` | Dùng `CauHinh_()` thay cho hằng số cứng khi mở sổ mua hàng | A-04 |
| `TYGIATUDONG.gs` | Không tự ghi giá Google lệch >5% so với giá gần nhất (`BAT_THUONG`, quản trị vẫn ghi được qua "Cập nhật lại"); GhiChu ghi rõ "chưa đối chiếu với ngân hàng" | A-05 |
| `kiem_thu/chay_sao_luu.js` (mới) | 7 ca: thành công, gọi lại, thất bại không chặn lần sau, lỗi Drive, khóa bị giữ, dọn bản cũ, cấu hình mua hàng | hồi quy |
| `kiem_thu/chay_ty_gia_tu_dong.js` | Thêm ca giá bất thường | A-05 |
| `kiem_thu/chay_bao_mat.js` | Ca chặn tần suất sao lưu cập nhật theo quy tắc mới | hành vi mới |
| `kiem_thu/gia_lap_apps_script.js` | Mock: file Sheet chính có `makeCopy`, `openById` trả bản sao | test sao lưu |
| `tools/suites.cjs` | Đăng ký `chay_sao_luu` | |

Không đổi nghiệp vụ hồ sơ, quyền, mẫu văn bản, giao diện. Không sửa test để che lỗi: ca bảo mật sao lưu phải đổi vì hành vi đúng đã đổi (lần thử hỏng giờ không khóa 20 giờ).
