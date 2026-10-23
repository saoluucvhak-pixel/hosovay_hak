# CHANGELOG

## Chốt kỳ lãi, xuất Excel/PDF, lưu trữ tệp & khôi phục, chứng từ lỗi chỉ rõ trường thiếu (24/10/2026)
### Thêm
- **`CHOTBAOCAO.gs` (tệp mới):** `chotBaoCaoLai` / `layDanhSachChotLai` / `layChiTietChotLai` (kèm phần lệch so với số hiện tại) / `huyChotLai` (sheet `ChotBaoCaoLai`, `ChotBaoCaoLaiCT`; kỳ không chồng ngày; hủy bắt buộc lý do); `xuatBaoCaoLai`, `xuatTheoDoiTatToan` (Excel/PDF qua bảng tính tạm, luôn dọn file tạm, tối đa 5.000 dòng).
- **Báo cáo tiền lãi:** thêm lãi quá hạn/phạt (ước tính), quy đổi USD→VND theo tỷ giá cuối tháng, tổng quy đổi, cảnh báo thiếu tỷ giá; nút Excel/PDF/Chốt kỳ; bảng kỳ đã chốt.
- **`LUUTRU.gs`:** lưu trữ tệp đính kèm (`lapSoTepLuuTru`, `luuTruSaoTep` theo lô có tiếp tục, `layTepLuuTru`, sheet `LuuTruTep`), ước tính + cảnh báo dung lượng Drive (`uocTinhLuuTruTep`, `layCanhBaoDungLuong`; cảnh báo ở Lưu trữ và Tổng quan), `soSanhLuuTru` + `khoiPhucTuLuuTru` (chỉ thêm lại dòng đã mất, không ghi đè).
- **Chứng từ lỗi:** `layThieuDuLieuChungTu` + `thieuDuLieuCoCauTruc_`: liệt kê trường thiếu theo nhóm (Công ty/Hợp đồng/Hồ sơ/Chi tiết), nút “Đi tới nơi sửa”; ứng viên mẫu ghi số trường thiếu.
- **Hướng dẫn:** mục “Chức năng mới (tháng 10/2026)” trong app; `HUONG_DAN_QUAN_LY_VAY.md` mục 11; `TAI_LIEU_BAN_GIAO.md` mục 10.
### Sửa
- `JavaScript.html`: bỏ 2 `setTimeout` mới thêm vi phạm quy tắc `chay_dong_bo` (TC-RETRY).
### Kiểm thử
- `chay_chot_xuat_bao_cao` (6 ca, có giao diện), `chay_luu_tru_tep_khoi_phuc` (7 ca, có giao diện); `chay_chon_mau_chung_tu` 7 ca; `chay_bao_cao_tien_lai` 8 ca. Giả lập bổ sung `SpreadsheetApp.create`, `DriveApp.getStorage*`, `file.makeCopy(tên, thư mục)`, `file.getSize`.

## Lưu trữ toàn bộ dữ liệu theo năm + xem lại năm cũ (23/10/2026)
### Thêm
- **`LUUTRU.gs` (tệp mới):** `luuTruNam` (Quản trị) tạo bản sao TOÀN BỘ file dữ liệu cho một năm vào thư mục Drive `LuuTru_Nam` (ảnh chụp, xác minh đủ bảng/số dòng, ghi sổ ở sheet `LuuTruNam`); `layDanhSachLuuTru`; `layDuLieuLuuTru` xem lại từng bảng nghiệp vụ của năm cũ (CHỈ ĐỌC, phân trang, tìm không dấu, không có bảng người dùng/cấu hình); `huyLuuTru` (đánh dấu, không xoá file). Chỉ tài khoản toàn hệ thống (không bị giới hạn công ty).
- **Tự động đầu năm:** `luuTruNamTuDong` + `taoLichLuuTruNam` (mỗi ngày 3h; trong 15 ngày đầu tháng 1 tự lưu năm trước nếu chưa có bản hợp lệ).
- **Giao diện:** Cài đặt › 🗄 Lưu trữ theo năm.
- Bản lưu trữ không bị dọn bởi sao lưu hằng tuần (khác thư mục và tiền tố).
### Kiểm thử
- `chay_luu_tru_nam.js` (10 ca). Giả lập Drive: `makeCopy` nay tạo ảnh chụp thật; `Utilities.formatDate` hỗ trợ mẫu có giờ.

## Đợt cập nhật 23/10/2026 (2): menu, thế chấp–bảo hiểm, tính lãi, tất toán theo ngày, chọn mẫu
### Thêm / Sửa
- **Menu:** Vận hành (Hồ sơ giải ngân, Tất toán khoản vay, Hồ sơ đính kèm, Cập nhật tỷ giá) · Báo cáo phân tích (Báo cáo tiền vay, Quản lý khoản vay, So sánh USD / VND) · Hệ thống (Cài đặt, Hướng dẫn sử dụng) · Thông tin liên quan (Tỷ giá, Ngân hàng tham chiếu).
- **Bảo hiểm ở Hồ sơ đính kèm độc lập:** bảng chỉ lấy từ bảng đóng bảo hiểm đọc OCR hoặc nhập riêng; bỏ dòng/so sánh với bảng lương (`layTongHopBaoHiem` không còn `luong`, `chenhLechNLD`).
- **Hợp đồng → Đăng ký thế chấp → Bảo hiểm → Chi tiết tài sản bảo hiểm:** thẻ “Đăng ký thế chấp tài sản” trong màn Hợp đồng; nút “🛡 Bảo hiểm” mở modal hợp đồng bảo hiểm (ngày ký, công ty BH, số HĐ) + bảng chi tiết (STT, mã/tên tài sản, giá trị BH, phí BH, tiền BH, từ–đến ngày). API `layBaoHiemTaiSan`, `luuBaoHiemTaiSan`, `huyBaoHiemTaiSan`; sheet mới `BaoHiemTaiSan`, `BaoHiemTaiSanChiTiet` (tự tạo khi dùng). Cảnh báo trên Tổng quan khi bảo hiểm còn ≤ 15 ngày hoặc đã hết hạn (trước đây 30 ngày); “Bảo hiểm đến” lấy từ ngày cuối của hợp đồng bảo hiểm hiệu lực.
- **Quản lý khoản vay:** chỉnh khoảng cách cột Giá trị / Bảo hiểm đến; nút “🛡 Bảo hiểm”; bỏ ô bảo hiểm trùng ở biểu mẫu đăng ký; **Gửi duyệt giải ngân chọn hồ sơ từ danh sách** (`layHoSoCoTheGuiDuyet`) thay vì gõ mã tay.
- **Báo cáo tiền vay › 5. Tính tiền lãi** (`layBaoCaoTienLai`): lãi trong hạn theo hồ sơ / hợp đồng / tháng trong khoảng ngày chọn, VND và USD tách riêng, xuất CSV hồ sơ × tháng; cùng công thức lịch trả nợ.
- **Tất toán khoản vay:** “Theo dõi theo ngày” (`layTheoDoiTatToanTheoNgay`: dư nợ, lãi ngày, lãi lũy kế, trả gốc/lãi, sự kiện, ngày dự kiến) và nhãn còn/quá hạn N ngày ở danh sách.
- **Chứng từ hồ sơ:** nút “🔄 Cập nhật mẫu” (`capNhatMauChungTu`) và “🧩 Chọn mẫu khác” (`layMauChoChungTu` + tham số `mauChon` khi phát hành) cho từng chứng từ — dùng khi mẫu tự chọn lỗi/mất file.
### Kiểm thử
- Thêm `chay_bao_hiem_tai_san`, `chay_bao_cao_tien_lai`, `chay_tat_toan_theo_ngay`, `chay_chon_mau_chung_tu`, `chay_menu_dieu_huong`; cập nhật các test bảo hiểm/ duyệt/ quản lý vay theo hợp đồng mới.

## Hồ sơ đính kèm dạng cha–con (23/10/2026)
### Thêm / Sửa
- **Cha–con:** bảng “Tổng hợp hồ sơ giải ngân” là bảng CHA; bấm một dòng hồ sơ → 3 bảng CON của đúng hồ sơ đó: Hoá đơn, Bảng lương, Bảo hiểm (BHXH) ở bảng riêng. Dòng “📎 Tài liệu chưa gắn hồ sơ” xem phần chưa có hồ sơ. `layBangTongHopHoaDon`, `layBangTongHopBangLuong`, `layTongHopBangLuong`, `layTongHopBaoHiem` nhận tham số tuỳ chọn `maHoSo` (không truyền = tất cả như cũ; `''` = chưa gắn hồ sơ); luôn chạy sau bộ lọc phạm vi công ty.
- **Bảo hiểm:** nguồn là bảng đóng BH đọc OCR **hoặc nhập riêng** (`luuBaoHiemThuCong`, quyền Nhập liệu, nguồn `NHAP_TAY`); dòng “Bảng lương” chỉ để đối chiếu phần NLĐ. Bảng hiện cột nguồn OCR / nhập tay.
- **Lỗi định dạng tháng:** Google Sheets tự đổi “09/2026” thành ngày nên bảng hiện “Tue Sep 01 2026 … GMT+0700”. Đọc về chuẩn hoá `chuanThang_` (Date/chuỗi ngày → `MM/yyyy`); cột `Thang` ghi dạng văn bản từ nay.
- **Giao diện:** chừa khoảng đệm giữa cột “Số tiền” và cột kề bên (Số tài khoản, Đọc được?).
- **Kiểm thử:** `chay_cha_con_dinh_kem.js` (5 ca, gồm giao diện Chromium); `chay_ocr_nhieu_trang.js` cập nhật chuỗi gọi API mới.

## Sửa lỗi trực tiếp trên main (23/10/2026)
### Sửa
- **Phạm vi công ty (`PHAMVI.gs`, `HOADONNHIEUTRANG.gs`, `ATTACHMENTSERVICE.gs`, `DataService.gs`):** `layTongHopBangLuong`, `layTongHopBaoHiem`, `gomChungTuTuTrang` (cờ “đã có trong sổ”), `layBangTongHopHoaDon`, `layBangTongHopBangLuong`, `layTaiLieuTheoHoSo` và hai danh sách gợi ý hoá đơn/lương lọc theo phạm vi công ty ở máy chủ TRƯỚC khi tổng hợp (dòng lương, bộ phận, tên tệp). Dòng chưa gắn hồ sơ bị ẩn với người bị giới hạn công ty (cùng quy tắc “không xác định được công ty thì từ chối”); người toàn hệ thống không đổi.
- **Đọc bảng lương (`OCRSERVICE.gs`):** dòng tổng/chữ ký nhận diện theo nhãn đầy đủ + cấu trúc dòng (có STT là một người), không còn theo tiền tố nên “Công Minh”, “Tống …” không làm dừng đọc.
- **`createDemoSheet` (`Demo.gs`, `Setup.gs`):** chỉ Quản trị; khởi tạo cấu trúc CHỈ trong Sheet demo vừa tạo (`khoiTaoCauTrucSheet_(ss)`), không `setActiveSpreadsheet`, không đổi cấu hình; thất bại thì bỏ Sheet demo dở dang vào thùng rác.
- **`docSoTienBangChu_`:** tách theo cấp đơn vị lớn nhất nên “một nghìn tỷ” = 1.000.000.000.000; hỗ trợ “tỉ”; kết quả vượt số nguyên an toàn hoặc đơn vị lặp → 0 (không đọc được).
- **CI:** `chay_mau_noi_dung.js` không còn sập khi môi trường chưa cài Playwright (bỏ qua phần giao diện, báo rõ).
### Kiểm thử
- Thêm `chay_sua_loi_23_10.js` (12 ca) vào bộ hồi quy.

## Giai đoạn 11b — Sửa lỗi theo báo cáo kiểm tra main 3aef5c4 (nhánh `claude/sua-doi-soat-nhac-no`)
### Sửa
- **Đối soát sao kê (`DOISOATSAOKE.gs`):** (1) gợi ý ghép MỘT-MỘT — nhiều dòng cùng ngày/số tiền tranh một giao dịch thì cả hai hiện “Nhiều ứng viên”, không dòng nào tự gợi ý; (2) loại tiền ngoài USD/VND bị loại kèm báo lỗi, không đổi thành VND; (3) phân tích số tiền nghiêm ngặt (từ chối `12-34`, `1.2.3`, `1,23,456`, `--5`, `5-`…); (4) ngày không tồn tại (`31/02`, năm không nhuận `29/02`…) bị từ chối.
- **Nhắc nợ (`NHACNO.gs`):** toàn bộ “kiểm tra đã gửi → giành quyền gửi → gửi” nằm trong khoá, quyền gửi được giành TRƯỚC khi gửi và trả lại nếu gửi lỗi (hai lần chạy trùng không gửi trùng email); sự kiện Calendar đặt lúc 12h trưa để lệch múi giờ giữa script và Lịch không làm nhảy ngày.
- **Kiểm thử:** `chay_nhac_no.js` so sánh ngày theo giờ địa phương (không phụ thuộc múi giờ máy; đã chạy ở UTC, Asia/Ho_Chi_Minh, America/Los_Angeles); thêm ca đồng thời + lỗi sau gửi; `chay_doi_soat_sao_ke.js` thêm 5 ca hồi quy cho 4 lỗi trên (13 → 18).

## Giai đoạn 11 — Quản lý vay: hạn mức, dự báo dòng tiền, tuổi nợ, ràng buộc/tài sản, lãi phạt & phân bổ, nhắc nợ, đối soát sao kê, duyệt hai cấp (nhánh `claude/nang-cap-tien-vay`)
Chi tiết: `BAO_CAO_NANG_CAP_QUAN_LY_VAY.md`.
### Thêm
- Module: `HANMUC.gs`, `BAODAM.gs`, `PHANBO.gs`, `DUBAO.gs`, `NHACNO.gs`, `DOISOATSAOKE.gs`, `DUYET.gs`; giao diện `QuanLyVayGiaoDien.html` (mục “Quản lý vay”, 8 màn con); 28 API mới vào bảng quyền `api()`.
- Cài đặt quản lý vay (`layThietLapQuanLyVay` / `luuThietLapQuanLyVay`), 4 sheet mới tự tạo khi dùng.
- Bộ kiểm thử: `chay_phan_bo` (17), `chay_han_muc` (20), `chay_nhac_no` (12), `chay_doi_soat_sao_ke` (13), `chay_duyet_hai_cap` (11), `chay_hieu_nang_quan_ly_vay`, `chay_quan_ly_vay_ui` (72) — đã đăng ký trong `tools/test.cjs` / `tools/full-test.cjs`.
### Đổi hành vi (QUAN TRỌNG khi nâng cấp)
- **Xác nhận giải ngân bị chặn nếu vượt hạn mức hợp đồng** (mặc định BẬT; hợp đồng chưa khai báo hạn mức thì không chặn). Tắt: Quản lý vay → Nhắc nợ & cài đặt → bỏ “Chặn xác nhận giải ngân khi vượt hạn mức”.
- Duyệt hai cấp mặc định TẮT — quy trình cũ không đổi.
- Sổ trả nợ nhận thêm loại `PHAT` (lãi phạt); số tham chiếu trả gộp có hậu tố `-P/-L/-G`; kiểm tra trùng tham chiếu coi `ABC` và `ABC-L` là một.
- `layLichTraNo` tách phần tính thành `tinhLichTraNo_` (thuần) để dùng cho dự báo/tuổi nợ; kết quả không đổi (bộ `chay_lich_tra_no` giữ nguyên).
- `layTongQuanHoSo` kèm `quanLyVay` (nhẹ, không dựng lịch); lỗi tính toán chỉ làm mất thẻ, không làm hỏng Tổng quan.
- Cần cấp thêm quyền Google (gửi email, Lịch) khi bật nhắc nợ.

## Giai đoạn 9 — Hiệu suất: phân trang máy chủ, chỉ mục cache, đọc có chọn lọc; giao diện danh sách (nhánh `claude/phan-trang-hieu-nang`)
Chi tiết: `BAO_CAO_NANG_CAP_HIEU_NANG_UI.md`, `BAO_CAO_SO_SANH_TOC_DO.md`, `BAO_CAO_DOI_CHIEU_DU_LIEU.md`, `TAI_LIEU_DESIGN_SYSTEM.md`, `HUONG_DAN_MOI_TRUONG.md`.
### Thêm
- `PHANTRANG.gs`: `layTrangHoSo` (+ `getHoSoPage`), `layTongQuanHoSo`; chỉ mục hồ sơ trong CacheService theo revision; `lamMoiBaoCaoNhap` (menu + API quản trị).
- Giao diện danh sách hồ sơ: phân trang 20/50/100, tìm kiếm debounce, bộ lọc nâng cao + chip, sắp xếp/lọc ở máy chủ, tiêu đề bảng cố định.
- Bộ kiểm thử `chay_phan_trang.js` (27), công cụ đo trước/sau và đối chiếu dữ liệu Sheets.
### Đổi hành vi
- Trình duyệt **không còn tải toàn bộ hồ sơ**; Tổng quan dùng số liệu máy chủ.
- Lưu hồ sơ không còn đọc cả sheet để tìm khoá yêu cầu / sao lưu chi tiết; sheet `BaoCaoTienVay_Draft` chỉ tự dựng lại khi ≤ 1.000 dòng chi tiết (`CH_NGUONG_BAO_CAO_NHAP`), lớn hơn thì dùng menu "Làm mới báo cáo nháp".
- Dữ liệu sửa trực tiếp trên Sheets hiển thị trong danh sách chậm tới 5 phút (hoặc nút làm mới).
- API ghi/đọc cũ (`locDanhSachHoSo`, `layDuLieuKhoiTao`) giữ nguyên.


## Giai đoạn 8 — Kiểm toán bảo mật, đồng bộ và hiệu năng (nhánh `claude/kiem-toan-p0-bao-mat`)
Chi tiết: `BAO_CAO_KIEM_TOAN_BAO_MAT_HIEU_NANG.md`, `BAO_CAO_HIEU_NANG.md`.
### Bảo mật (có thể ảnh hưởng người dùng hiện tại — đọc mục triển khai)
- **Fail closed**: `MOI_TRUONG=PRODUCTION` (mặc định). Cần email Google xác minh + có vai trò; `ADMIN_EMAILS` trống KHÔNG còn cấp quyền quản trị cho mọi người; ẩn danh bị từ chối. DEV/TEST chỉ khi đặt rõ.
- Gọi trực tiếp (không qua `api()`) chỉ cho Quản trị; 4 hàm đọc dữ liệu công khai thành nội bộ; `initializeSpreadsheet` chỉ Quản trị; `saoLuuHangTuan` chặn tần suất.
- Chống XSS (`esc()` thoát đủ) và formula injection (`lamSachCongThuc_` ở cổng `api()`).
### Cấu hình & log
- `CH_SPREADSHEET_ID`, `CH_SS_BANG_LUONG_ID` (Script Properties); menu/API `kiemTraMoiTruongHeThong` (cách ly dữ liệu giữa DEV/TEST và production).
- Log JSON có cấu trúc (INFO/WARN/ERROR/SECURITY), `layNhatKyLoiGanDay`.
### Hiệu năng
- Đối soát hết O(N²) (1.000 hồ sơ: 706 → 8 lần đọc); mở hồ sơ chỉ đọc dòng cần (10.000 hồ sơ: −96% số ô đọc).
### Đồng bộ dữ liệu
- Khoá trùng trên Sheet không còn làm sập Tổng quan; chặn tạo hợp đồng trùng số khi bấm lưu nhiều lần.


## Giai đoạn 7 — Kiểm toán logic & hoàn thiện quy trình nghiệp vụ (nhánh `claude/hosovay-quy-trinh-nghiep-vu`)
Chi tiết: `BAO_CAO_KIEM_TOAN_QUY_TRINH.md`; kiểm thử: `BAO_CAO_KIEM_THU_QUY_TRINH.md` (TC01–TC30, giả lập).
### Thêm
- `BOCHUNGTU.gs` (phiên phát hành `PhienPhatHanhBo`, trạng thái bộ), `GIAINGANTHUCTE.gs` (xác nhận giải ngân ngân hàng `XacNhanGiaiNgan`, hủy, hoàn trả/điều chỉnh, báo cáo thực tế).
- Cấu hình loại tài liệu: bắt buộc/không, áp dụng loại tiền/loại hồ sơ/ngân hàng, thứ tự phát hành.
- `xemTruocChungTu` chỉ đọc, file tạm tự dọn; cột `RevisionHoSo` ở lịch sử phát hành.
### Đổi hành vi
- `expectedRevision` **bắt buộc** cho mọi cập nhật hồ sơ đã có (`THIEU_REVISION`, `REVISION_KHONG_HOP_LE`, `XUNG_DOT_PHIEN_BAN`).
- Xem trước/phát hành không còn tự lưu hồ sơ. "Đã tạo hồ sơ" chỉ khi đủ chứng từ bắt buộc, hiệu lực, khớp dữ liệu. "Đã giải ngân" cần xác nhận NH đủ trường.
- Chứng từ có trạng thái hiệu lực; sửa hồ sơ → "Hết hiệu lực do hồ sơ thay đổi" (giữ lịch sử, không ghi đè file).
- Viết lại cập nhật phi tiền tệ (journal, batch, phục hồi). Báo cáo: hồ sơ thiếu ngày không mặc nhiên nằm trong khoảng ngày; báo cáo giải ngân thực tế chỉ từ xác nhận NH, không cộng USD vào VND.
- Khôi phục hồ sơ: quản trị + revision + kiểm toàn vẹn.
### Bỏ
- `danhDauDaGiaiNgan` (thay bằng `xacNhanGiaiNganThucTe`).

## Giai đoạn 2 — An toàn dữ liệu, vòng đời hồ sơ, tích hợp cổng (nhánh `claude/friendly-faraday-g049cv`)

### Thêm
- `HOSODOMAIN.gs` — lớp miền: máy trạng thái ở backend, revision, khoá ghi lồng được (`voiKhoa_`), sinh mã bền, xoá mềm, nhật ký ghi dở dang + phục hồi.
- `PORTALAUTHADAPTER.gs` — chỉ là **adapter**; ứng dụng KHÔNG có đăng nhập/RBAC riêng. Chế độ `TAM_GOOGLE` (mặc định, danh sách `ADMIN_EMAILS`) và `CONG_HAK` (chưa có giao thức từ HAK_HDMB nên **từ chối mọi truy cập** cho tới khi hiện thực `xacMinhPhienCong_`).
- Sheet mới (tự tạo): `LichSuTrangThaiHoSo`, `NhatKyGhiDoDang`. Cột mới của `HoSoGiaiNgan` (tự thêm, không đụng dữ liệu cũ): `Revision, CapNhatLuc, CapNhatBoi, DaXoa, NgayXoa, NguoiXoa, LyDoXoa`.
- API: `kiemTraDieuKienGiaiNgan`, `layLichSuTrangThaiHoSo`, `khoiPhucHoSo` (quản trị), `layGhiDoDang`/`phucHoiGhiDoDang` (quản trị).

### Đổi hành vi (cần biết)
- **Trạng thái do máy chủ quyết định**: `luuHoSoGiaiNgan` bỏ qua `trangThai` của client. Chuyển hợp lệ: Nháp→Đã tạo hồ sơ→Đã giải ngân→Đã hủy; Đã tạo hồ sơ→Nháp. `Đã hủy` là kết thúc. Hủy bắt buộc lý do. Đánh dấu giải ngân chỉ khi đủ dữ liệu + chứng từ bắt buộc đã tạo và khớp dữ liệu hiện tại.
- **Chỉ sửa được hồ sơ ở Nháp** (trước đây cho sửa cả “Đã tạo hồ sơ”): muốn sửa phải “Chuyển về Nháp”.
- **Revision**: client gửi `expectedRevision`; lệch → lỗi `XUNG_DOT_PHIEN_BAN` thay vì ghi đè. Hồ sơ cũ chưa có Revision coi là 0.
- **Xoá hồ sơ là xoá mềm** (đặt `DaXoa`): dòng, chi tiết, lịch sử phát hành, file Drive giữ nguyên; hồ sơ có tài liệu phải xác nhận (`CO_TAI_LIEU`). Không xoá hồ sơ Đã giải ngân/Đã hủy.
- **Sinh mã**: trong khoá, lấy max(cột A, bộ đếm bền)+1 và kiểm tra chưa tồn tại → mã đã cấp không bao giờ cấp lại (có thể hở số). Khoá kỹ thuật (`MaHoSo`) tách khỏi số chứng từ nghiệp vụ.
- Lưu cha–con: kiểm tra toàn bộ trước khi ghi; ghi nhật ký `DANG_GHI` + bản sao → ghi → đọc lại đối chiếu số dòng/tổng tiền → `HOAN_TAT`. Lần lưu sau tự phục hồi nếu lần trước chết giữa chừng.
- Mọi API giao diện gọi đều bắt đầu bằng `yeuCauDangNhap_()`.

### Kiểm thử (chạy trên **giả lập** Apps Script, không phải Google thật)
`kiem_thu/chay_tat_ca.sh` — 13 giai đoạn; mới: `chay_trang_thai.js` (53 khẳng định) và 3 khẳng định giao diện.

### Chưa làm / chưa kiểm chứng
- Tích hợp cổng HAK thật (thiếu hợp đồng giao thức HAK_HDMB).
- “Đồng thời” mới được kiểm bằng khoá giả lập tuần tự; chưa thử hai phiên thật trên Google.
- Chưa làm: refactor `AppDataStore`/phong bì API/đánh số request (phụ lục P0 bị cắt), `SheetRepository`, đối soát báo cáo mở rộng, giao diện Enterprise.

## Giai đoạn 3 — Đồng bộ dữ liệu & cache
- Mới: `DATASYNC.gs` (revision theo miền, CacheManager, DataRepository, phong bì API), `AppDataStore`/`RequestCoordinator`/chẩn đoán đồng bộ ở trình duyệt, idempotency tạo hồ sơ (`KhoaYeuCau`), kiểm tra revision khi tạo bộ chứng từ.
- Gỡ: `docCoThuLai_`, `tuChuaHopDongNeuRong_`, retry+sleep ở `layBaoCaoTienVay`, 6 mảng `DS_*` toàn cục.
- Sửa lỗi phát hiện khi viết test: báo cáo tiền vay và tổng hợp hồ sơ vẫn hiện hồ sơ đã xoá mềm; hoá đơn của hồ sơ đã xoá mềm vẫn bị coi là "đã dùng".
- Test: `chay_dong_bo.js` (17 trường hợp máy chủ) + 6 TC giao diện; 14 giai đoạn trong `chay_tat_ca.sh`. Xem `TAI_LIEU_DONG_BO_DU_LIEU.md`, `BAO_CAO_KIEM_THU_DONG_BO.md`.

## Giai đoạn 4
- Mới: `DOISOAT.gs` (báo cáo đối soát: tách VND/USD, kiểm tra toàn vẹn), phân trang + sắp xếp bảng hồ sơ, cảnh báo thay đổi chưa lưu, log hiệu năng `[HIEU_NANG]`/`[LOI_API]`, `TAI_LIEU_BAN_GIAO.md`.
- Test: +2 đối soát (máy chủ), +6 giao diện.

## Giai đoạn 5 — Đăng nhập qua Cổng theo HDMB_HAK
- Mới: `PHIEN.gs` (SSO HMAC, phiên CacheService, SYS_NguoiDung ADMIN/NHAP_LIEU/XEM, cửa `api()` + bảng quyền, mã ghép cặp 6 số cho trang nhúng, quản lý người dùng/cổng), màn hình đăng nhập + `hakRun_()` ở trình duyệt, tab Cài đặt → Đăng nhập & người dùng.
- Đổi: `PORTALAUTHADAPTER.gs` (CONG_HAK nay hoạt động), `doGet` (nhận `?sso=`), toàn bộ lời gọi giao diện đi qua `api()`.
- Test: `chay_dang_nhap.js` (37).

## Giai đoạn 6 — Phụ lục P0 (bản đầy đủ)
- AppDataStore: entities theo ID + versions + queries + requestState + subscribers + kiểm schema + xoá khi hết phiên; ma trận vô hiệu hoá khai báo (`MA_TRAN_VO_HIEU_`) tự nạp lại đúng miền.
- API: meta{requestId,revision,fetchedAt,source,isComplete}, error{code,retryable}; giá trị Date/số hỏng -> isComplete=false + vị trí; không cache dữ liệu hỏng.
- `kiemTraKetQuaLuu`: sau mất mạng kiểm lệnh lưu đã ghi chưa trước khi cho gửi lại.
- Chẩn đoán: xuất JSON sạch, kiểm nhất quán, trạng thái nạp; báo cáo nháp lỗi được ghi nhật ký.
- Tài liệu: `BAO_CAO_NGUYEN_NHAN_GOC_CACHE.md`. Test: chay_dong_bo 25, UI 107.
