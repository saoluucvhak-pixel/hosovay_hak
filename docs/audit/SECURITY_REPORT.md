# SECURITY_REPORT
Kết quả kiểm thử bảo mật (giả lập): xem `AUDIT_REPORT.md` mục "Đã rà". Không có P0 xác nhận ở lượt này.

- `saoLuuHangTuan` là hàm công khai (đích trigger): giữ chặn tần suất 20 giờ + mới thêm chặn thử 10 phút và khóa; gọi trực tiếp bởi người lạ không tạo thêm bản sao (test `chay_bao_mat.js`, `chay_sao_luu.js`). Hàm không trả đường dẫn/ID Drive ra ngoài ngoài `fileId` của bản sao; **lưu ý:** giá trị trả về hiển thị cho người gọi trực tiếp — nếu muốn không lộ `fileId`, đổi sang chỉ trả `{ok}` (đề xuất P2, chưa làm vì trigger không cần).
- Không log token/secret/CCCD/số tài khoản trong code đã sửa (nhật ký sao lưu chỉ có tên bản sao).
- `appsscript.json`: `executeAs USER_DEPLOYING`, `access ANYONE` — an toàn chỉ khi bật `CONG_HAK`; ở `TAM_GOOGLE` mặc định dựa vào `ADMIN_EMAILS` và bảng quyền. Chưa kiểm chứng với Cổng thật (BLOCKED: thiếu Cổng/tài liệu SSO thật).
