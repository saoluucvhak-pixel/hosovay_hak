# Hướng dẫn: Mẫu văn bản (Word/Excel), kiến trúc, triển khai, rollback

Mục tiêu: **sửa file Word/Excel, tải lại mẫu, phần mềm tự sinh hồ sơ theo mẫu mới — không sửa code dựng biểu mẫu.**
Hỗ trợ **.docx** (Đề nghị giải ngân, Hợp đồng mua bán ngoại tệ…) và **.xlsx** (Ủy nhiệm chi, Bảng kê giải ngân — đúng định dạng Excel mà ngân hàng đang dùng).

## 1. Kiến trúc

```
Mẫu (.docx/.xlsx) → Data Mapping → Template Renderer → Document Validator → DOCX|XLSX + PDF → Google Drive → Audit Log
```

| Module | Trách nhiệm |
|---|---|
| `TEMPLATEREGISTRY.gs` | Tab `DM_MauVanBan`: phiên bản bất biến, trạng thái, **mặc định**, **khôi phục**, chọn mẫu theo (loại tài liệu, loại tiền, số người, ngân hàng), cache |
| `TEMPLATESERVICE.gs` | Tải mẫu lên + kiểm tra + đăng ký phiên bản; kiểm tra lại (hash); **xem trước** với dữ liệu thử/hồ sơ thật |
| `TEMPLATEBUILDER.gs` | **Trình tạo mẫu từ file Word thô**: liệt kê đoạn văn, gợi ý trường theo dữ liệu công ty/hợp đồng, chèn `{{...}}` vào XML, xoá hàng ví dụ thừa |
| `TEMPLATECONVERTER.gs` | Chuyển DOCX/XLSX → Google Docs/Sheets (Drive API) để **xuất PDF** và **mở bằng Google** |
| `TEMPLATEMAPPER.gs` | **Từ điển placeholder** (nguồn, kiểu, bắt buộc/tuỳ chọn, giá trị khi trống, bí danh) + ánh xạ hồ sơ → giá trị |
| `DOCUMENTRENDERER.gs` | Điền placeholder trực tiếp vào XML của DOCX/XLSX; điểm vào `renderTaiLieu_()`; adapter chế độ B |
| `TABLERENDERER.gs` | Nhân bản hàng bảng thụ hưởng (Word `<w:tr>`, Excel `<row>` + dời công thức/ô ghép/vùng in) |
| `DOCUMENTVALIDATOR.gs` | Kiểm tra tiền trước phát hành, trường bắt buộc, tài liệu sau khi điền |
| `DOCUMENTEXPORT.gs` | Điền + kiểm tra + lưu tệp chính + PDF |
| `DOCUMENTSTORAGE.gs` | Thư mục `HồSơ/DOCX|XLSX|PDF`, tên tệp `_L{n}`, cập nhật **đúng cột** link, sửa link cũ |
| `DOCUMENTAUDIT.gs` | `LichSuPhatHanhTaiLieu` (kể cả lần **lỗi**), `NhatKyHeThong` |
| `DOCUMENTSERVICE.gs` | `phatHanhChungTu_()` — điểm vào duy nhất; chống tạo trùng; danh sách chứng từ hồ sơ; xem trước chứng từ |
| `Tien.gs`, `NumberToWords.gs` | Quy tắc tiền nguyên, quy đổi BigInt, số tiền bằng chữ |
| `AUTH.gs` | Quản trị viên (mẫu, cấu hình, xuất toàn bộ, rà soát) |

**Chế độ xử lý.** *Mặc định (XML)*: điền thẳng vào XML nên giữ nguyên font/lề/khổ giấy/logo/header/footer/ô ghép/hộp kiểm — đã đo trên 4 biểu mẫu thật. *Chế độ A* (điền bên trong Google Docs bằng DocumentApp) **không** triển khai: chuyển DOCX qua Google Docs có nguy cơ làm lệch bố cục và chưa có phép đo trên Google để chứng minh ngược lại; Google chỉ dùng ở bước cuối để xuất PDF/mở xem. *Chế độ B* (bộ xử lý DOCX chuyên dụng, vd docxtpl): có **adapter** (`renderQuaDichVuNgoai_`), **tắt mặc định**, chỉ chạy khi *Cài đặt → Cấu hình hệ thống* đặt "EXTERNAL" + URL https; hợp đồng giao tiếp ở mục 8. Không tự triển khai dịch vụ nào, không phát sinh chi phí.

## 2. Soạn mẫu

Placeholder `{{NHOM.TEN}}` (chữ HOA). Danh mục đầy đủ (nguồn, kiểu, bắt buộc, giá trị khi trống, bí danh) hiển thị ở *Cài đặt → Quản lý mẫu văn bản → Danh mục placeholder* và nằm trong `TEMPLATEMAPPER.gs` (`TEMPLATE_TU_DIEN_RAW_`). Mở rộng: thêm 1 dòng vào từ điển + 1 giá trị trong `taoBienDayDu_`/`taoBienDong_`.

Tên chuẩn: `CONG_TY.{TEN, DIA_CHI, MA_SO_THUE, NGUOI_DAI_DIEN, CHUC_VU, TAI_KHOAN_VND, TAI_KHOAN_USD, …}` · `HOP_DONG.{SO_HOP_DONG, NGAY_KY, TEN_NGAN_HANG, CHI_NHANH, …}` · `HO_SO.{MA_HO_SO, SO_GIAY_NHAN_NO, NGAY_GIAI_NGAN, NGAY_DEN_HAN, SO_TIEN, SO_TIEN_BANG_CHU, TY_GIA, SO_TIEN_QUY_DOI, THOI_HAN_VAY, …}` · `CT.{STT, TEN_NGUOI_HUONG, SO_TAI_KHOAN, NGAN_HANG, NOI_DUNG, SO_TIEN, SO_TIEN_QUY_DOI, …}` · `BANG_KE.{TONG_TIEN, TONG_TIEN_QUY_DOI, …}` · `NGAY_IN` · `NGUOI_LAP_BIEU`. Tên cũ (`CONG_TY.MST`, `HO_SO.MA`, `CT.TEN`…) vẫn dùng được (bí danh).

Quy tắc chung:
- **Bảng thụ hưởng**: đặt `{{CT.*}}` trong **một hàng duy nhất** (Word: hàng của bảng; Excel: một hàng của sheet). Hàng đó được nhân bản theo số người thụ hưởng, giữ nguyên chiều rộng cột, border, font, căn lề, độ cao, ô ghép ngang, tiêu đề lặp trang (Word) — và với Excel: hàng bên dưới (Tổng cộng, chữ ký) tự dời xuống, công thức `SUM(E7:E7)` tự giãn thành `SUM(E7:E26)`, ô ghép/vùng in dời theo. Hàng tổng đặt riêng, dùng `{{BANG_KE.TONG_TIEN}}` (hoặc công thức Excel).
- **Mẫu 1 người (UNC)**: `{{CT.*}}` có thể nằm rải rác (Excel/Word); đặt điều kiện số người = **1**.
- **Excel**: ô chỉ chứa 1 placeholder tiền được ghi dạng **số** (giữ định dạng số của ô; công thức cộng vẫn chạy); ô khác ghi dạng chữ. Bắt Excel tính lại công thức khi mở (`fullCalcOnLoad`), bỏ `calcChain` cũ.
- **Word**: placeholder bị Word tách thành nhiều đoạn định dạng vẫn nhận (định dạng của đoạn đầu được giữ); chạy trong thân văn bản, bảng, header, footer; **hộp kiểm (content control) và logo giữ nguyên**.
- **Tiền**: luôn số nguyên có dấu chấm hàng nghìn (`25.000`); USD bằng chữ "Hai mươi lăm ngàn đô la Mỹ" (không cents); chỉ tỷ giá có phần thập phân (`25.810`, `26.145,5`).
- **Chứng từ thanh toán (UNC/Bảng kê) luôn bằng VND quy đổi** (đúng các biểu mẫu bạn gửi): dùng `{{CT.SO_TIEN_QUY_DOI}}`; với hồ sơ VND giá trị bằng số tiền gốc. Nhờ vậy *một* mẫu dùng cho cả hồ sơ VND và USD (đặt loại tiền = "Tất cả").
- **Trường bắt buộc**: mẫu có dùng mà dữ liệu trống → chặn phát hành, nêu `{{KHOÁ}}` và nguồn dữ liệu (vd `DM_CongTy.NguoiDaiDien`). Trường tuỳ chọn trống → giá trị mặc định của từ điển (thường để trống).
- Màu chữ đỏ trong biểu mẫu gốc (đánh dấu ô cần điền) được giữ nguyên vì là định dạng của mẫu. Muốn bản in màu đen: trong Word đặt chữ chứa placeholder về màu *Automatic* rồi tải lại thành phiên bản mới.

### Chuẩn bị các biểu mẫu gốc của bạn
`kiem_thu/chuan_bi_mau_that.py <thư_mục_4_file_gốc>` đặt placeholder vào bản sao (không sửa file gốc) → `mau_that/`: `HDTD_USD_1_KHOAN.docx`, `HDTD_USD_NHIEU_KHOAN.docx` (thêm hàng "TC"), `HDMB_USD.docx`, `UNC_1_KHOAN.xlsx`, `BANG_KE_NHIEU_KHOAN.xlsx` (giữ sheet HAK); `HDTD_VND_1_KHOAN.docx`, `HDTD_VND_NHIEU_KHOAN.docx` do trình tạo mẫu sinh ra (mục 2b). Phần cố định của riêng công ty (vd "do Sở Kế hoạch và Đầu tư TP Đà Nẵng cấp lần thứ 8 ngày 25/04/2025", số HĐ khung "…/BIDV-HAK" ở đầu HĐMB) **không** đặt placeholder — chưa có trường dữ liệu tương ứng; sửa trực tiếp trong Word khi thay đổi.
Hồ sơ VND dùng 2 mẫu HĐTD VND (1 người / 2+ người). Loại tiền/ngân hàng khác chưa có mẫu → dùng biểu mẫu mặc định cho tới khi bạn thêm mẫu (mục 2b).

## 2b. THÊM MẪU MỚI KHÔNG CẦN SỬA CODE

Có 2 cách, cả hai đều làm trên giao diện *Cài đặt → Quản lý mẫu văn bản* (không đụng `.gs`):

**Cách 1 — Trình tạo mẫu (khuyên dùng cho file Word có sẵn của ngân hàng/công ty).**
1. Lấy file Word biểu mẫu **đã điền số liệu thật** (hoặc chính chứng từ vừa phát hành). *Không cần gõ `{{...}}`.*
2. Khung **"🧩 Tạo mẫu từ file Word có sẵn"** → chọn file → **Phân tích file**. Hệ thống liệt kê từng đoạn văn (kèm vị trí "Bảng 2, hàng 2, ô 5") và **tự gợi ý** (✨ nền vàng):
   - chỗ trùng dữ liệu công ty / hợp đồng đang lưu (tên, địa chỉ, MST, điện thoại, tài khoản, người đại diện, số/ngày hợp đồng, tên ngân hàng, chi nhánh) — kể cả số điện thoại/tài khoản khác dấu chấm, khoảng trắng;
   - nhãn thường gặp: "Thời hạn vay: N ngày", "rút số tiền vay là: …", "(Bằng chữ: …)", "ngày … tháng … năm …";
   - **bảng thụ hưởng**: nhận dạng tiêu đề cột (TT, Nội dung, Số tiền, Tên đơn vị/số tài khoản/ngân hàng…) và đề xuất trường cho hàng dữ liệu đầu tiên (bỏ nhãn "Số TK :" / "Tại :").
3. Bấm ✓ ở từng gợi ý hoặc **✨ Áp dụng tất cả gợi ý**. Phần còn lại: **bôi chọn chữ** trong khung (kéo chuột, hoặc chạm kéo trên điện thoại) → mở ô **"Trường dữ liệu"** (danh sách thả xuống, có tên tiếng Việt, chia nhóm Công ty / Hợp đồng / Hồ sơ / Ngày / Tổng cộng / Người thụ hưởng) → **chọn trường là tự gán** vào chữ đang bôi chọn (1 thao tác). Chỉ **đặt con trỏ** (không bôi chọn) rồi chọn trường = **chèn** trường tại vị trí đó (vd sau nhãn "Tài liệu liên quan: "). Gán nhầm thì bấm ✕ cạnh vùng đã gán.
4. Bảng thụ hưởng có nhiều dòng ví dụ: giữ **1 hàng** làm hàng mẫu, tích **"xoá cả hàng bảng này"** ở các hàng ví dụ còn lại (không xoá hàng tiêu đề và hàng tổng "TC"). Ô tổng cộng: chọn trường "Tổng cộng số tiền" / "Tổng cộng quy đổi VND".
5. **⚙️ Tạo mẫu & kiểm tra** → hệ thống chèn placeholder (giữ định dạng của chữ đầu tiên bị thay, đoạn không đổi giữ nguyên từng byte; ô bảng chỉ chứa 1 trường tự căn lề theo kiểu: tiền → phải, ngày/STT → giữa, chuỗi → trái), kiểm tra lại toàn bộ. Có thể **⬇ tải file mẫu về xem** bằng Word.
6. Ngay dưới kết quả có khung **"Thêm mẫu này vào hệ thống"**: điền Mã mẫu, Tên mẫu, Ngân hàng, Loại tiền, Loại chứng từ, Điều kiện số người (trống = tự nhận) rồi bấm **➕ Thêm mẫu này**. Xong — mẫu có ngay trong danh sách bên dưới ("Xem trước" để kiểm tra). Phát hành lấy mẫu mới theo quy tắc chọn mẫu (mục 3).

**In ra đúng như mẫu:** hệ thống chỉ ĐIỀN dữ liệu vào bản sao của mẫu — font, cỡ chữ, màu, căn lề, viền bảng, khổ giấy, logo, header/footer giữ đúng như file bạn tải lên. Sửa mẫu trong Word thế nào thì bản DOCX in ra thế đó (tải lại thành phiên bản mới). Bản PDF do Google chuyển đổi nên có thể lệch nhẹ font/khoảng cách so với Word.

**Cách 2 — Tự gõ `{{...}}` trong Word/Excel** (mục 2) rồi tải ở khung "Tải mẫu văn bản" (bắt buộc với file Excel).

Ví dụ thực tế: 2 mẫu **HĐTD VND** (`mau_that/HDTD_VND_1_KHOAN.docx`, `HDTD_VND_NHIEU_KHOAN.docx`) được tạo từ 2 file Word của công ty bằng đúng chức năng trên (`kiem_thu/tao_mau_vnd.js` chỉ là kịch bản tự động hoá các bước bấm trên giao diện): 22–23 vùng được gợi ý tự động, còn lại chọn tay.
Điều kiện khi đăng ký: VND 1 người → *Đề nghị giải ngân, VND, điều kiện `1`*; VND nhiều người → *điều kiện `2+`*.
Giới hạn: chỉ .docx; chỉ nhận dạng chữ nằm trong `<w:t>` (không phải hộp văn bản/WordArt); không đổi định dạng; vùng chọn trong 1 đoạn.

## 2c. Tài liệu kèm theo từng đề nghị giải ngân

Dòng "Tài liệu liên quan: …" của văn bản đề nghị (placeholder `{{HO_SO.TAI_LIEU_CHUNG_MINH}}`) khác nhau theo từng hồ sơ. Khi lập hồ sơ (bước "Giấy nhận nợ"), mục **"Tài liệu kèm theo đề nghị này"** có các ô **tick** (Hóa đơn GTGT, Bảng lương, Hợp đồng kinh tế, Biên bản nghiệm thu, Phiếu nhập kho, Giấy đề nghị thanh toán…) và một ô gõ thêm. Chuỗi tạo ra, ví dụ "Hóa đơn GTGT, Bảng lương", được lưu theo hồ sơ và in vào văn bản; mở lại hồ sơ cũ thì ô tương ứng được tick lại. Không tick và không gõ gì → "Hóa đơn mua hàng và hợp đồng kinh tế đính kèm". Danh mục các ô tick sửa ở *Cài đặt → Cấu hình hệ thống → Danh mục tài liệu kèm theo* (mỗi dòng một mục, không dùng dấu phẩy).

## 2d. Loại hồ sơ giải ngân (hồ sơ không dùng HĐTD)

Mỗi hồ sơ chọn **Loại hồ sơ giải ngân** ngay ở bước "Giấy nhận nợ". Bạn tự đặt tên loại và tự chọn bộ chứng từ của từng loại ở *Cài đặt → Cấu hình hệ thống → Loại hồ sơ giải ngân*: ☐/☑ **Văn bản đề nghị (HĐTD)**, ☐/☑ **UNC / Bảng kê**, ☐/☑ **HĐ mua bán ngoại tệ** (chỉ có tác dụng với hồ sơ USD). Có sẵn 2 loại: "Giải ngân theo HĐTD" (đủ bộ, giống trước đây) và "Không dùng HĐTD" (bỏ văn bản đề nghị, vẫn UNC/Bảng kê và HĐMB nếu USD). Thêm loại khác tuỳ ý (ví dụ "Chỉ UNC").
- "Tạo trọn bộ" và *Danh sách chứng từ hồ sơ* chỉ lập/hiện các chứng từ mà loại hồ sơ đó bật; nút tạo riêng một chứng từ không thuộc loại sẽ báo rõ nguyên nhân (đổi loại hồ sơ hoặc bật chứng từ ở Cài đặt).
- Hồ sơ cũ chưa chọn loại dùng loại **đầu tiên** của danh mục (= đủ bộ như cũ). Chứng từ đã phát hành không bị ảnh hưởng khi đổi loại.
- Cột mới `LoaiHoSoGiaiNgan` tự được thêm vào tab `HoSoGiaiNgan` khi lưu hồ sơ (hoặc khi chạy "Khởi tạo / kiểm tra cấu trúc Sheet").

## 2e. Thêm LOẠI TÀI LIỆU mới (đa dạng hồ sơ) — không sửa mã

Ngoài 3 loại hệ thống (Văn bản đề nghị, UNC/Bảng kê, HĐ mua bán ngoại tệ), bạn tự thêm loại tài liệu khác (Giấy nhận nợ, Tờ trình, Hợp đồng thế chấp…):
1. *Cài đặt → Cấu hình hệ thống → **Loại tài liệu*** → "Thêm loại tài liệu": **Mã** (chữ HOA/số/gạch dưới, ví dụ `GIAY_NHAN_NO`), **Tên hiển thị**, **Áp dụng cho** (Tất cả / Chỉ hồ sơ USD / Chỉ hồ sơ VND) → Lưu.
2. *Quản lý mẫu văn bản*: ô "Loại chứng từ" nay có loại mới → tải mẫu Word/Excel cho loại đó (tạo bằng "Tạo mẫu từ file Word có sẵn" hoặc tự gõ `{{...}}`). Loại tự thêm **không** bắt buộc có bảng người thụ hưởng; điều kiện số người để trống = "1+".
3. *Loại hồ sơ giải ngân*: bảng có thêm cột cho loại mới → tick loại tài liệu cho từng loại hồ sơ (ví dụ "Đủ bộ + Giấy nhận nợ").
4. Hồ sơ chọn loại đó thì **Tạo trọn bộ** lập luôn tài liệu mới (từ mẫu); "Danh sách chứng từ hồ sơ" có thêm một dòng với đủ nút Xem trước/Tạo/Tạo lại/DOCX/PDF/Lịch sử.
- Loại tự thêm **chỉ lập từ mẫu** (không có biểu mẫu dựng sẵn bằng code). Trọn bộ gặp loại chưa có mẫu phù hợp → bỏ qua kèm ghi chú, không làm hỏng cả bộ.
- Link của loại tự thêm nằm ở tab `LichSuPhatHanhTaiLieu` và danh sách chứng từ hồ sơ (không có cột link riêng trong `HoSoGiaiNgan`).
- Không bỏ được loại đang có mẫu hiệu lực (ngừng mẫu trước).
- Giới hạn: mẫu chỉ dùng được các placeholder có trong danh mục (công ty, hợp đồng, hồ sơ, người thụ hưởng, ngày…). Dữ liệu mới chưa có trong danh mục cần thêm trường (chưa có chức năng "trường tuỳ chỉnh").

**Công ty & Hợp đồng vay** nay nằm trong *Cài đặt* (nút "🏢 Công ty & Hợp đồng vay"), không còn ở menu bên trái.

## 3. Quản lý mẫu — *Cài đặt → Quản lý mẫu văn bản*

Khai báo: Mã mẫu, Tên mẫu, **Ngân hàng** (trống = mọi NH; nhận "BIDV", "VCB"…), **Loại tiền** (VND/USD/Tất cả), **Loại chứng từ** (Đề nghị giải ngân / Chứng từ thanh toán / HĐ mua bán ngoại tệ), **Điều kiện số người thụ hưởng** (`1` · `2-999` · `2+`), mặc định, ghi chú, file `.docx/.xlsx`.
Bảng `DM_MauVanBan`: `MaMau, TenMau, NganHang, LoaiTaiLieu, LoaiTien, DieuKienSoDong, PhienBan, NgayHieuLuc, TrangThai, FileDocxId, FileGoogleDocId, NgayTao, NguoiTao, NgayCapNhat, NguoiCapNhat` + `LoaiFile, SoNguoiHuongTu/Den, TenFile, KichThuocKB, CoHangMau, DanhSachPlaceholder, CanhBao, HashFile, MacDinh, GhiChu`.

Thao tác: tải lên · xem danh sách · tải file (link Drive) · **Kiểm tra** (placeholder + toàn vẹn hash) · **Xem trước** với dữ liệu thử hoặc hồ sơ thật (tạo file + PDF vào `XemTruoc/`, không phát hành) · **Ngừng** · **Khôi phục** phiên bản cũ · **Mặc định** · **Lịch sử chỉnh sửa** · **Xoá** (chỉ phiên bản CHƯA từng dùng phát hành tài liệu; file mẫu vào thùng rác Drive, khôi phục được ~30 ngày; mẫu đã dùng chỉ Ngừng được).
Bất biến: mỗi phiên bản là một file Drive riêng + hash lúc tải; **file mẫu bị sửa ngoài hệ thống (hash khác) → chặn phát hành**, yêu cầu tải phiên bản mới. Mẫu không bao giờ bị sửa khi phát hành (chỉ đọc, ghi ra bản sao).
Chọn mẫu: Hiệu lực + đúng loại + loại tiền (cụ thể hơn "Tất cả") + ngân hàng (cụ thể hơn trống) + **mặc định** + khoảng số người hẹp hơn + phiên bản cao hơn.

## 4. Phát hành chứng từ — khu "Thực hiện" của hồ sơ

**Danh sách chứng từ hồ sơ**: Tên tài liệu · Mã mẫu · Phiên bản · Ngân hàng · Loại tiền · Trạng thái · Ngày tạo · Người tạo; thao tác **Xem trước · Tạo chứng từ/Tạo lại · DOCX · PDF · XLSX · Google · Lịch sử · Thư mục**; tick nhiều tài liệu → **Xuất các tài liệu đã chọn**. **Tạo trọn bộ** gọi cùng engine.
Điều kiện nghiệp vụ giữ nguyên: 1 người → UNC; nhiều người → Bảng kê; USD → thêm Hợp đồng mua bán ngoại tệ; VND → không có.
- Mỗi lần phát hành sinh **file mới** `…_L1`, `…_L2` trong `HồSơ/DOCX|XLSX|PDF/`; bản cũ → "Đã thay thế" (file giữ nguyên). Không ghi đè/xoá.
- Bấm đúp / tải lại với cùng dữ liệu + cùng mẫu trong 15 giây → dùng lại bản vừa tạo (không sinh trùng); "Tạo lại" luôn sinh phiên bản mới.
- Link ghi **đúng cột**: `Link_*` (bản gốc), `Link_*_DOCX`, `Link_*_XLSX`, `Link_*_PDF`.
- `LichSuPhatHanhTaiLieu`: mã tài liệu, loại, mẫu + phiên bản, ngày, người, link DOCX/PDF/XLSX, trạng thái, **thông báo lỗi** (kể cả lần thất bại), **hash dữ liệu nguồn**, hash mẫu.
- Chặn phát hành khi dữ liệu tiền chưa hợp lệ, nêu từng trường (`ChiTietThuHuong dòng 2 – SoTien = 15000,5`).

## 5. Dữ liệu lịch sử có số lẻ — xem `TRANG_THAI_BAN_GIAO.md` mục 5

## 6. Triển khai

1. Chép **toàn bộ** `*.gs` và `*.html` vào dự án Apps Script (clasp hoặc dán tay). **File mới/đổi tên:** `Tien.gs, AUTH.gs, TEMPLATEREGISTRY.gs, TEMPLATESERVICE.gs, TEMPLATECONVERTER.gs, TEMPLATEMAPPER.gs, DOCUMENTRENDERER.gs, TABLERENDERER.gs, DOCUMENTVALIDATOR.gs, DOCUMENTEXPORT.gs, DOCUMENTSTORAGE.gs, DOCUMENTAUDIT.gs, DOCUMENTSERVICE.gs`. **Xoá** (nếu có từ lần triển khai trước) `DocxEngine.gs, MauDocx.gs, PhatHanh.gs`.
2. `appsscript.json`: Drive Advanced Service v2 đã bật → **cấp lại quyền** khi chạy lần đầu (Drive, Sheets, UrlFetch).
3. Sheet → menu **Hồ Sơ Vay NH → Khởi tạo / kiểm tra cấu trúc Sheet**: tạo tab `DM_MauVanBan`, `LichSuPhatHanhTaiLieu`, `NhatKyHeThong`, thêm cột link DOCX/PDF/XLSX; đổi tên tab `DM_MauDocx`/`PhatHanhChungTu` của lần thử trước (nếu có) và đổi tên cột; **không xoá dữ liệu cũ**.
4. Menu **Cấu hình quản trị viên** (email, cách nhau dấu phẩy). Khi chưa cấu hình, mọi người đều là quản trị và giao diện cảnh báo đỏ.
5. (Tuỳ chọn) menu **Sửa link chứng từ cũ**; menu **Rà soát tiền lẻ lịch sử**.
6. **Deploy → Manage deployments → New version.** ⚠ `appsscript.json` đang `ANYONE_ANONYMOUS` + `USER_DEPLOYING`: nên đặt *Who has access* = domain công ty; ngoài domain thì `Session.getActiveUser().getEmail()` rỗng nên không nhận diện được quản trị viên (xem trạng thái ở *Cài đặt → Phân quyền*).
7. *Cài đặt → Quản lý mẫu văn bản*: tải 7 mẫu trong `mau_that/` (hoặc mẫu của bạn) với điều kiện: Đề nghị USD 1 người `1`, USD nhiều người `2+`; UNC `1` (loại tiền *Tất cả*); Bảng kê `2+` (Tất cả); HĐMB USD `1+`; Đề nghị VND 1 người `1` (loại tiền VND), VND nhiều người `2+`. Bấm **Xem trước** từng mẫu.
8. Thử 1 hồ sơ **không phải sản xuất** (hồ sơ nháp riêng) → **Tạo trọn bộ**; mở DOCX/XLSX bằng Microsoft Word/Excel và PDF; so với bản gốc trước khi dùng thật.

## 7. Rollback

- **Mã**: *Manage deployments → chọn phiên bản trước → Deploy* (hoặc `git checkout bafab55` rồi đẩy lại). Dữ liệu không cần khôi phục: các tab/cột mới chỉ **thêm**, mã cũ bỏ qua chúng.
- **Quay về biểu mẫu dựng bằng code** mà không đổi mã: *Cài đặt → Quản lý mẫu văn bản → Ngừng* toàn bộ mẫu (hoặc thao tác theo từng loại) → hệ thống dùng biểu mẫu mặc định và ghi rõ `MAC_DINH_CODE`.
- **Tài liệu đã phát hành không bị ảnh hưởng** bởi rollback: file nằm trong `HồSơ/DOCX|XLSX|PDF/`, lịch sử ở `LichSuPhatHanhTaiLieu`.
- Hoàn tác link: các cột `Link_*` chỉ bị ghi đè bởi bản phát hành mới nhất; mọi bản cũ còn trong lịch sử.

## 8. Hợp đồng bộ xử lý ngoài (chế độ B)

`POST {loaiFile, tenRa, mau: base64, bien: {khoá: chuỗi}, dong: [{khoá: chuỗi}]}` (header `Authorization: Bearer <token>`) → `200 {tep: base64, conLai: [], canhBao: [], conNgoac: [], soHangMau: n, soHangTao: n}`. Mọi bước kiểm tra, lưu Drive, PDF, lịch sử vẫn chạy trong Apps Script.

## 9. Chạy kiểm thử

```bash
kiem_thu/chay_tat_ca.sh     # cần python-docx, openpyxl, lxml, LibreOffice, pdftotext; giao diện cần Playwright
```
