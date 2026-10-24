# Rà soát luồng dữ liệu — 24/10/2026

Phạm vi: code nền c1d8603 và bản sửa tại đợt này; đối chiếu sơ đồ HTML người dùng cung cấp. Kiểm thử bằng bộ giả lập Apps Script và Edge, không ghi dữ liệu Google đang vận hành.

## Lỗi xác nhận và đã sửa

- **Form cũ tái tạo khách hàng đã xóa (hai phiên):** tạo khách hàng → xóa ở phiên A → phiên B gửi mã và expectedRevision cũ; trước sửa server tạo lại bản ghi với revision 1. Nay từ chối yêu cầu sửa bản ghi không còn tồn tại. Ca trước/sau nằm trong `chay_xoa_khach_hang`.
- Bản sửa đang chờ đưa lên main: thêm đường vào form bảo hiểm thủ công từ menu Cập nhật bảo hiểm; hộp thoại hủy trong app kèm lý do/phiên bản; xóa khách hàng chưa dùng với kiểm quyền và liên kết; màu bảng khách hàng theo theme.

## Điểm sơ đồ cần làm rõ

1. Ghi cha–con trên Sheets không phải transaction nguyên khối. Hồ sơ dùng nhật ký ghi dở và phục hồi; bảo hiểm ghi thế hệ mới, xác minh rồi chuyển bản cha.
2. Revision và khóa yêu cầu không áp dụng đồng nhất cho mọi API. Xem từng bảng trong phần tra cứu, tránh mô tả tất cả chức năng đều chống ghi đè giống nhau.
3. Tạo bộ chứng từ không đồng nghĩa giải ngân thực tế. Dư nợ phải đối chiếu xác nhận giải ngân, trả nợ và ngày báo cáo.
4. Kiểm tra quan hệ không sửa dữ liệu nghiệp vụ nhưng có thể ghi nhật ký kiểm tra. Đã sửa mô tả tuyệt đối “không ghi Sheet” trong tài liệu sinh tự động.

## Menu Luồng dữ liệu

- Menu riêng trong nhóm Hệ thống: 6 bước nghiệp vụ, nhánh tài sản/bảo hiểm và 22 bảng của SO_DO_DU_LIEU_. Đây là các bảng được mô tả trong schema hiện tại, không phải tuyên bố bao phủ mọi sheet nội bộ.
- `LuongDuLieu.html` sinh bằng `node tools/sinh_menu_luong.cjs`; test `--kiem` ngăn schema và giao diện lệch nhau. Không nhúng script/font bên ngoài từ file sơ đồ đính kèm.
- Menu không gọi API dữ liệu; dùng màu theme và bố cục đáp ứng màn hình nhỏ.

## Kiểm chứng

- Chạy 83 bộ: 80 đạt ngay; 3 cần cập nhật fixture menu/hộp thoại và chờ requestAnimationFrame đúng thời điểm. Ba bộ này đã chạy lại đạt, giữ nguyên kiểm tra nghiệp vụ.
- Kiểm tra lại riêng lỗi xóa/sửa khách hàng và chống ghi đè: đạt.
- Menu mới: điều hướng, 22 bảng, sáng/tối ở 360 và 1280 px, không lỗi JavaScript hoặc tràn ngang: đạt.
- Kiểm tra cú pháp và git diff --check: đạt. Bộ phân tích tĩnh vẫn cảnh báo file dài; bản sao bàn giao cục bộ gây thêm cảnh báo trùng file.
- TC30 (hồi quy tài liệu/PDF đệ quy cần môi trường đầy đủ) được runner bỏ qua. Chưa kiểm chứng quota OCR, quyền Drive, mẫu thực tế hay tính toàn vẹn dữ liệu Google thật trong đợt này.

## Rủi ro / việc nên làm tiếp

- Khách hàng cũ được liên hệ với chi tiết thụ hưởng/bảo hiểm bằng tên và tài khoản ở một số luồng, chưa hoàn toàn bằng mã FK. Quy tắc xóa hiện chặn bảo thủ để giữ lịch sử; không tự gộp khách trùng tên. Muốn chuẩn hóa mã cần đối soát và kế hoạch chuyển dữ liệu riêng.
- Các file DataService.gs, JavaScript.html, Index.html còn lớn. Có thể tách theo phân hệ trong đợt riêng, kèm hồi quy; không trộn refactor lớn vào sửa lỗi nhập liệu này.
- Trên môi trường thật, quản trị chạy kiểm tra quan hệ/đối soát để phát hiện bản ghi mồ côi, trùng mã, dư nợ lệch hoặc thế hệ bảo hiểm thiếu. Kết quả giả lập không chứng minh dữ liệu vận hành sạch.

Phương pháp áp dụng: [hak-data-integrity](https://github.com/saoluucvhak-pixel/HAK_AI_SKILLS/blob/main/skills/hak-data-integrity/SKILL.md) và [hak-parent-child-data-model](https://github.com/saoluucvhak-pixel/HAK_AI_SKILLS/blob/main/skills/hak-parent-child-data-model/SKILL.md).
