# BÁO CÁO NÂNG CẤP HIỆU SUẤT & GIAO DIỆN — HOSOVAY_HAK
Nhánh `claude/phan-trang-hieu-nang` (từ `main` @ `d40bf5c`). **Mọi số đo và kiểm thử ở đây chạy trên Apps Script/Sheets GIẢ LẬP; chưa có số đo hay kiểm thử nào trên Google Apps Script/Sheets/Drive thật, chưa có staging.** Các chỉ tiêu 2 s / 3 s / 1,5 s **chưa thể kết luận đạt hay không đạt** (xem mục 5).

## 1. Kiểm toán hiệu suất (baseline đo trên mã trước nâng cấp)
Luồng: Trình duyệt → `api()` → Apps Script → CacheService → Sheets. Bằng chứng đo (10.000 hồ sơ, 20.000 chi tiết):
| # | Vấn đề tìm thấy | Bằng chứng | Xử lý |
|---|---|---|---|
| 1 | Mở WebApp tải **toàn bộ hồ sơ** xuống trình duyệt (miền HOSO), rồi lọc/sắp xếp/phân trang ở trình duyệt | 10.711 KB JSON, 1,14 triệu ô đọc, mỗi lần làm mới sau khi lưu lặp lại | Phân trang phía máy chủ `layTrangHoSo`; Tổng quan tính ở máy chủ `layTongQuanHoSo`; trình duyệt chỉ giữ 1 trang |
| 2 | Lọc/tìm kiếm quét lại toàn bộ 4 sheet mỗi lần (`locDanhSachHoSo_`) | 740.185 ô/lần | Chỉ mục phụ gọn trong CacheService theo revision |
| 3 | Lưu hồ sơ đọc cả sheet hồ sơ + chi tiết để tìm khoá yêu cầu / sao lưu chi tiết cũ, rồi dựng lại sheet nháp `BaoCaoTienVay_Draft` (đọc + ghi toàn bộ) mỗi lần lưu | 1,14 triệu ô đọc, ≈ 2,3 s CPU | Đọc có chọn lọc theo cột (`docCacDongTheoCot_`); sheet nháp chỉ dựng lại sau mỗi lần lưu khi ≤ 1.000 dòng chi tiết |
| 4 | Đối soát O(N²), mở hồ sơ đọc cả sheet | (đợt trước, PR #5) | đã sửa ở PR #5 |
| 5 | Dựng chỉ mục dùng `Utilities.formatDate` cho từng ô ngày | 891 ms → 67 ms CPU ở 10.000 hồ sơ | dùng getter ngày theo múi giờ dự án (đã kiểm với TZ UTC / Hồ Chí Minh / Los Angeles) |
Không phát hiện trong các đường đã đo (danh sách, tìm kiếm, lọc, mở hồ sơ, lưu): `getRange()` đặt trong vòng lặp, hoặc LockService bao quanh thao tác chỉ đọc. (Chưa rà soát toàn bộ mọi hàm của hệ thống.)

## 2. API mới / được tối ưu
| API | Thay đổi |
|---|---|
| `layTrangHoSo(tuyChon)` (+ bí danh `getHoSoPage`) — **mới** | `{page, pageSize ∈ {20,50,100}, search, filters{trangThai[], loaiTien, maCty, maHD, tuNgay, denNgay, thieuNgay, tenNguoiHuong}, sortBy, sortDir, boQuaCache}` → `{success, data[], pagination{page,pageSize,totalRows,totalPages}, revision:"HOSO:n", revisionSo, tongTheoLoaiTien{VND,USD}, cache}`. Quyền XEM. Cột sắp xếp theo danh sách trắng. Trang vượt cuối → trả trang cuối. Hồ sơ thiếu ngày không mặc nhiên nằm trong khoảng ngày. Tổng tiền VND và USD tách riêng. Lọc theo phạm vi công ty khi cổng cấp phạm vi |
| `layTongQuanHoSo()` — **mới** | đếm theo trạng thái/loại tiền + 8 hồ sơ gần nhất; thay việc tải cả danh sách để vẽ Tổng quan |
| `lamMoiBaoCaoNhap()` — **mới** (Quản trị) + menu | dựng lại sheet nháp khi dữ liệu lớn |
| `layHoSoTheoMa_`, `layChiTietTheoHoSo_`, khoá yêu cầu, sao lưu chi tiết (trong `luuHoSoGiaiNgan`) | đọc có chọn lọc (1 cột + dòng cần) |
| `layDuLieuKhoiTao` | giữ nguyên (tương thích); **trình duyệt không còn yêu cầu miền HOSO** |
| `locDanhSachHoSo` | giữ nguyên cho nơi gọi cũ (danh sách theo hợp đồng) |
Hợp đồng/khách hàng/công ty: danh mục nhỏ (hàng chục dòng), đã cache theo revision → **không phân trang** (đánh giá: chi phí phân trang lớn hơn lợi ích). Lịch sử thao tác theo hồ sơ nhỏ, tải theo từng hồ sơ.

## 3. Chiến lược đọc Google Sheets (không giả định phân trang tự giảm quét)
Sheets không có chỉ mục: mỗi trang cần biết toàn bộ tập hồ sơ để lọc/sắp xếp/đếm. Vì vậy: (1) dựng **chỉ mục phụ** 12 trường/hồ sơ từ sheet (đọc 1 lần), chia mảnh < 80 KB lưu CacheService với khoá `…:HOSO_IDX:{revision}:{mảnh}` — **mọi lần ghi qua WebApp tăng revision nên chỉ mục cũ tự vô hiệu**; (2) thiếu một mảnh hoặc cache mất → dựng lại từ Sheets; (3) lọc/sắp xếp/cắt trang làm trong bộ nhớ; (4) chỉ lọc "người thụ hưởng" mới đọc thêm sheet chi tiết. **Giới hạn:** (a) lần đọc đầu sau mỗi lần ghi vẫn đọc cả sheet hồ sơ một lần (10.000 hồ sơ: 400.169 ô) — ở cache lạnh, tìm kiếm theo mã **chậm hơn** mã cũ (99 ms so với 54 ms CPU giả lập) vì dựng chỉ mục; (b) TTL 5 phút: dữ liệu sửa **trực tiếp trên Google Sheets** (không qua WebApp) hiển thị chậm tới 5 phút hoặc khi bấm "Làm mới"; (c) 10.000 hồ sơ ≈ 711 KB chỉ mục chia 10 mảnh — cần xác nhận hạn mức CacheService thật.

## 4. Giao diện
Đã làm: thanh công cụ (ô tìm kiếm debounce 400 ms, trạng thái, bộ lọc nâng cao thu gọn, chip điều kiện có ✕, "Xoá lọc", đếm điều kiện), phân trang (trước/sau/nhập số trang, 20/50/100 dòng, "hiển thị a–b / tổng", tổng tiền VND/USD tách riêng), tiêu đề bảng cố định, sắp xếp ở máy chủ, giữ bộ lọc khi xem chi tiết rồi quay lại, trạng thái rỗng/đang tải/lỗi, chống phản hồi cũ ghi đè (đã có `RequestCoordinator`). Tài liệu: `TAI_LIEU_DESIGN_SYSTEM.md`.
**Chưa làm (trung thực):** thiết kế lại toàn bộ màn hình theo design system mới; component bộ lọc dùng chung cho Hợp đồng/Khách hàng/Báo cáo; date picker riêng; dropdown có tìm kiếm; skeleton; kiểm WCAG và responsive trên thiết bị thật; ẩn/hiện nút theo từng quyền chi tiết. Modal cha–con: màn hình hồ sơ **đã có sẵn** 5 tab con trong cùng ngữ cảnh (không đổi); không thêm tab "Lịch giải ngân"/"Phụ lục" vì chưa có dữ liệu nghiệp vụ tương ứng.

## 5. Chỉ tiêu tham chiếu (A6) — trạng thái đo
| Thao tác | Mục tiêu | Số đo hiện có (GIẢ LẬP) | Kết luận |
|---|---|---|---|
| Tải 50 hồ sơ | ≤ 2 s | 10.000 hồ sơ: cache nóng 0 ô đọc, 21 KB; cache lạnh 400.178 ô, 21 KB | **Không kết luận** — cần đo thật |
| Tìm kiếm / lọc | ≤ 2 s | cache nóng 0 ô; lạnh 400.169 ô | Không kết luận |
| Mở chi tiết | ≤ 2 s | 30.256 ô, 8 lần đọc (không đổi) | Không kết luận |
| Lưu hồ sơ | ≤ 3 s | 80.256 ô, 17 lần đọc (trước 1.140.909 ô, 22 lần) | Không kết luận; ghi chú: một phần cải thiện do sheet nháp không còn dựng lại ở dữ liệu lớn |
| Chuyển trang / lọc | ≤ 1,5 s / ≤ 2 s | 16 KB/lần, nóng 0 ô | Không kết luận; mỗi lần chuyển trang nay có một lượt gọi máy chủ (mã cũ chuyển trang không gọi máy chủ nhưng phải tải trước tất cả) |
Một lượt `google.script.run` thường mất vài trăm ms tới hơn 1 s chỉ vì độ trễ nền tảng — con số CPU giả lập không phản ánh điều này. **Cần đo P50/P95 trên staging** (bảng ở `HUONG_DAN_MOI_TRUONG.md` mục 3).

## 6. Kiểm thử (GIẢ LẬP) — tất cả 19 stage `kiem_thu/chay_tat_ca.sh` đạt
Giao diện Chromium **119** (thêm: phân trang máy chủ, đổi cỡ trang, sắp xếp gửi đúng tham số, debounce chỉ 1 yêu cầu, chip/đếm/xoá lọc, giữ bộ lọc khi quay lại, trạng thái rỗng, tải trang không gọi API tải toàn bộ, đăng xuất xoá sạch store/bảng) · **`chay_phan_trang.js` 27**: cấu trúc phản hồi, 20/50/100, duyệt hết trang không trùng/sót, trang vượt cuối, sắp xếp ổn định, tìm kiếm không phân biệt dấu, lọc kết hợp, khoảng ngày + thiếu ngày, tổng VND/USD tách riêng, đối chiếu 237 dòng với Sheet 100%, khớp chi tiết hồ sơ, tổng quan, cache HIT/MISS/mất/thiếu mảnh, vô hiệu hoá sau lưu/xoá mềm/đổi trạng thái, quyền (XEM đọc được; lạ/ẩn danh bị chặn), phạm vi công ty, báo cáo nháp theo ngưỡng, tương thích API cũ · các bộ cũ vẫn đạt nguyên số lượng (49, 118, 102, 22, 29, 34, 54, 27, 51, 31, 8, 28). Không xoá test cũ; các test giao diện cũ gắn với hành vi phân trang ở trình duyệt được **viết lại** cho hành vi mới (ghi rõ trong lịch sử commit).
**Chưa chạy:** thử nghiệm tích hợp trên Google thật/staging, tải nhiều người dùng đồng thời, quota, mở DOCX bằng Word thật, ngắt mạng thật, thu hồi quyền Drive, token hết hạn thật.

## 7. Đối chiếu trước/sau
- Tốc độ & khối lượng đọc: `BAO_CAO_SO_SANH_TOC_DO.md` (4 quy mô × 12 thao tác, nóng/lạnh).
- Dữ liệu Google Sheets: `BAO_CAO_DOI_CHIEU_DU_LIEU.md` — 13 nghiệp vụ, chụp 7 sheet trước/sau từng bước, kiểm bất biến sau mỗi bước (0 lỗi), và **trạng thái Sheets cuối của mã cũ và mã mới giống hệt (0 ô khác)**; các thao tác chỉ đọc (kể cả `layTrangHoSo`) không đổi ô nào.
- Tái tạo: `bash kiem_thu/tao_bao_cao_truoc_sau.sh <ref_cũ>`.

## 8. File thay đổi
Mới: `PHANTRANG.gs`, `kiem_thu/chay_phan_trang.js`, `kiem_thu/so_sanh_toc_do.js`, `kiem_thu/doi_chieu_du_lieu.js`, `kiem_thu/tao_bao_cao_truoc_sau.sh`, `TAI_LIEU_DESIGN_SYSTEM.md`, `HUONG_DAN_MOI_TRUONG.md`, 3 báo cáo. Sửa: `DataService.gs` (đọc có chọn lọc, ngưỡng báo cáo nháp, `lamMoiBaoCaoNhap`), `PHIEN.gs` (bảng quyền + không trung hoà công thức cho hàm chỉ đọc), `Code.gs` (menu), `JavaScript.html`, `Index.html`, `Stylesheet.html`, `kiem_thu/chay_giao_dien.js`, `chay_bao_mat.js`, `chay_tat_ca.sh`, `gia_lap_apps_script.js`.

## 9. Triển khai & rollback
Xem `HUONG_DAN_MOI_TRUONG.md` mục 4–5. Không đổi cấu trúc dữ liệu. Không tự triển khai production.

## 10. Tồn đọng / rủi ro
1. Chưa đo trên Google thật; chưa có staging (mục 5, 6).
2. TTL 5 phút với dữ liệu sửa ngoài WebApp; hạn mức CacheService cho 10.000+ hồ sơ chưa xác nhận.
3. Lần đọc đầu sau mỗi lần ghi vẫn O(N) ô (chưa giảm bằng cách chỉ đọc các khối cột cần cho chỉ mục; ước tính số ô đọc giảm khoảng 40% nếu làm — chưa thực hiện, chưa đo).
4. Sheet `BaoCaoTienVay_Draft` có thể **cũ** khi > 1.000 dòng chi tiết (cần menu "Làm mới báo cáo nháp"); báo cáo trong WebApp không bị ảnh hưởng. Ngưỡng chỉnh bằng `CH_NGUONG_BAO_CAO_NHAP`.
5. Các phần giao diện nêu ở mục 4 "Chưa làm".
6. Khoá trùng/dòng hỏng trên Sheet vẫn được báo như cũ; chỉ mục bỏ dòng trùng khoá (giữ dòng đầu).
