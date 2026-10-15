# BÁO CÁO HIỆU NĂNG THEO QUY MÔ DỮ LIỆU

> **Môi trường:** dịch vụ Apps Script GIẢ LẬP (Node). Cột "ms" là **thời gian CPU của Node**, KHÔNG phải độ trễ Google Sheets/Drive thật. Các cột "lần đọc/ô đọc" phản ánh KHỐI LƯỢNG truy cập Sheets (đo được, so sánh tương đối giữa các quy mô). **Chưa có số đo trên Google Apps Script thật** — không được kết luận hệ thống "đạt hiệu năng" trên môi trường thật từ báo cáo này.

## 100 hồ sơ (+ 200 dòng chi tiết)

| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | lần ghi range | ô ghi | kết quả |
|---|---:|---:|---:|---:|---:|---|
| Tải danh sách (layDuLieuKhoiTao, bỏ qua cache) | 49.9 | 4 | 4.018 | 0 | 0 | OK |
| Tải danh sách (layDuLieuKhoiTao, cache danh mục) | 34.1 | 4 | 4.018 | 0 | 0 | OK |
| Tìm kiếm/lọc hồ sơ (locDanhSachHoSo) | 7.6 | 4 | 7.225 | 0 | 0 | OK |
| Mở một hồ sơ (layDuLieuDayDu) | 1 | 8 | 496 | 0 | 0 | OK |
| Lưu sửa một hồ sơ (luuHoSoGiaiNgan) | 22.4 | 25 | 11.639 | 7 | 3.121 | OK |
| Báo cáo tiền vay (layBaoCaoTienVay) | 16.9 | 3 | 7.195 | 0 | 0 | OK |
| Báo cáo đối soát (layBaoCaoDoiSoat) | 21.2 | 6 | 7.270 | 0 | 0 | OK |

## 1.000 hồ sơ (+ 2.000 dòng chi tiết)

| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | lần ghi range | ô ghi | kết quả |
|---|---:|---:|---:|---:|---:|---|
| Tải danh sách (layDuLieuKhoiTao, bỏ qua cache) | 292.7 | 5 | 40.118 | 0 | 0 | OK |
| Tải danh sách (layDuLieuKhoiTao, cache danh mục) | 300.3 | 5 | 40.118 | 0 | 0 | OK |
| Tìm kiếm/lọc hồ sơ (locDanhSachHoSo) | 134.3 | 6 | 74.125 | 0 | 0 | OK |
| Mở một hồ sơ (layDuLieuDayDu) | 3.1 | 8 | 3.196 | 0 | 0 | OK |
| Lưu sửa một hồ sơ (luuHoSoGiaiNgan) | 192.1 | 28 | 116.539 | 7 | 30.121 | OK |
| Báo cáo tiền vay (layBaoCaoTienVay) | 233.9 | 5 | 74.095 | 0 | 0 | OK |
| Báo cáo đối soát (layBaoCaoDoiSoat) | 90.1 | 8 | 74.170 | 0 | 0 | OK |

## 5.000 hồ sơ (+ 10.000 dòng chi tiết)

| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | lần ghi range | ô ghi | kết quả |
|---|---:|---:|---:|---:|---:|---|
| Tải danh sách (layDuLieuKhoiTao, bỏ qua cache) | 1180.5 | 5 | 200.118 | 0 | 0 | OK |
| Tải danh sách (layDuLieuKhoiTao, cache danh mục) | 1100.1 | 5 | 200.118 | 0 | 0 | OK |
| Tìm kiếm/lọc hồ sơ (locDanhSachHoSo) | 368.9 | 6 | 370.125 | 0 | 0 | OK |
| Mở một hồ sơ (layDuLieuDayDu) | 5.8 | 8 | 15.196 | 0 | 0 | OK |
| Lưu sửa một hồ sơ (luuHoSoGiaiNgan) | 1013.3 | 28 | 580.539 | 7 | 150.121 | OK |
| Báo cáo tiền vay (layBaoCaoTienVay) | 1044.3 | 5 | 370.095 | 0 | 0 | OK |
| Báo cáo đối soát (layBaoCaoDoiSoat) | 247.3 | 8 | 370.170 | 0 | 0 | OK |

## 10.000 hồ sơ (+ 20.000 dòng chi tiết)

| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | lần ghi range | ô ghi | kết quả |
|---|---:|---:|---:|---:|---:|---|
| Tải danh sách (layDuLieuKhoiTao, bỏ qua cache) | 2218 | 5 | 400.118 | 0 | 0 | OK |
| Tải danh sách (layDuLieuKhoiTao, cache danh mục) | 1890.3 | 5 | 400.118 | 0 | 0 | OK |
| Tìm kiếm/lọc hồ sơ (locDanhSachHoSo) | 756.2 | 6 | 740.125 | 0 | 0 | OK |
| Mở một hồ sơ (layDuLieuDayDu) | 83.2 | 8 | 30.196 | 0 | 0 | OK |
| Lưu sửa một hồ sơ (luuHoSoGiaiNgan) | 2563.6 | 28 | 1.160.539 | 7 | 300.121 | OK |
| Báo cáo tiền vay (layBaoCaoTienVay) | 1765.6 | 5 | 740.095 | 0 | 0 | OK |
| Báo cáo đối soát (layBaoCaoDoiSoat) | 308.5 | 8 | 740.170 | 0 | 0 | OK |

