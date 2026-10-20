# Menu So sánh vay USD / VND — 20/10/2026

## Sử dụng
Mở menu So sánh USD / VND. Các số 15 tỷ, 6 tháng, lãi VND 7%, USD 4,2%, MUA 25.820 và BÁN 25.890 là ví dụ từ yêu cầu, không phải số liệu doanh nghiệp đã xác nhận hay báo giá thị trường hiện tại. Thay thông số và bấm Tính so sánh. Đổi thông số sẽ ẩn kết quả cũ và khóa xuất/in đến khi tính lại.

Có bảng tiền giải ngân/đáo hạn, bốn kịch bản BÁN đi ngang/+1,5%/hòa vốn/+3,5%, chi phí trước/sau thuế, điểm hòa vốn trước/sau thuế và phần USD còn phải mua theo nguồn thu. Có CSV và In/Lưu PDF. Dùng quy ước số/ngày đã chọn trong app; CSV lưu số chuẩn dấu chấm thập phân, không ngăn hàng nghìn và kèm đầu vào để tái lập tính toán.

## Quy tắc tính
- Gốc USD = ceil(Nhu cầu VND / MUA × 100) / 100, dùng số học BigInt/phân số khi chia và làm tròn. Không lấy tỷ giá BÁN để tính gốc.
- USD dư làm tròn được bán cùng khoản vay; phần VND dư được giữ lại không tính lãi và bù vào dòng tiền đáo hạn để so sánh cùng lượng vốn sử dụng.
- Lãi đơn, dư nợ không đổi; gốc và lãi trả cuối kỳ; chọn tháng/12 hoặc số ngày/360 hay /365. USD interest làm tròn nửa lên đến cent, VND đến đồng. Chưa có phí, bảo hiểm, trả nợ định kỳ, lãi suất thả nổi, chi phí bảo đảm hoặc phòng hộ.
- Mốc tăng tỷ giá là BÁN ban đầu. Cần mua cả gốc + lãi USD. Hòa vốn trước thuế = (Nhu cầu VND + lãi VND + VND dư ban đầu)/(gốc USD + lãi USD).
- Chi phí USD kinh tế = lãi USD × BÁN đáo hạn + gốc USD × (BÁN đáo hạn − MUA giải ngân).
- Thuế suất và tỷ lệ lãi/lỗ FX được trừ là giả định có thể chỉnh. Gốc vay không phải chi phí được trừ. Lãi tỷ giá được xét là thu nhập chịu thuế trong mô hình, không coi là chi phí âm được khấu trừ tùy ý. Hòa vốn sau thuế giải riêng theo miền lỗ/lãi FX.
- Việc sử dụng tác động thuế trong kỳ là giả định; không trừ lá chắn thuế khỏi nghĩa vụ ngân hàng thực thu. Chi phí kinh tế gộp không thay bảng hạch toán thuế theo tỷ giá ghi sổ, đánh giá lại, phân kỳ, ưu đãi và giới hạn lãi vay/giao dịch liên kết.
- USD tự có chỉ giảm nhu cầu mua thêm, không làm USD thành nguồn tiền miễn phí. So sánh chuẩn vẫn quy đổi toàn bộ nghĩa vụ theo BÁN; chưa có MUA đáo hạn để đánh giá cơ hội bán/giữ thu USD. Không cộng tiền USD tự có hai lần.
- Vay ngoại tệ cần ngân hàng xác nhận mục đích và điều kiện. Có doanh thu USD không đồng nghĩa tự động được vay USD; doanh nghiệp chỉ thu VND cũng không đương nhiên được vay USD.

## Ví dụ độc lập
Python Decimal ROUND_CEILING / ROUND_HALF_UP cho 15 tỷ / 6 tháng / 7% / 4,2% / 25.820 / 25.890:
- Gốc USD: 580.945,01; lãi USD: 12.199,85; tổng trả: 593.144,86 USD.
- Lãi VND: 525.000.000 VND; VND dư giải ngân: 158,20 VND.
- BÁN hòa vốn: 26.174,044833162678 VND/USD; tăng 1,0971217967% từ BÁN ban đầu.
- USD tiết kiệm trước thuế: đi ngang +168.479.732,80 VND; tăng 1,5% −61.868.073,581 VND; hòa vốn 0; tăng 3,5% −368.998.482,089 VND.
- Với thuế giả định 20%, toàn bộ lãi/lỗ được trừ và sử dụng tác động thuế trong kỳ, chênh lệch chi phí giảm còn 80%; hòa vốn không đổi đáng kể.

## Nguồn pháp lý tham chiếu
- Luật TNDN 67/2025/QH15: https://congbao.chinhphu.vn/van-ban/luat-so-67-2025-qh15-45557/57755.htm
- Nghị định 320/2025/NĐ-CP: https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/12/320-ndcp.signed.pdf
- Cổng Chính phủ, xử lý chênh lệch tỷ giá: https://xaydungchinhsach.chinhphu.vn/quy-dinh-moi-cac-khoan-thu-nhap-chiu-thue-thu-nhap-doanh-nghiep-119251218130422285.htm
- Thông tư 42/2018 sửa đổi điều kiện vay ngoại tệ: https://vbpl.moj.gov.vn/nganhangnhanuoc/Pages/vbpq-toanvan.aspx?ItemID=132831
Các nguồn dùng để nêu điều kiện cần kiểm tra, không tự động xác nhận nghĩa vụ thuế/đủ điều kiện tín dụng. Cần đối chiếu sửa đổi hiện hành, đặc điểm doanh nghiệp và hồ sơ tại thời điểm giao dịch.

## Kiểm chứng
212 kiểm tra mô hình; 24 kiểm tra UI riêng; 310 kiểm tra giao diện màu; 186 kiểm tra hồi quy giao diện chung; 16 nhóm portable đạt. PDF ví dụ 3 trang đã render và xem từng trang. Kiểm thử không dùng hồ sơ thật, không gọi API Google hoặc thay kho dữ liệu nghiệp vụ khi tính.

## Cài đặt
Thêm SoSanhVay.html. Thay Index.html, JavaScript.html và Stylesheet.html bằng bản mới. Nếu chưa cập nhật các đợt trước, dùng bộ Code_Copy đầy đủ (gồm GiaoDien.html, DinhDang.gs...). Giữ ID Sheet/Drive của dự án đang dùng, tránh tạo trùng khai báo. Lưu và triển khai phiên bản mới. GitHub không tự triển khai sang Apps Script. Không cần tải lại mẫu Word/Excel.
