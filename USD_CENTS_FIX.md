# USD có cent — 18/10/2026

Theo yêu cầu nhập liệu: VND vẫn là số nguyên; USD nhận tối đa 2 chữ số thập phân. Nhập 25000.50, 25000,50 hoặc 25.000,50 đều là 25000.50 USD. Dấu chấm ba chữ số vẫn được hiểu là nhóm nghìn theo cách hiển thị cũ (25.000 = 25000). Không hỗ trợ chuỗi nhóm nghìn kiểu Mỹ 25,000.50.

Tổng USD tính bằng cent; quy đổi mỗi dòng sang VND làm tròn nửa lên từ tích chính xác với tỷ giá. Tổng quy đổi là tổng từng dòng, có thể khác phép quy đổi một lần trên tổng USD. Lưu/mở lại/sửa, đọc bằng chữ, kiểm tra phát hành, xác nhận/điều chỉnh, đối soát và báo cáo dùng cùng quy tắc. Các ô placeholder tiền trong mẫu XLSX chứa phần cent được giữ dạng số, sao chép kiểu ô và dùng định dạng 2 số thập phân.

Kiểm thử mới: kiem_thu/chay_usd_cent.js; có trong npm test và bộ đầy đủ. Ca lịch sử không hợp lệ được đổi sang USD quá 2 số thập phân; vẫn kiểm tra giữ nguyên dữ liệu cũ, chặn lưu sai và quy đổi VND có phần lẻ. Kiểm thử giao diện có ca gõ dấu chấm, rời ô, cộng 0.10 + 0.20 và mở lại cent hợp lệ.

Đã kiểm tra trên bản Google TEST riêng bằng dữ liệu giả lập: nhập hai dạng dấu, lưu, đọc Sheet, mở lại và chặn 3 chữ số thập phân. Không triển khai production trong đợt sửa này. Bằng chứng Google riêng tư được bàn giao ngoài repository.
