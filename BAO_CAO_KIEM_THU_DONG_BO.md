# BÁO CÁO KIỂM THỬ CACHE & ĐỒNG BỘ

> Chạy trên **dịch vụ Apps Script giả lập** (Node vm) và trình duyệt Chromium với `google.script.run` giả lập. **Không** phải Google Sheets/CacheService/LockService thật.

## A. Phía máy chủ (`chay_dong_bo.js`)

### TC2 — Mở WebApp khi Sheets thực sự rỗng — **PASS**
- Dữ liệu vào: Sheet vừa khởi tạo, không có dữ liệu
- Điều kiện: gọi layDuLieuKhoiTao 1 lần
- Kỳ vọng: ok=true; 4 miền rỗng; KHÔNG gọi Utilities.sleep; không đọc lại
- Thực tế: ok=true; bản ghi={"CONGTY":0,"HOPDONG":0,"KHACHHANG":0,"HOSO":0}; sleep=0; tongMs=21

### TC3 — Lưu công ty và kiểm tra dữ liệu liên quan — **PASS**
- Dữ liệu vào: luuCongTy(CÔNG TY A)
- Điều kiện: sau lưu gọi layDuLieuKhoiTao
- Kỳ vọng: revision CONGTY +1; chỉ miền CONGTY đổi; danh sách công ty có bản ghi mới; miền khác giữ nguyên
- Thực tế: rev {"CONGTY":0,"HOPDONG":0,"KHACHHANG":0,"HOSO":0} → {"CONGTY":1,"HOPDONG":0,"KHACHHANG":0,"HOSO":0}; congTy=1

### TC3b — Cache danh mục: MISS rồi HIT; ghi cache có TTL và khoá có phiên bản — **PASS**
- Dữ liệu vào: đọc CONGTY 2 lần liên tiếp
- Điều kiện: không đổi dữ liệu giữa 2 lần
- Kỳ vọng: lần 1 MISS (hoặc HIT), lần 2 HIT; khoá dạng HOSOVAY:V2:ALL:CONGTY:{rev}; TTL > 0
- Thực tế: lần1=HIT, lần2=HIT; khoá=HOSOVAY:V2:ALL:CONGTY:0,HOSOVAY:V2:ALL:CONGTY:1; hồ sơ (giao dịch)=BYPASS

### TC3c — Lưu hợp đồng KHÔNG làm mất cache của công ty (không xoá cả cache) — **PASS**
- Dữ liệu vào: luuHopDong rồi đọc lại CONGTY
- Điều kiện: CONGTY không đổi
- Kỳ vọng: CONGTY vẫn HIT, HOPDONG MISS (khoá mới)
- Thực tế: {"CONGTY":"HIT","HOPDONG":"MISS"}

### TC4 — Sửa hợp đồng và kiểm tra danh sách hồ sơ — **PASS**
- Dữ liệu vào: luuHopDong(sửa số hợp đồng) + tạo hồ sơ
- Điều kiện: đọc lại hợp đồng và danh sách hồ sơ lọc
- Kỳ vọng: revision HOPDONG +1; hợp đồng mới đọc được; danh sách hồ sơ hiển thị số hợp đồng mới
- Thực tế: HOPDONG 2→3; danh sách hồ sơ hiện soHopDong=HD-01-SUA

### TC5 — Thêm khách hàng và kiểm tra dropdown — **PASS**
- Dữ liệu vào: luuKhachHang(NCC A)
- Điều kiện: đọc lại bootstrap
- Kỳ vọng: revision KHACHHANG +1; khachHang có bản ghi mới
- Thực tế: KHACHHANG 0→1; số KH=1

### TC6 — Lưu hồ sơ và kiểm tra tổng quan — **PASS**
- Dữ liệu vào: luuHoSoGiaiNgan(hồ sơ mới)
- Điều kiện: đọc bootstrap
- Kỳ vọng: revision HOSO +1; hoSoGoc có hồ sơ mới
- Thực tế: HOSO 1→2; phiên bản đọc=2

### TC8-10 — Chuyển Nháp / Đã giải ngân / Hủy đều đổi revision HOSO và hiển thị trong dữ liệu nạp — **PASS**
- Dữ liệu vào: tạo trọn bộ → về Nháp → tạo lại → giải ngân → hủy
- Điều kiện: đọc revision sau mỗi bước
- Kỳ vọng: mỗi bước revision HOSO tăng; trạng thái trong hoSoGoc khớp
- Thực tế: Về Nháp: 4→5, Nháp | Giải ngân: 6→7, Đã giải ngân | Hủy: 7→8, Đã hủy

### TC7 — Xoá hồ sơ và kiểm tra chi tiết liên quan — **PASS**
- Dữ liệu vào: xoaHoSo(hồ sơ Nháp, có xác nhận)
- Điều kiện: đọc bootstrap, chi tiết, báo cáo
- Kỳ vọng: hồ sơ biến mất khỏi danh sách/báo cáo nhưng dòng cha + chi tiết còn (xoá mềm)
- Thực tế: ẩn khỏi danh sách=true; dòng cha còn=true; chi tiết còn=1

### TC11 — Hai người cùng sửa một hồ sơ — **PASS**
- Dữ liệu vào: A và B cùng đọc hồ sơ ở revision r, lần lượt lưu
- Điều kiện: lưu A trước rồi B (cùng expectedRevision)
- Kỳ vọng: A thành công; B nhận XUNG_DOT_PHIEN_BAN; dữ liệu của A không bị ghi đè
- Thực tế: B: XUNG_DOT_PHIEN_BAN|2|Hồ sơ HS0004 đã được người khác thay đổ

### TC15 — Cache hết hạn — **PASS**
- Dữ liệu vào: xoá mọi khoá cache (mô phỏng hết TTL)
- Điều kiện: đọc CONGTY
- Kỳ vọng: MISS, vẫn trả đủ dữ liệu đúng, ghi lại cache với phiên bản hiện tại
- Thực tế: sau hết hạn=MISS, lần sau=HIT

### TC16 — Cache bị eviction / hỏng / quá lớn — **PASS**
- Dữ liệu vào: giá trị cache hỏng (JSON sai); dữ liệu > giới hạn cache
- Điều kiện: đọc HOPDONG
- Kỳ vọng: JSON hỏng → MISS & trả dữ liệu đúng; quá lớn → BYPASS, không lỗi
- Thực tế: cache hỏng → MISS, bản ghi=2; ghi dữ liệu quá lớn → BYPASS

### TC17 — Google Sheets trả lỗi / sai cấu trúc — **PASS**
- Dữ liệu vào: xoá cột MaHD khỏi tiêu đề DM_HopDongVay
- Điều kiện: gọi layDuLieuKhoiTao
- Kỳ vọng: ok=false, mã LOI_CAU_TRUC, thông báo nêu cột thiếu; KHÔNG trả mảng rỗng thay thế; không sleep/retry
- Thực tế: ok=false; ma=LOI_CAU_TRUC; "Lỗi cấu trúc tab "DM_HopDongVay": thiếu cột MaHD. Hãy chạy "Khởi tạo /"; sleep=0

### TC17b — Dòng có dữ liệu nhưng thiếu khoá không biến mất âm thầm — **PASS**
- Dữ liệu vào: thêm dòng khách hàng thiếu MaKH
- Điều kiện: docBangChanDoan_
- Kỳ vọng: dòng được ghi nhận trong boQua với lý do THIEU_KHOA
- Thực tế: [{"dong":3,"lyDo":"THIEU_KHOA"}]

### TC18 — Mất kết nối sau khi gửi lệnh lưu — **PASS**
- Dữ liệu vào: client gửi lệnh tạo hồ sơ (khoaYeuCau K1), máy chủ ghi xong nhưng phản hồi mất; người dùng bấm lưu lại cùng K1
- Điều kiện: gửi 2 lần cùng khoaYeuCau
- Kỳ vọng: chỉ MỘT hồ sơ được tạo; lần 2 trả đúng hồ sơ đã tạo (daCoTuTruoc)
- Thực tế: lần1=HS0005, lần2=HS0005 (daCoTuTruoc=true); số hồ sơ +1

### TC20 — Thay đổi hồ sơ trong lúc đang tạo chứng từ — **PASS**
- Dữ liệu vào: giữa hai tài liệu của bộ chứng từ, một phiên khác lưu sửa cùng hồ sơ
- Điều kiện: taoTronBoTheoMau
- Kỳ vọng: báo lỗi nêu rõ phiên bản đổi; hồ sơ KHÔNG chuyển sang "Đã tạo hồ sơ"
- Thực tế: lỗi="Hồ sơ HS0006 vừa được thay đổi trong lúc đang tạo chứng từ (phiên bản 1 → 2). Cá"; trạng thái=Nháp

### TC-DS1 — Đối soát: VND và USD KHÔNG cộng lẫn; tách theo trạng thái — **PASS**
- Dữ liệu vào: có hồ sơ VND và USD ở nhiều trạng thái
- Điều kiện: layBaoCaoDoiSoat
- Kỳ vọng: mỗi nhóm có loaiTien riêng; tổng VND không chứa số USD; USD có quy đổi riêng
- Thực tế: USD={"trangThai":"Nháp","loaiTien":"USD","soHoSo":1,"tong":25000,"tongQuyDoiVND":645250000}; tổng VND báo cáo=10501000 (tính tay 10501000)

### TC-DS2 — Đối soát phát hiện: tổng lệch chi tiết, chi tiết mồ côi, hợp đồng thiếu, ghi dở dang — **PASS**
- Dữ liệu vào: cố tình làm hỏng dữ liệu trên bản giả lập
- Điều kiện: layBaoCaoDoiSoat
- Kỳ vọng: mỗi loại lỗi được liệt kê; dữ liệu sạch thì tongSoLoi=0 trước khi hỏng
- Thực tế: sạch=0; sau khi hỏng: {"TONG_KHOP":1,"CHI_TIET_MO_COI":1,"HO_SO_THIEU_CHI_TIET":0,"HOP_DONG_THIEU":1,"TIEN_LE":0,"GIAI_NGAN_THIEU_CHUNG_TU":0,"GHI_DO_DANG":1}

### TC-RETRY — Không còn retry-vì-rỗng / sleep / setTimeout chữa dữ liệu trong mã nguồn — **PASS**
- Dữ liệu vào: quét *.gs và JavaScript.html
- Điều kiện: tìm docCoThuLai_, tuChuaHopDongNeuRong_, Utilities.sleep, setTimeout tải lại
- Kỳ vọng: không còn (ngoại lệ: 2 setTimeout giao diện không liên quan dữ liệu)
- Thực tế: vi phạm=không; setTimeout còn lại=1

## B. Phía giao diện (`chay_giao_dien.js`, đọc từ kết quả thực thi)

- [ĐẠT] [TC2-UI] Sheets rỗng thật: đúng 1 lượt gọi nạp (không đọc lại), hiển thị ngay "0", không báo lỗi
- [ĐẠT] [TC12] Hai response sai thứ tự: chỉ response của lượt gọi MỚI NHẤT được áp dụng, response cũ bị bỏ
- [ĐẠT] [TC13] Đổi bộ lọc liên tục 3 lần, response về 3-1-2: chỉ kết quả của lần lọc CUỐI được áp dụng
- [ĐẠT] [TC14] Chuyển tab nhanh 6 lần: chỉ MỘT lượt hỏi phiên bản (không dồn dập), không nạp lại toàn bộ
- [ĐẠT] [TC17-UI] Đọc lỗi thật: hiện thông báo lỗi thật, KHÔNG thay bằng dữ liệu rỗng, KHÔNG tự thử lại
- [ĐẠT] [TC19] Phiên khác đổi dữ liệu: hỏi revision rồi CHỈ nạp lại miền bị đổi (HOPDONG), không nạp tất cả

## C. Ánh xạ 20 trường hợp

| # | Nội dung | Nơi kiểm |
|---|---|---|
| 1 | Mở WebApp khi có đủ dữ liệu | TC3–TC6 (bootstrap có dữ liệu) + chay_hoi_quy |
| 2 | Sheets rỗng | TC2 (máy chủ), TC2-UI (giao diện) |
| 3 | Lưu công ty | TC3/TC3b/TC3c |
| 4 | Sửa hợp đồng | TC4 |
| 5 | Thêm khách hàng | TC5 |
| 6 | Lưu hồ sơ → tổng quan | TC6 |
| 7 | Xoá hồ sơ | TC7 |
| 8–10 | Về Nháp / Đã giải ngân / Hủy | TC8-10 |
| 11 | Hai người cùng sửa | TC11 (+ chay_trang_thai) |
| 12 | Response sai thứ tự | TC12 (giao diện) |
| 13 | Đổi bộ lọc liên tục | TC13 (giao diện) |
| 14 | Chuyển tab nhanh | TC14 (giao diện) |
| 15 | Cache hết hạn | TC15 |
| 16 | Cache eviction | TC16 |
| 17 | Sheets trả lỗi | TC17/TC17b/TC17-UI |
| 18 | Mất kết nối sau khi gửi lệnh lưu | TC18 (idempotency khoaYeuCau) |
| 19 | Thay đổi trên máy này, kiểm tra từ máy khác | TC19 (giao diện: phát hiện revision) + TC3–6 (revision tăng) |
| 20 | Revision đổi trong lúc tạo chứng từ | TC20 |

**Giới hạn**: TC19 mô phỏng "máy thứ hai" bằng việc máy chủ trả revision mới hơn; chưa thử 2 trình duyệt thật. TC15/16 mô phỏng hết hạn/eviction bằng cách xoá khoá, không đo TTL thật của Google.
