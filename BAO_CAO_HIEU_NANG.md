# BÁO CÁO HIỆU NĂNG THEO QUY MÔ DỮ LIỆU

> **Môi trường:** dịch vụ Apps Script GIẢ LẬP (Node). Cột "ms" là **thời gian CPU của Node**, KHÔNG phải độ trễ Google Sheets/Drive thật. Các cột "lần đọc/ô đọc" phản ánh KHỐI LƯỢNG truy cập Sheets (đo được, so sánh tương đối giữa các quy mô). **Chưa có số đo trên Google Apps Script thật** — không được kết luận hệ thống "đạt hiệu năng" trên môi trường thật từ báo cáo này.

## 100 hồ sơ (+ 200 dòng chi tiết)

| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | lần ghi range | ô ghi | kết quả |
|---|---:|---:|---:|---:|---:|---|
| Tải danh sách (layDuLieuKhoiTao, bỏ qua cache) | 41.2 | 4 | 4.018 | 0 | 0 | OK |
| Tải danh sách (layDuLieuKhoiTao, cache danh mục) | 20.9 | 4 | 4.018 | 0 | 0 | OK |
| Tìm kiếm/lọc hồ sơ (locDanhSachHoSo) | 8.3 | 4 | 7.225 | 0 | 0 | OK |
| Mở một hồ sơ (layDuLieuDayDu) | 1.2 | 8 | 496 | 0 | 0 | OK |
| Lưu sửa một hồ sơ (luuHoSoGiaiNgan) | 22.8 | 27 | 8.671 | 7 | 3.121 | OK |
| Báo cáo tiền vay (layBaoCaoTienVay) | 17 | 3 | 7.195 | 0 | 0 | OK |
| Báo cáo đối soát (layBaoCaoDoiSoat) | 19.5 | 6 | 7.270 | 0 | 0 | OK |

## 1.000 hồ sơ (+ 2.000 dòng chi tiết)

| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | lần ghi range | ô ghi | kết quả |
|---|---:|---:|---:|---:|---:|---|
| Tải danh sách (layDuLieuKhoiTao, bỏ qua cache) | 198.4 | 5 | 40.118 | 0 | 0 | OK |
| Tải danh sách (layDuLieuKhoiTao, cache danh mục) | 172.5 | 5 | 40.118 | 0 | 0 | OK |
| Tìm kiếm/lọc hồ sơ (locDanhSachHoSo) | 72.3 | 6 | 74.125 | 0 | 0 | OK |
| Mở một hồ sơ (layDuLieuDayDu) | 1.5 | 8 | 3.196 | 0 | 0 | OK |
| Lưu sửa một hồ sơ (luuHoSoGiaiNgan) | 5.3 | 24 | 10.476 | 6 | 106 | OK |
| Báo cáo tiền vay (layBaoCaoTienVay) | 180.6 | 5 | 74.095 | 0 | 0 | OK |
| Báo cáo đối soát (layBaoCaoDoiSoat) | 59.9 | 8 | 74.170 | 0 | 0 | OK |

## 5.000 hồ sơ (+ 10.000 dòng chi tiết)

| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | lần ghi range | ô ghi | kết quả |
|---|---:|---:|---:|---:|---:|---|
| Tải danh sách (layDuLieuKhoiTao, bỏ qua cache) | 975.6 | 5 | 200.118 | 0 | 0 | OK |
| Tải danh sách (layDuLieuKhoiTao, cache danh mục) | 929.2 | 5 | 200.118 | 0 | 0 | OK |
| Tìm kiếm/lọc hồ sơ (locDanhSachHoSo) | 340.3 | 6 | 370.125 | 0 | 0 | OK |
| Mở một hồ sơ (layDuLieuDayDu) | 5.3 | 8 | 15.196 | 0 | 0 | OK |
| Lưu sửa một hồ sơ (luuHoSoGiaiNgan) | 57.3 | 24 | 50.476 | 6 | 106 | OK |
| Báo cáo tiền vay (layBaoCaoTienVay) | 826.9 | 5 | 370.095 | 0 | 0 | OK |
| Báo cáo đối soát (layBaoCaoDoiSoat) | 254.9 | 8 | 370.170 | 0 | 0 | OK |

## 10.000 hồ sơ (+ 20.000 dòng chi tiết)

| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | lần ghi range | ô ghi | kết quả |
|---|---:|---:|---:|---:|---:|---|
| Tải danh sách (layDuLieuKhoiTao, bỏ qua cache) | 1894.5 | 5 | 400.118 | 0 | 0 | OK |
| Tải danh sách (layDuLieuKhoiTao, cache danh mục) | 2093.7 | 5 | 400.118 | 0 | 0 | OK |
| Tìm kiếm/lọc hồ sơ (locDanhSachHoSo) | 648.7 | 6 | 740.125 | 0 | 0 | OK |
| Mở một hồ sơ (layDuLieuDayDu) | 10.6 | 8 | 30.196 | 0 | 0 | OK |
| Lưu sửa một hồ sơ (luuHoSoGiaiNgan) | 113.1 | 24 | 100.476 | 6 | 106 | OK |
| Báo cáo tiền vay (layBaoCaoTienVay) | 1405.4 | 5 | 740.095 | 0 | 0 | OK |
| Báo cáo đối soát (layBaoCaoDoiSoat) | 282.5 | 8 | 740.170 | 0 | 0 | OK |

