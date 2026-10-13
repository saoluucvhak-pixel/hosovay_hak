# Hướng dẫn: Mẫu Word (DOCX) và triển khai

Mục tiêu: **chỉ cần sửa file Word, tải lại mẫu, phần mềm tự sinh hồ sơ theo mẫu mới — không sửa code dựng biểu mẫu.**

## 1. Cách hoạt động

```
layDuLieuDayDu(maHoSo)
 → kiemTraTienDePhatHanh_   (chặn nếu tiền chưa hợp lệ, nêu rõ trường cần sửa)
 → chonMauDocx_             (mẫu "Hiệu lực" khớp loại chứng từ + loại tiền + số người thụ hưởng + ngân hàng)
 → taoBienDayDu_ / taoBienDong_  (chuẩn hoá placeholder; tiền luôn là số nguyên "25.000")
 → docxDienMau_             (đọc BẢN SAO của mẫu, điền thẳng vào XML của .docx)
 → nhân bản hàng bảng thụ hưởng ({{CT.*}})
 → docxKiemTraKetQua_       (không sót {{…}}, đủ số hàng, số tiền có mặt trong văn bản)
 → lưu DOCX vào thư mục Drive của hồ sơ (_L1, _L2… không ghi đè) → xuất PDF (Drive API)
 → ghi tab PhatHanhChungTu + NhatKyHeThong → cập nhật cột Link_* của hồ sơ
```

Mọi nút (Tạo trọn bộ, Tạo lại từng chứng từ) đều đi qua `phatHanhChungTu_()` (PhatHanh.gs).
Chưa có mẫu phù hợp → dùng biểu mẫu dựng sẵn bằng code và **ghi rõ** trong kết quả (cột `Nguon = MAC_DINH_CODE`).

**Vì sao điền thẳng XML thay vì chuyển sang Google Docs?** Chuyển DOCX → Google Docs → DOCX làm Google dựng lại
font, lề, header/footer, bảng, ô ghép… không bảo toàn bố cục như Word. Engine này chỉ thay chữ trong XML, mọi thứ khác của
file giữ nguyên từng byte. Google Docs/Drive API chỉ dùng **một lần ở cuối** để xuất PDF.

## 2. Soạn mẫu trong Word

Gõ placeholder dạng `{{NHOM.TEN}}` (chữ HOA). Danh mục đầy đủ có ngay trong tab **Mẫu Word (DOCX)** (hoặc `DOCX_KHOA_CHUNG_` / `DOCX_KHOA_DONG_` trong `DocxEngine.gs`).

| Nhóm | Ví dụ |
|---|---|
| Công ty | `{{CONG_TY.TEN}}` `{{CONG_TY.MST}}` `{{CONG_TY.DIA_CHI}}` `{{CONG_TY.NGUOI_DAI_DIEN}}` `{{CONG_TY.TK_USD}}` |
| Hợp đồng | `{{HOP_DONG.SO}}` `{{HOP_DONG.NGAY}}` `{{HOP_DONG.NGAN_HANG}}` `{{HOP_DONG.CHI_NHANH}}` `{{HOP_DONG.HAN_MUC}}` |
| Hồ sơ | `{{HO_SO.MA}}` `{{HO_SO.SO_TIEN}}` `{{HO_SO.SO_TIEN_BANG_CHU}}` `{{HO_SO.TY_GIA}}` `{{HO_SO.SO_TIEN_QUY_DOI}}` `{{HO_SO.NGAY_GIAI_NGAN}}` |
| Ngày | `{{NGAY.GIAI_NGAN_DAY_DU}}` ("ngày 15 tháng 09 năm 2026") `{{NGAY.HOM_NAY}}` |
| Tổng | `{{BANG_KE.TONG_TIEN}}` `{{BANG_KE.TONG_TIEN_QUY_DOI}}` `{{BANG_KE.TONG_TIEN_BANG_CHU}}` |
| Từng người thụ hưởng | `{{CT.STT}}` `{{CT.TEN}}` `{{CT.SO_TK}}` `{{CT.NGAN_HANG}}` `{{CT.LOAI_CHUNG_TU}}` `{{CT.SO_TAI_LIEU}}` `{{CT.NOI_DUNG}}` `{{CT.SO_TIEN}}` `{{CT.SO_TIEN_QUY_DOI}}` |

Quy tắc:
- **Bảng thụ hưởng**: đặt các `{{CT.*}}` vào **một hàng duy nhất** (hàng mẫu) của bảng. Engine nhân bản hàng đó theo số người thụ hưởng, giữ nguyên định dạng, độ cao, ô ghép ngang; hàng tiêu đề đặt "Repeat as header row" thì lặp ở mọi trang. Hàng tổng đặt riêng, dùng `{{BANG_KE.TONG_TIEN}}`.
- **Mẫu 1 khoản (UNC)**: có thể đặt `{{CT.*}}` ngoài bảng; chỉ hợp lệ khi hồ sơ có **đúng 1** dòng thụ hưởng (đặt "Số người từ 1 đến 1").
- Placeholder có thể bị Word tách thành nhiều đoạn định dạng — vẫn nhận; định dạng của đoạn đầu được giữ.
- Chạy được trong header, footer, thân văn bản, bảng.
- Số tiền luôn là **số nguyên có dấu chấm hàng nghìn** (`25.000`). USD bằng chữ: "Hai mươi lăm ngàn đô la Mỹ" (không cents). Chỉ `{{HO_SO.TY_GIA}}` có thể có phẩy thập phân (`26.145,5`).
- Lưu file bằng Word: **Save As → Word Document (.docx)** (không dùng .doc).

## 3. Tải và quản lý mẫu (tab "Mẫu Word (DOCX)")

Khai báo: **Mã mẫu, Tên mẫu, Ngân hàng** (trống = mọi ngân hàng; nhận "BIDV", "VCB"…), **Loại tiền** (VND/USD/Tất cả), **Loại chứng từ**, **Số người thụ hưởng áp dụng (từ–đến)**.

- Tải lại **cùng Mã mẫu** = phiên bản mới (v2, v3…); bản cũ → "Hết hiệu lực" (file vẫn giữ). Có thể "Đặt hiệu lực" lại bản cũ để quay lui.
- Hệ thống từ chối mẫu: không phải .docx, placeholder lạ/gõ sai, mẫu nhiều người mà không có hàng `{{CT.*}}`.
- Nút **Chạy thử** kiểm tra mẫu với một hồ sơ thật (không tạo file).
- Chọn mẫu khi phát hành: Hiệu lực + đúng loại + loại tiền (cụ thể hơn "Tất cả") + ngân hàng (cụ thể hơn trống) + khoảng số người hẹp hơn + phiên bản cao hơn.
- Gợi ý: Đề nghị giải ngân (1–999), UNC (1–1), Bảng kê (2–999), HDMB (USD).
- Mẫu thử nằm ở `mau_thu/` (VND/USD; 1 khoản/nhiều khoản; Đề nghị; HDMB). Sinh lại bằng `python3 kiem_thu/tao_mau_thu.py`.

## 4. Quy tắc tiền (áp dụng cho dữ liệu lưu và chứng từ)

VND/USD là số nguyên; không cents; `25.000,50`, `25000.50`, `0,5` bị báo lỗi, không tự làm tròn. `SoTienQuyDoi = ROUND(USD × TyGiaBan, 0)` bằng số học nguyên (BigInt), không làm tròn tỷ giá trước.

**Hồ sơ lịch sử có số lẻ** (không tự sửa dữ liệu cũ):
| Tình huống | Hành vi |
|---|---|
| Hồ sơ mới | Bắt buộc mọi số tiền hợp lệ |
| Hồ sơ cũ không số lẻ | Xử lý bình thường |
| Hồ sơ cũ có số lẻ | Xem được nguyên trạng; giao diện hiện cảnh báo, ô tiền chỉ đọc |
| Chỉ sửa thông tin khác | Lưu qua `capNhatThongTinPhiTienTe`: số tiền cũ **không bị ghi lại/biến đổi**; không đổi số dòng; ghi `NhatKyHeThong` |
| Sửa số tiền | Nút "Sửa số tiền": ô lẻ bị xoá để nhập lại **số nguyên**; nhật ký lưu giá trị lẻ cũ |
| Phát hành chứng từ | Bị chặn, liệt kê từng trường (`ChiTietThuHuong dòng 2 – SoTien = …`) |
| Báo cáo | Bị chặn nếu có số lẻ cũ; nêu mã hồ sơ |

Menu Google Sheet **Hồ Sơ Vay NH → Rà soát tiền lẻ lịch sử** ghi danh sách vào tab `CanRaSoat_TienLe`.

## 5. Triển khai

1. Chép toàn bộ `*.gs` / `*.html` vào dự án Apps Script. **File mới:** `Tien.gs`, `Auth.gs`, `DocxEngine.gs`, `MauDocx.gs`, `PhatHanh.gs`. (Có thể dùng clasp.)
2. `appsscript.json` đã bật Drive (Advanced Service, v2): cần **cấp lại quyền** khi chạy lần đầu.
3. Mở Sheet → menu **Khởi tạo / kiểm tra cấu trúc Sheet** (thêm tab `DM_MauDocx`, `PhatHanhChungTu`, `NhatKyHeThong` và cột link DOCX/PDF/XLSX; không xoá dữ liệu cũ).
4. Menu **Cấu hình quản trị viên**: nhập email quản trị. Khi **chưa** cấu hình, mọi người đều thao tác được mẫu/cấu hình và giao diện hiện cảnh báo đỏ.
5. (Tuỳ chọn) menu **Sửa link chứng từ cũ**: chuyển link `.xlsx` bị ghi nhầm vào cột `Link_ChungTuThanhToan_PDF` sang `Link_ChungTuThanhToan_XLSX`.
6. **Triển khai lại Web App (New version).**
   ⚠ `appsscript.json` hiện để `"access": "ANYONE_ANONYMOUS"` với `executeAs: USER_DEPLOYING`: ai có link đều chạy bằng quyền người triển khai, và `Session.getActiveUser().getEmail()` thường **rỗng** với người ngoài domain nên không phân biệt được ai là quản trị. Khuyến nghị đặt *Who has access* = domain công ty (hoặc chỉ người dùng đã đăng nhập) — đây là thay đổi triển khai, tôi **không** tự đổi để không làm ngưng hệ thống đang chạy.
7. Vào tab **Mẫu Word (DOCX)** tải các mẫu.

## 6. Giới hạn đã biết của engine (không âm thầm đổi mẫu)

- **Hộp văn bản (text box)** chứa placeholder: vẫn thay nhưng cảnh báo (đoạn chứa hộp văn bản bị bỏ qua nếu placeholder nằm ở đoạn ngoài).
- **Ô ghép dọc (vMerge) trong hàng mẫu**: cảnh báo — nhân bản có thể lệch bố cục. Ô ghép **ngang** (gridSpan) dùng bình thường.
- Một hàng mẫu cho mỗi bảng; placeholder `{{CT.*}}` không nên đặt rải ở nhiều bảng khác nhau.
- Không hỗ trợ điều kiện/vòng lặp ngoài hàng bảng. Cần logic phức tạp hơn → dùng thư viện DOCX chuyên dụng (docxtemplater/…) chạy ở dịch vụ ngoài và gọi qua `UrlFetchApp`.
- **PDF** được xuất qua Google (DOCX → Google Docs trung gian → PDF): font/khoảng cách có thể khác Word đôi chút. Cần PDF giống hệt Word 100% → dùng dịch vụ chuyển đổi ngoài (LibreOffice/Word).
- Nội dung có `{{` hoặc `}}` ngoài placeholder sẽ chặn phát hành (tránh lẫn).

## 7. Chạy kiểm thử

```bash
kiem_thu/chay_tat_ca.sh            # logic + engine DOCX + tích hợp (cần python-docx, lxml, LibreOffice, pdftotext, zip/unzip)
node kiem_thu/chay_giao_dien.js    # giao diện bằng Chromium + Playwright (google.script.run giả lập)
```
Xem `TRANG_THAI_BAN_GIAO.md` để biết cái gì đã được chứng minh ở môi trường nào.
