# BÁO CÁO ĐỐI CHIẾU TỐC ĐỘ TRƯỚC / SAU NÂNG CẤP (PHÂN TRANG MÁY CHỦ + CHỈ MỤC CACHE + ĐỌC CÓ CHỌN LỌC)

> **Môi trường: dịch vụ Apps Script/Sheets GIẢ LẬP (Node).** Cột **ms = thời gian CPU của Node** (trung vị 5 lần), KHÔNG phải độ trễ Google thật. Các cột **lần đọc / ô đọc / KB gửi trình duyệt** là khối lượng thật phải đi qua Google Sheets và mạng — đây mới là chỉ số đáng tin để so sánh trước/sau. **Chưa đo trên Google Apps Script thật nên chưa thể kết luận các chỉ tiêu 2 giây / 3 giây đã đạt hay chưa.** "Trước" = mã `main` ngay trước nâng cấp; "Sau" = mã mới; cùng dữ liệu, cùng kịch bản.

"Cache nóng" = chỉ mục cache còn hiệu lực; "cache lạnh" = ngay sau khi dữ liệu vừa đổi (revision mới → phải đọc lại Sheets một lần) hoặc cache bị mất.

## 100 hồ sơ (200 dòng chi tiết)

| Thao tác | Lần đọc trước→sau | Ô đọc trước→sau | KB về trình duyệt trước→sau | CPU ms trước→sau | Δ ô đọc | Δ KB | Δ ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1. Mở WebApp và hiện danh sách hồ sơ (lần đầu/cache lạnh) | 8 → 4 | 11.363 → 4.078 | 108,9 → 21,3 | 42,7 → 8 | −64% | −80% | −81% |
| 1b. Mở WebApp và hiện danh sách hồ sơ (cache nóng) | 5 → 0 | 11.224 → 0 | 108,9 → 21,3 | 42,2 → 5,1 | −100% | −80% | −88% |
| 2. Tìm kiếm một hồ sơ theo mã — cache nóng | 4 → 0 | 7.285 → 0 | 0,2 → 0,5 | 0,9 → 0,7 | −100% | +150% | −22% |
| 2. Tìm kiếm một hồ sơ theo mã — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 4 → 3 | 7.285 → 4.069 | 0,2 → 0,5 | 0,8 → 1,9 | −44% | +150% | +137% |
| 3. Lọc: USD + khoảng ngày giải ngân (trang 1) — cache nóng | 4 → 0 | 7.285 → 0 | 1,5 → 2,4 | 1,1 → 0,7 | −100% | +60% | −36% |
| 3. Lọc: USD + khoảng ngày giải ngân (trang 1) — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 4 → 3 | 7.285 → 4.069 | 1,5 → 2,4 | 1,1 → 1,9 | −44% | +60% | +73% |
| 4. Chuyển sang trang 2 — cache nóng | 0 → 0 | 0 → 0 | 0 → 16 | 0 → 3,1 | — | +∞ | +∞ |
| 4. Chuyển sang trang 2 — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 0 → 3 | 0 → 4.069 | 0 → 16 | 0 → 5,5 | +∞ | +∞ | +∞ |
| 5. Mở chi tiết một hồ sơ | 8 → 8 | 556 → 556 | 2,2 → 2,2 | 0,6 → 1,2 | 0% | 0% | +100% |
| 6. Lưu một hồ sơ mới (2 dòng thụ hưởng) | 19 → 20 | 11.786 → 8.575 | 0,1 → 0,1 | 24,8 → 25,2 | −27% | 0% | +2% |
| 7. Làm mới danh sách sau khi lưu — cache nóng | 5 → 0 | 11.774 → 0 | 112,3 → 18,9 | 45,3 → 4,6 | −100% | −83% | −90% |
| 7. Làm mới danh sách sau khi lưu — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 5 → 3 | 11.774 → 4.264 | 112,3 → 18,9 | 40,5 → 5,3 | −64% | −83% | −87% |

## 1.000 hồ sơ (2.000 dòng chi tiết)

| Thao tác | Lần đọc trước→sau | Ô đọc trước→sau | KB về trình duyệt trước→sau | CPU ms trước→sau | Δ ô đọc | Δ KB | Δ ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1. Mở WebApp và hiện danh sách hồ sơ (lần đầu/cache lạnh) | 11 → 5 | 114.363 → 40.178 | 1.069,6 → 21,5 | 444,7 → 20,6 | −65% | −98% | −95% |
| 1b. Mở WebApp và hiện danh sách hồ sơ (cache nóng) | 8 → 0 | 114.224 → 0 | 1.069,6 → 21,5 | 389,2 → 7,8 | −100% | −98% | −98% |
| 2. Tìm kiếm một hồ sơ theo mã — cache nóng | 6 → 0 | 74.185 → 0 | 0,2 → 0,5 | 8,3 → 3,7 | −100% | +150% | −55% |
| 2. Tìm kiếm một hồ sơ theo mã — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 6 → 4 | 74.185 → 40.169 | 0,2 → 0,5 | 5,4 → 11,3 | −46% | +150% | +109% |
| 3. Lọc: USD + khoảng ngày giải ngân (trang 1) — cache nóng | 6 → 0 | 74.185 → 0 | 14,3 → 16,1 | 9,6 → 5,1 | −100% | +13% | −47% |
| 3. Lọc: USD + khoảng ngày giải ngân (trang 1) — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 6 → 4 | 74.185 → 40.169 | 14,3 → 16,1 | 11,9 → 12 | −46% | +13% | +1% |
| 4. Chuyển sang trang 2 — cache nóng | 0 → 0 | 0 → 0 | 0 → 16,1 | 0 → 5,5 | — | +∞ | +∞ |
| 4. Chuyển sang trang 2 — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 0 → 4 | 0 → 40.169 | 0 → 16,1 | 0 → 11,6 | +∞ | +∞ | +∞ |
| 5. Mở chi tiết một hồ sơ | 8 → 8 | 3.256 → 3.256 | 2,2 → 2,2 | 1,6 → 1,4 | 0% | 0% | −13% |
| 6. Lưu một hồ sơ mới (2 dòng thụ hưởng) | 22 → 17 | 114.531 → 8.196 | 0,1 → 0,1 | 281,5 → 2,6 | −93% | 0% | −99% |
| 7. Làm mới danh sách sau khi lưu — cache nóng | 8 → 0 | 114.794 → 0 | 1.072,9 → 19,1 | 466,7 → 6,3 | −100% | −98% | −99% |
| 7. Làm mới danh sách sau khi lưu — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 8 → 4 | 114.794 → 40.369 | 1.072,9 → 19,1 | 457,2 → 13,9 | −65% | −98% | −97% |

## 5.000 hồ sơ (10.000 dòng chi tiết)

| Thao tác | Lần đọc trước→sau | Ô đọc trước→sau | KB về trình duyệt trước→sau | CPU ms trước→sau | Δ ô đọc | Δ KB | Δ ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1. Mở WebApp và hiện danh sách hồ sơ (lần đầu/cache lạnh) | 11 → 5 | 570.363 → 200.178 | 5.354,7 → 21,4 | 2.071,4 → 61,9 | −65% | −100% | −97% |
| 1b. Mở WebApp và hiện danh sách hồ sơ (cache nóng) | 8 → 0 | 570.224 → 0 | 5.354,7 → 21,4 | 2.182,2 → 20,5 | −100% | −100% | −99% |
| 2. Tìm kiếm một hồ sơ theo mã — cache nóng | 6 → 0 | 370.185 → 0 | 0,2 → 0,5 | 27,8 → 14,6 | −100% | +150% | −47% |
| 2. Tìm kiếm một hồ sơ theo mã — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 6 → 4 | 370.185 → 200.169 | 0,2 → 0,5 | 29 → 49,3 | −46% | +150% | +70% |
| 3. Lọc: USD + khoảng ngày giải ngân (trang 1) — cache nóng | 6 → 0 | 370.185 → 0 | 71,8 → 16,4 | 59,5 → 8 | −100% | −77% | −87% |
| 3. Lọc: USD + khoảng ngày giải ngân (trang 1) — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 6 → 4 | 370.185 → 200.169 | 71,8 → 16,4 | 64,1 → 44,4 | −46% | −77% | −31% |
| 4. Chuyển sang trang 2 — cache nóng | 0 → 0 | 0 → 0 | 0 → 16,2 | 0 → 11,6 | — | +∞ | +∞ |
| 4. Chuyển sang trang 2 — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 0 → 4 | 0 → 200.169 | 0 → 16,2 | 0 → 40,7 | +∞ | +∞ | +∞ |
| 5. Mở chi tiết một hồ sơ | 8 → 8 | 15.256 → 15.256 | 2,2 → 2,2 | 5,6 → 5,1 | 0% | 0% | −9% |
| 6. Lưu một hồ sơ mới (2 dòng thụ hưởng) | 22 → 17 | 570.657 → 40.196 | 0,1 → 0,1 | 1.120 → 11 | −93% | 0% | −99% |
| 7. Làm mới danh sách sau khi lưu — cache nóng | 8 → 0 | 570.794 → 0 | 5.358,1 → 19,1 | 2.159,9 → 17,5 | −100% | −100% | −99% |
| 7. Làm mới danh sách sau khi lưu — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 8 → 4 | 570.794 → 200.369 | 5.358,1 → 19,1 | 2.106,2 → 55 | −65% | −100% | −97% |

## 10.000 hồ sơ (20.000 dòng chi tiết)

| Thao tác | Lần đọc trước→sau | Ô đọc trước→sau | KB về trình duyệt trước→sau | CPU ms trước→sau | Δ ô đọc | Δ KB | Δ ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1. Mở WebApp và hiện danh sách hồ sơ (lần đầu/cache lạnh) | 11 → 5 | 1.140.363 → 400.178 | 10.711,2 → 21,4 | 4.398,4 → 110,4 | −65% | −100% | −97% |
| 1b. Mở WebApp và hiện danh sách hồ sơ (cache nóng) | 8 → 0 | 1.140.224 → 0 | 10.711,2 → 21,4 | 4.289,5 → 45,1 | −100% | −100% | −99% |
| 2. Tìm kiếm một hồ sơ theo mã — cache nóng | 6 → 0 | 740.185 → 0 | 0,2 → 0,5 | 61,9 → 36,4 | −100% | +150% | −41% |
| 2. Tìm kiếm một hồ sơ theo mã — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 6 → 4 | 740.185 → 400.169 | 0,2 → 0,5 | 54 → 99,2 | −46% | +150% | +84% |
| 3. Lọc: USD + khoảng ngày giải ngân (trang 1) — cache nóng | 6 → 0 | 740.185 → 0 | 143,5 → 16,4 | 120,8 → 15,9 | −100% | −89% | −87% |
| 3. Lọc: USD + khoảng ngày giải ngân (trang 1) — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 6 → 4 | 740.185 → 400.169 | 143,5 → 16,4 | 130,7 → 80,7 | −46% | −89% | −38% |
| 4. Chuyển sang trang 2 — cache nóng | 0 → 0 | 0 → 0 | 0 → 16,1 | 0 → 20,5 | — | +∞ | +∞ |
| 4. Chuyển sang trang 2 — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 0 → 4 | 0 → 400.169 | 0 → 16,1 | 0 → 86,2 | +∞ | +∞ | +∞ |
| 5. Mở chi tiết một hồ sơ | 8 → 8 | 30.256 → 30.256 | 2,2 → 2,2 | 10,4 → 10,4 | 0% | 0% | 0% |
| 6. Lưu một hồ sơ mới (2 dòng thụ hưởng) | 22 → 17 | 1.140.909 → 80.256 | 0,1 → 0,1 | 2.311,3 → 18,3 | −93% | 0% | −99% |
| 7. Làm mới danh sách sau khi lưu — cache nóng | 8 → 0 | 1.140.794 → 0 | 10.714,5 → 19,1 | 4.342,3 → 32,7 | −100% | −100% | −99% |
| 7. Làm mới danh sách sau khi lưu — cache lạnh (ngay sau khi dữ liệu vừa đổi) | 8 → 4 | 1.140.794 → 400.369 | 10.714,5 → 19,1 | 4.196,2 → 96,1 | −65% | −100% | −98% |

## Đọc kết quả (trung thực)
- **Mở WebApp, làm mới danh sách:** trình duyệt không còn tải cả danh sách hồ sơ (10.000 hồ sơ ≈ 10,7 MB JSON → ≈ 21 KB cho 50 dòng + tổng quan). Đây là cải thiện lớn nhất và không phụ thuộc môi trường giả lập.
- **Cache nóng:** tìm kiếm, lọc, chuyển trang không đọc Sheets (0 ô). **Cache lạnh** (sau mỗi lần ghi): đọc Sheets MỘT lần để dựng chỉ mục — ngang chi phí cũ cho MỘT lần đọc danh sách, nhưng sau đó mọi trang/lọc/tìm kiếm tiếp theo đều dùng chỉ mục.
- **Chuyển trang:** mã cũ cắt trang ở trình duyệt (không gọi máy chủ, nhưng phải tải trước toàn bộ). Mã mới gọi máy chủ mỗi lần chuyển trang (≈ 16 KB, cache nóng không đọc Sheets) — **chậm hơn về độ trễ mạng mỗi lần bấm**, đổi lại không phải tải trước toàn bộ.
- **Mở chi tiết:** không đổi (đã tối ưu ở đợt trước).
- **Lưu hồ sơ:** số ô đọc giảm mạnh nhờ bỏ đọc cả sheet để tìm khoá yêu cầu và sao lưu chi tiết cũ; sheet báo cáo nháp BaoCaoTienVay_Draft chỉ dựng lại sau mỗi lần lưu khi dữ liệu ≤ 1.000 dòng chi tiết. Xem các dòng "6. Lưu".
- Chỉ mục cache có TTL 5 phút: dữ liệu sửa TRỰC TIẾP trên Google Sheets (ngoài WebApp) có thể hiển thị chậm tới 5 phút hoặc khi bấm làm mới.
