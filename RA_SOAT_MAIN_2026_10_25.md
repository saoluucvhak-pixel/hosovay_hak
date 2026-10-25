# Rà soát main ngày 25/10/2026

Nền kiểm tra: b421ca8. Môi trường: Apps Script/Sheets giả lập và Edge, không ghi dữ liệu vận hành Google.

## Phát hiện và xử lý

### P1 — Xác nhận giải ngân bị hủy sau khi hồ sơ đã ghi thành công — ĐÃ SỬA
Trong xacNhanGiaiNganThucTe, catch bao trùm cả bước ghi nhật ký/dấu phê duyệt. Lỗi việc phụ sau commit làm hủy xác nhận trong khi hồ sơ đã Đã giải ngân. Tái hiện bằng lỗi nhật ký sau chuyển trạng thái: hồ sơ Đã giải ngân, xác nhận Hủy bỏ.

Sửa: tách việc phụ khỏi xử lý chuyển trạng thái; khi bước chuyển báo lỗi, đọc lại trạng thái và revision. Chỉ hủy xác nhận khi chắc chắn hồ sơ chưa chuyển. Nếu đã chuyển đúng, giữ xác nhận và trả cảnh báo. Nếu không xác minh được, không tự hủy và báo CHUA_XAC_DINH_GIAI_NGAN để đối soát. UI hiển thị cảnh báo trả về. Không tự sửa các bản ghi lịch sử đã mâu thuẫn.

### P2 — Sơ đồ tải/khởi tạo ngay khi chưa mở — ĐÃ TỐI ƯU
Index nhúng toàn bộ sơ đồ ~913 KB. Nay endpoint quyền XEM trả nội dung khi mở menu; chống gọi trùng, lưu nội dung trong phiên, không gắn iframe khi phản hồi về sau khi rời màn hình. Rời menu hủy iframe để ngừng hiệu ứng/timer. Mở lại dùng nội dung trong bộ nhớ (góc nhìn sơ đồ trở về ban đầu). Có nút thử lại khi tải lỗi.

HTML ban đầu chưa nén: 1.853.512 → 942.069 byte; giảm 911.443 byte (49,2%). Đây là số byte đầu ra include mô phỏng, không phải cam kết tốc độ mạng Google.

### P2 — Tính lại lịch trả nợ khi tính lãi phạt — ĐÃ TỐI ƯU
Phân tích quá hạn và phân bổ tiền trả đã có lịch cùng đầu vào nhưng tính lãi phạt lại dựng lịch. Nay truyền lịch cùng lần gọi, không cache xuyên người dùng/yêu cầu. Kiểm chứng 100 khoản: kết quả JSON giống hệt, tính lịch giảm 200 → 100 lần.

Đo Node 5.000 khoản (một lần trước/sau, có nhiễu tải máy): phân tích quá hạn 4.381,9 → 3.145,6 ms; bảng điều hành 4.522 → 3.418,5 ms. Không diễn giải thành độ trễ Apps Script thực tế. Số lượt đọc Sheets của các luồng này không đổi.

## Rủi ro còn mở

### P1 — Mốc ngày báo cáo chưa phải ngày thực giải ngân
BAOCAODUNO.gs dùng HoSoGiaiNgan.NgayGiaiNgan. GIAINGANTHUCTE.gs lưu ngày thực ở XacNhanGiaiNgan.NgayThucTe, không đổi ngày kế hoạch trên hồ sơ. Tái hiện: ngày hồ sơ 15/10/2026, thực giải ngân 25/10/2026, báo cáo tại 24/10/2026 vẫn có dư nợ 1.000 VND. Đây là cơ sở tính hiện có đã được ghi chú trong code, nhưng dễ gây hiểu nhầm báo cáo thực tế.

Cần chuẩn hóa ngày có hiệu lực dùng chung cho dư nợ, lịch trả nợ, lãi và hạn mức; giữ ngày kế hoạch riêng; quy định fallback cho dữ liệu cũ chưa có xác nhận. Đợt này chưa đổi mô hình ngày để tránh các báo cáo dùng cơ sở khác nhau. Không nên coi báo cáo quá khứ là số ngân hàng thực tế khi hai ngày khác nhau.

### Hiệu năng nhập bảo hiểm lớn
300 tài sản kèm bảo hiểm: 639 lượt đọc range, 1.201 lượt ghi, 41.549 ô đọc. Các kiểm tra tính nhất quán/generation/phục hồi đạt. Chưa giảm lượt ghi vì mỗi hợp đồng có dấu vết và xác minh riêng; hướng tiếp là chia lô có checkpoint/tiếp tục, giữ kiểm chứng từng giao dịch, đo trên staging Google.

### Phạm vi kiểm chứng
83 bộ hồi quy đạt trong lượt chạy toàn bộ; thêm 2 bộ mới chạy riêng đạt (commit giải ngân, tái sử dụng lịch). Các bộ bị ảnh hưởng đã chạy lại: menu lazy-load/quyền endpoint, phân bổ, duyệt hai cấp, đối soát báo cáo, hiệu năng quản lý vay. TC30 tài liệu/PDF đệ quy vẫn bỏ qua theo runner. Chưa đo quota/latency Google thật, chưa kiểm tra dữ liệu thật hoặc deploy Apps Script.

## File Apps Script thay đổi
Code.gs, DUBAO.gs, GIAINGANTHUCTE.gs, Index.html, JavaScript.html, PHANBO.gs, PHIEN.gs. LuongDuLieu.html không thay đổi so với bản b421ca8, nhưng cần có sẵn trong dự án.
