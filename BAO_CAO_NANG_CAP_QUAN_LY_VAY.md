# BÁO CÁO NÂNG CẤP QUẢN LÝ VAY (giai đoạn 11)

> **Môi trường kiểm thử:** toàn bộ chạy trên dịch vụ Apps Script/Sheets/MailApp/CalendarApp **GIẢ LẬP** (Node) và Chromium thật với `google.script.run` giả lập. **Chưa chạy trên Google thật / staging.** Thời gian đo là CPU Node, không phải độ trễ Google. Trước khi dùng cho dữ liệu sản xuất cần chạy thử trên bản sao Google Sheet.

## 1. Tính năng và quy ước nghiệp vụ

| # | Tính năng | Quy ước cần biết | File |
|---|---|---|---|
| 1 | **Duyệt hai cấp** trước khi xác nhận giải ngân | Mặc định **TẮT**. Bật: Cài đặt → “Bắt buộc duyệt hai cấp”. Người duyệt phải là **quản trị** và **khác người gửi**. Phiếu ghi revision hồ sơ lúc gửi; hồ sơ bị sửa sau đó → phiếu “Hết hiệu lực”, phải gửi lại. Phiếu dùng một lần (“Đã sử dụng”). Không xoá phiếu. | `DUYET.gs` |
| 2 | **Hạn mức tín dụng** theo hợp đồng | Đã dùng = dư nợ gốc còn lại của khoản “Đã giải ngân” chưa tất toán (xoay vòng: trả gốc thì hạn mức được trả lại); USD quy VND **theo tỷ giá giải ngân của hồ sơ**; “đang chờ” = hồ sơ “Đã tạo hồ sơ” (chỉ tham khảo). Ngưỡng cảnh báo 80% / 95% (cấu hình). **Chặn xác nhận giải ngân khi vượt** (mặc định **BẬT**; tắt trong Cài đặt). Hợp đồng chưa khai báo hạn mức → không kiểm tra. | `HANMUC.gs` |
| 3 | **Điều kiện ràng buộc (covenant)** | Chỉ tiêu có ngưỡng ≤/≥; 3 loại: nhập tay theo kỳ, tự tính dư nợ/hạn mức (%), tự tính dư nợ/giá trị TSBĐ (%). Trạng thái: Đạt / Sắp vi phạm (trong 10% biên) / Vi phạm / Chưa có dữ liệu / Quá hạn cập nhật. Khai báo = quản trị; cập nhật giá trị = nhập liệu. | `BAODAM.gs` |
| 4 | **Nhắc nợ ngoài ứng dụng** | Email hằng ngày (chỉ khi có nội dung, tối đa 1 lần/ngày, chỉ tới email quản trị khai báo, **không chứa số tài khoản**) + sự kiện Google Calendar cho kỳ đến hạn trong 60 ngày (không tạo trùng, gỡ khi đã trả đủ). Cần bấm “Tạo lịch chạy hằng ngày” một lần. | `NHACNO.gs` |
| 5 | **Thứ tự phân bổ tiền trả + lãi phạt** | Mặc định lãi phạt → lãi → gốc (cấu hình 6 thứ tự). Lãi quá hạn = lãi trong hạn × **150%** (cấu hình) trên số nợ quá hạn theo số ngày thực tế; lãi chậm trả mặc định 0%. **Là số ƯỚC TÍNH — đối chiếu thông báo của ngân hàng.** Ghi nhận “trả gộp”: một khoản tiền chia thành các dòng sổ PHAT/LAI/GOC (hậu tố -P/-L/-G), lỗi giữa chừng tự hoàn tác. | `PHANBO.gs`, `TRANONO.gs` |
| 6 | **Dự báo dòng tiền** | Lấy phần chưa trả của từng kỳ gốc/lãi theo lịch: quá hạn / từng tháng (1–24) / sau kỳ. Lãi kỳ tương lai tính trên dư nợ hiện tại (giả định không trả gốc sớm). VND và USD tách riêng; quy đổi USD theo tỷ giá mới nhất ± biên độ (kịch bản). | `DUBAO.gs` |
| 7 | **Tuổi nợ quá hạn** | Bậc 1–30 / 31–60 / 61–90 / trên 90 ngày theo **kỳ quá hạn cũ nhất còn chưa trả đủ** (gốc hoặc lãi). Không phải “nhóm nợ” theo quy định phân loại của ngân hàng. | `DUBAO.gs` |
| 8 | **Bảng điều hành** (lãnh đạo, chỉ đọc) | Vai trò XEM dùng được; có “In / lưu PDF”. Việc cần làm có nút mở thẳng khoản vay/màn liên quan. | `DUBAO.gs`, `QuanLyVayGiaoDien.html` |
| 9 | **Đối soát sao kê** | Dán/ chọn file CSV: tự nhận tiêu đề cột, số/ngày kiểu VN. Ghép tiền vào ↔ xác nhận giải ngân; tiền ra ↔ sổ trả nợ (cộng các dòng -P/-L/-G thành 1 giao dịch). Kết quả: Khớp / Lệch số tiền / Gợi ý (trùng số tiền + ngày ±3) / Nhiều ứng viên / Không có / Thiếu trên sao kê. **Chỉ đọc**, không ghi gì. | `DOISOATSAOKE.gs` |
| 10 | **Tài sản bảo đảm** | Đăng ký tài sản gắn hợp đồng, giá trị VND, hạn bảo hiểm; không xoá — “giải chấp” kèm lý do. Hiển thị tỷ lệ dư nợ/giá trị tài sản và cảnh báo bảo hiểm sắp/đã hết hạn. | `BAODAM.gs` |

**Giao diện:** mục “Quản lý vay” (8 màn con), thẻ điều hành ở Tổng quan (không thêm lời gọi máy chủ), nút “Xử lý” trên cảnh báo, “Trả gộp” trong Tất toán, xuất CSV (UTF-8 BOM, vô hiệu công thức), in/lưu PDF, Ctrl+K tự nhận mục mới, hỗ trợ 4 bảng màu × sáng/tối × di động.

## 2. Dữ liệu mới (sheet tự tạo khi dùng lần đầu — không đổi sheet cũ)
`TaiSanBaoDam`, `DieuKienRangBuoc`, `PheDuyetGiaiNgan`, `NhacNoNhatKy`; cấu hình thêm vào `CauHinhHeThong` (CHAN_VUOT_HAN_MUC, NGUONG_CB_HAN_MUC_1/2, BAT_DUYET_HAI_CAP, THU_TU_PHAN_BO, TY_LE_LAI_QUA_HAN, LAI_CHAM_TRA_NAM, NHAC_EMAIL_BAT/NHAN, NHAC_CALENDAR_BAT). Sổ trả nợ `TraNoHoSo` có thêm giá trị `LoaiTra = PHAT`. `kiemTraCauTrucDuLieu` liệt kê thêm 4 sheet (tuỳ chọn).

## 3. Phân quyền (api())
- XEM: xem hạn mức, dự báo, tuổi nợ, bảng điều hành, ràng buộc, tài sản, cấu hình, xem trước nhắc nợ, đối soát, danh sách phiếu duyệt, gợi ý phân bổ, lãi phạt.
- NHẬP LIỆU: trả gộp, đăng ký/giải chấp tài sản, cập nhật giá trị ràng buộc, gửi/thu hồi duyệt.
- QUẢN TRỊ: lưu cấu hình, khai báo/ngừng ràng buộc, duyệt/từ chối, gửi thử email, đồng bộ Calendar, tạo lịch chạy.
- `guiNhacNoHangNgay` là đích của trình kích hoạt (không nhận tham số, tối đa 1 email/ngày) — thuộc danh sách ngoại lệ có chủ đích trong `chay_bao_mat.js`.

## 4. Quyền Google cần cấp thêm
Dự án không khai báo `oauthScopes` cố định nên Google tự yêu cầu cấp quyền **gửi email** (`MailApp`) và **Lịch** (`CalendarApp`) khi chạy lần đầu hàm tương ứng. Hạn mức gửi email: tài khoản cá nhân ~100 thư/ngày, Workspace ~1.500/ngày (hệ thống chỉ gửi tối đa 1 thư/ngày).

## 5. Kiểm thử
| Bộ kiểm thử | Kết quả |
|---|---|
| `chay_phan_bo.js` — lãi phạt (tính tay), phân bổ, trả gộp, hoàn tác | 17/17 |
| `chay_han_muc.js` — hạn mức, chặn giải ngân, tài sản, ràng buộc, dự báo, tuổi nợ, bảng điều hành, tổng quan | 20/20 |
| `chay_nhac_no.js` — email/Calendar (mock), chống trùng, gửi lỗi, gỡ sự kiện | 12/12 |
| `chay_doi_soat_sao_ke.js` — phân tích số/ngày/CSV, ghép, tích hợp | 13/13 |
| `chay_duyet_hai_cap.js` — hai người dùng, revision, hết hiệu lực, thu hồi | 11/11 |
| `chay_hieu_nang_quan_ly_vay.js` — đọc range không tăng theo quy mô (100/1.000/5.000) | 24 phép đo |
| `chay_quan_ly_vay_ui.js` — Chromium: 8 màn, XSS, CSV, vai trò, sáng/tối, di động | 72/72 |
| Hồi quy: `npm test` (toàn bộ bộ cũ), `chay_giao_dien` 189/189, `chay_bao_mat` (mọi API mới từ chối ẩn danh/lạ/XEM) | xem CHANGELOG |

**Hiệu năng (giả lập):** sau khi dùng chung ngữ cảnh đọc, “Bảng điều hành” giảm từ 58–67 lần đọc range xuống 9–11 và **không tăng theo số khoản** (100 → 5.000 khoản: 9 → 11 lần). CPU Node ở 5.000 khoản: bảng điều hành ≈ 1,5 s, hạn mức ≈ 0,07 s.

## 6. Việc đã cân nhắc nhưng CHƯA làm
- Không tự động ghi nhận trả nợ từ sao kê (đối soát chỉ đọc, tránh ghi nhầm tiền).
- Không phân loại “nhóm nợ” theo quy định ngân hàng; không tính lãi phạt chính thức.
- Hạn mức coi là VND; chưa hỗ trợ hạn mức theo USD hay hạn mức con theo mục đích.
- Dự báo chưa gồm khoản giải ngân dự kiến mới và chưa mô phỏng trả gốc sớm.
- Cần kiểm tra thực tế: định dạng sao kê của từng ngân hàng, giờ chạy trình kích hoạt (±1 giờ), quyền MailApp/CalendarApp trên tài khoản triển khai.
