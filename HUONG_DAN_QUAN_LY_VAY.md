# HƯỚNG DẪN SỬ DỤNG — QUẢN LÝ VAY

Tài liệu dành cho kế toán và quản trị viên. Mọi số liệu về lãi phạt, dự báo và tuổi nợ là **ước tính** từ dữ liệu trong ứng dụng; số chính thức theo thông báo của ngân hàng.

## 0. Chuẩn bị (làm một lần)

1. **Dán code mới** vào Apps Script (bỏ đuôi `.txt`). File MỚI cần thêm bằng nút “＋ → Tập lệnh / HTML”: `HANMUC`, `BAODAM`, `PHANBO`, `DUBAO`, `NHACNO`, `DOISOATSAOKE`, `DUYET` (loại Script `.gs`) và `QuanLyVayGiaoDien` (loại HTML). Các file còn lại là sửa đè file cũ cùng tên.
2. **Triển khai lại** Web App (Triển khai → Quản lý bản triển khai → sửa → Phiên bản mới → Triển khai).
3. Mở ứng dụng, vào **Tổng quan → “Kiểm tra cấu trúc dữ liệu”**. Bốn sheet mới (`TaiSanBaoDam`, `DieuKienRangBuoc`, `PheDuyetGiaiNgan`, `NhacNoNhatKy`) hiện “chưa tạo” là bình thường — tự tạo khi dùng lần đầu.
4. Ai làm gì:

| Vai trò | Được làm |
|---|---|
| **Xem** | Xem mọi màn trong “Quản lý vay”, in/lưu PDF, đối soát sao kê |
| **Nhập liệu** | Thêm: trả gộp, đăng ký/giải chấp tài sản, cập nhật giá trị ràng buộc, gửi/thu hồi duyệt |
| **Quản trị** | Thêm: lưu cài đặt, khai báo/ngừng ràng buộc, duyệt/từ chối, gửi thử email, đồng bộ Calendar, tạo lịch chạy |

Menu bên trái có mục **Quản lý vay**. Bấm vào sẽ thấy 8 thẻ: Điều hành · Hạn mức · Dòng tiền · Nợ quá hạn · Ràng buộc & tài sản · Đối soát sao kê · Duyệt giải ngân · Nhắc nợ & cài đặt. Phím **Ctrl + K** tìm nhanh màn hình.

> Mọi cài đặt dưới đây nằm ở **Quản lý vay → Nhắc nợ & cài đặt** (chỉ quản trị sửa được). Sửa xong bấm **Lưu cài đặt**.

---

## 1. Hạn mức tín dụng (và chặn giải ngân vượt hạn mức)

**Bật:**
1. Vào **Hợp đồng vay**, mở hợp đồng, điền ô **“Hạn mức vay (VND)”** (số nguyên, ví dụ `20.000.000.000`), lưu. Hợp đồng để trống hoặc 0 → **không kiểm tra, không chặn**.
2. Vào **Quản lý vay → Hạn mức** để xem: hạn mức, đã dùng, đang chờ, còn lại, thanh tỷ lệ.
3. Cài đặt: “**Chặn xác nhận giải ngân khi vượt hạn mức hợp đồng**” (mặc định **BẬT**), “Ngưỡng lưu ý” (mặc định 80%), “Ngưỡng cảnh báo cao” (mặc định 95%).

**Cách tính:** Đã dùng = dư nợ gốc còn lại của các khoản “Đã giải ngân” chưa tất toán (trả gốc thì hạn mức được trả lại). Khoản USD quy VND theo **tỷ giá giải ngân của chính hồ sơ**. “Đang chờ” = hồ sơ “Đã tạo hồ sơ”, chỉ để tham khảo.

**Khi bị chặn:** khi bấm *Xác nhận giải ngân*, ứng dụng báo “vượt hạn mức còn lại …”. Cách xử lý: ghi nhận trả gốc hoặc tất toán khoản cũ; hoặc tăng hạn mức ở Hợp đồng vay; hoặc (nếu dữ liệu hạn mức chưa chuẩn) bỏ tick chặn trong Cài đặt. Cột “⚠” cạnh số “Đã dùng” nghĩa là có khoản USD thiếu tỷ giá giải ngân nên chưa quy đổi được.

## 2. Dự báo dòng tiền

**Bật:** không cần cài đặt. Vào **Dòng tiền**, chọn số tháng (3/6/12/24) và biên độ tỷ giá (ví dụ 5 nghĩa là ±5%), bấm **Xem dự báo**.

**Đọc kết quả:** dòng “Quá hạn” là phần đã đến hạn mà chưa trả; mỗi tháng là gốc + lãi chưa trả của tháng đó; USD hiển thị riêng và quy VND theo 3 kịch bản tỷ giá. Lãi các kỳ tương lai tính trên dư nợ **hiện tại**. Muốn có tỷ giá chính xác, hãy để tỷ giá tự động (hoặc nhập tay ở Tổng quan). Nút **Xuất CSV** mở được bằng Excel.

## 3. Nợ quá hạn theo tuổi

**Bật:** không cần cài đặt; mỗi hợp đồng cần có **lãi suất, kỳ trả lãi, kỳ trả gốc** (đã khai ở Hợp đồng vay) và hồ sơ cần có ngày giải ngân + ngày đến hạn.

Vào **Nợ quá hạn**: các thẻ theo bậc 1–30, 31–60, 61–90, trên 90 ngày, kèm bảng từng khoản (gốc quá hạn, lãi quá hạn, lãi phạt ước tính). Bấm **Ghi nhận trả nợ** để nhảy tới màn Tất toán đúng khoản đó. Số ngày tính theo **kỳ quá hạn cũ nhất** chưa trả đủ. Chấm đỏ trên thẻ cho biết số khoản quá hạn.

## 4. Lãi phạt, thứ tự phân bổ tiền trả và “Trả gộp”

**Bật/cấu hình** (Cài đặt):
- “Thứ tự phân bổ tiền trả” — mặc định *Lãi phạt → Lãi → Gốc*.
- “Lãi suất quá hạn (% của lãi trong hạn)” — mặc định **150** (kiểm tra hợp đồng tín dụng để đặt đúng).
- “Lãi chậm trả lãi (%/năm)” — mặc định **0** (không tính).

**Dùng:** vào **Tất toán khoản vay**, chọn khoản → khung “Ghi nhận trả nợ”:
1. “Loại” chọn **Trả gộp — tự chia lãi phạt / lãi / gốc**.
2. Điền Ngày trả, Tổng số tiền, Số tham chiếu giao dịch ngân hàng, Chứng từ.
3. Bấm **Ghi nhận trả nợ** → ứng dụng hiện gợi ý chia 3 phần (sửa được nếu ngân hàng chia khác; tổng phải bằng số tiền trả).
4. Bấm **Xác nhận ghi nhận trả gộp**. Sổ trả nợ có 2–3 dòng với số tham chiếu thêm hậu tố `-P` (lãi phạt), `-L` (lãi), `-G` (gốc). Nếu lỗi giữa chừng, các dòng đã ghi tự hoàn tác.

Cũng có thể chọn riêng loại “Trả lãi phạt quá hạn” để ghi một khoản phạt đơn lẻ. Số tham chiếu **không được trùng** (kể cả `ABC` với `ABC-L`).

## 5. Điều kiện ràng buộc (covenant)

**Bật (quản trị):** **Ràng buộc & tài sản → “Khai báo chỉ tiêu mới”**: chọn hợp đồng, đặt tên, chọn loại, điều kiện (≥ hoặc ≤), ngưỡng, đơn vị, kỳ kiểm tra (ngày):
- *Nhập tay theo kỳ* — ví dụ “Doanh thu về BIDV / doanh số giải ngân ≥ 120 %”, kỳ kiểm tra 90 ngày.
- *Tự tính: dư nợ / hạn mức (%)* — ví dụ ≤ 80.
- *Tự tính: dư nợ / giá trị tài sản bảo đảm (%)* — cần đã đăng ký tài sản (mục 6).

**Cập nhật hằng kỳ (nhập liệu):** với chỉ tiêu nhập tay, gõ giá trị vào ô và bấm **Cập nhật**. Trạng thái: *Đạt* · *Sắp vi phạm* (cách ngưỡng dưới 10%) · *Vi phạm* · *Chưa có dữ liệu* · *Quá hạn cập nhật* (quá kỳ kiểm tra). Muốn bỏ chỉ tiêu: **Ngừng** (không xoá, vẫn lưu lịch sử).

## 6. Tài sản bảo đảm

**Bật:** menu **Tài sản & Thế chấp**: **Danh mục tài sản** → **Đăng ký thế chấp** (chọn hợp đồng vay, các tài sản, định giá) → **Bảo hiểm tài sản**. Bảng ở **Ràng buộc & tài sản** chỉ để xem.

Cột **Bảo hiểm** hiển thị tình trạng theo từng tài sản (đang bảo hiểm, “Sắp hết (n ngày)” khi còn ≤ 15 ngày, đã hết hạn, hở, chưa bắt đầu, chưa có). Khi đã tất toán hoặc giải chấp: bấm **Giải chấp**, nhập lý do/chứng từ (tài sản không bị xoá, không còn tính vào giá trị đang bảo đảm). Tỷ lệ “Dư nợ/TS” hiện ở màn Hạn mức.

## 7. Đối soát sao kê ngân hàng

**Bật:** không cần cài đặt (mọi vai trò dùng được, chỉ đọc).
1. Mở sao kê từ Internet Banking/Excel; bảo đảm có dòng tiêu đề với các cột: **Ngày**, **Số tham chiếu** (hoặc Mã GD), **Nội dung**, **Ghi nợ**, **Ghi có** (hoặc một cột **Số tiền**; số âm = tiền ra), tuỳ chọn **Loại tiền**.
2. Vào **Đối soát sao kê**: dán nội dung vào ô (copy nguyên bảng) hoặc chọn file `.csv/.txt` (dưới ~400 KB, ≤ 3.000 dòng). Chọn “Loại tiền mặc định” nếu sao kê không có cột loại tiền.
3. Bấm **Đối soát**. Kết quả: **Khớp** (trùng tham chiếu + số tiền) · **Lệch số tiền** · **Gợi ý khớp** (không trùng tham chiếu nhưng trùng số tiền + ngày ±3, duy nhất) · **Nhiều ứng viên** · **Không có trong hệ thống**; bảng dưới liệt kê giao dịch có trong hệ thống nhưng **không thấy trên sao kê** trong khoảng ngày của sao kê.
4. **Xuất kết quả (CSV)** để lưu hồ sơ.

Tiền vào đối chiếu với *xác nhận giải ngân*, tiền ra với *sổ trả nợ* (các dòng trả gộp được cộng lại thành 1 giao dịch). Đối soát **không tự ghi gì** — bạn tự quyết định sửa.

## 8. Duyệt hai cấp trước khi xác nhận giải ngân

**Bật (quản trị):** Cài đặt → tick “**Bắt buộc duyệt hai cấp trước khi xác nhận giải ngân**” → Lưu. Mặc định tắt nên quy trình cũ không đổi.

**Quy trình khi đã bật:**
1. Người lập (nhập liệu) hoàn tất bộ chứng từ để hồ sơ ở trạng thái “Đã tạo hồ sơ”.
2. Vào **Duyệt giải ngân**, nhập **Mã hồ sơ**, ghi chú → **Gửi duyệt**. Phiếu ở trạng thái *Chờ duyệt* (chấm đỏ báo số phiếu chờ).
3. **Một quản trị khác** (không phải người gửi) bấm **Duyệt** hoặc **Từ chối** (từ chối bắt buộc lý do).
4. Người lập quay lại hồ sơ và **Xác nhận giải ngân** như thường lệ. Phiếu chuyển *Đã sử dụng*, không dùng lại được.

**Lưu ý:** nếu hồ sơ bị **sửa sau khi gửi hoặc sau khi duyệt**, phiếu thành *Hết hiệu lực* (hiện nhãn “lỗi thời”) và phải gửi lại. Người gửi (hoặc quản trị) có thể **Thu hồi** phiếu đang chờ. Người gửi dù là quản trị cũng không tự duyệt phiếu của mình.

## 9. Nhắc nợ qua email và Google Calendar

**Bật (quản trị):**
1. Cài đặt → ô “**Email nhận nhắc nợ**” (cách nhau dấu phẩy, tối đa 10 địa chỉ).
2. Tick “**Gửi email nhắc nợ hằng ngày**” và/hoặc “**Tạo sự kiện Google Calendar**” → **Lưu cài đặt**.
3. Bấm **Xem trước bản tin** để biết hôm nay sẽ gửi gì (không gửi thật).
4. Bấm **Gửi thử cho tôi**. Lần đầu Google hiện hộp thoại **cấp quyền gửi email**; chọn tài khoản → *Nâng cao* → *Cho phép*.
5. Với Calendar: bấm **Đồng bộ Calendar ngay**; Google sẽ hỏi quyền **truy cập Lịch** một lần.
6. Cuối cùng bấm **Tạo lịch chạy hằng ngày (8h)** để hệ thống tự gửi mỗi sáng (khoảng 8h, có thể lệch ±1 giờ).

**Hành vi:** chỉ gửi khi có mục cần nhắc (quá hạn, kỳ sắp đến hạn trong số ngày nhắc trước, hạn mức sắp hết, ràng buộc, bảo hiểm), tối đa **1 email/ngày**, nội dung **không có số tài khoản**. Sự kiện Calendar tạo cho các kỳ đến hạn trong 60 ngày tới trên **lịch mặc định của tài khoản chạy**, không tạo trùng; kỳ đã trả đủ thì sự kiện tương lai tự gỡ. “Số ngày nhắc trước hạn” chỉnh ở phần cấu hình nhắc nợ có sẵn của ứng dụng.

## 10. Bảng điều hành (cho lãnh đạo)

**Bật:** không cần cài đặt. Vai trò **Xem** dùng được. Thẻ **Điều hành** hiển thị hạn mức còn lại, phải trả 3 tháng tới, nợ quá hạn, ràng buộc cần chú ý, tài sản bảo đảm, tỷ giá; bên dưới là “Việc cần làm” có nút mở thẳng màn xử lý. Bấm **In / lưu PDF** (hộp thoại in của trình duyệt → “Lưu dưới dạng PDF”). Tổng quan cũng có hai thẻ nhanh: *Hạn mức còn lại* và *Ràng buộc/bảo hiểm cần chú ý*.

---

## 11. Bổ sung tháng 10/2026 (menu, bảo hiểm, tính lãi, chốt, xuất file, lưu trữ)

Bản hướng dẫn đầy đủ cũng có trong ứng dụng: **Hệ thống › Hướng dẫn sử dụng › “Chức năng mới (tháng 10/2026)”**.

| Chức năng | Ai dùng | Cách dùng tóm tắt |
|---|---|---|
| Menu mới | Mọi vai trò | Vận hành · Báo cáo phân tích · Hệ thống · Thông tin liên quan |
| Hồ sơ đính kèm cha–con | Xem: mọi vai trò; nhập: Nhập liệu | Dòng hồ sơ (cha) có 3 cột tải lên Hoá đơn / Bảng lương / **Bảo hiểm** (PDF/ảnh, đọc OCR từng trang, chỉ nhận trang bảng đóng BH). Bấm dòng → 3 bảng con **Chi tiết hoá đơn / Chi tiết bảng lương / Chi tiết bảo hiểm**. Bảo hiểm độc lập với bảng lương; cũng nhập riêng được |
| Tài sản & Thế chấp → Bảo hiểm tài sản | Nhập liệu trở lên | Thêm hợp đồng bảo hiểm cho một hoặc nhiều tài sản (ngày ký, công ty BH, số tiền, phí nhập tay hoặc theo tỷ lệ %). Tổng quan có thẻ Bảo hiểm; cảnh báo khi còn ≤ 15 ngày |
| Báo cáo tiền vay › 5. Tính tiền lãi | Mọi vai trò | Theo hồ sơ / hợp đồng / tháng; lãi trong hạn + lãi quá hạn (ước tính); USD quy đổi VND theo tỷ giá cuối tháng; xuất CSV / Excel / PDF |
| Chốt kỳ lãi | Quản trị toàn hệ thống | 🔒 Chốt kỳ → ảnh chụp số liệu; 👁 Xem thấy chỗ lệch với số hiện tại; không xoá, chỉ Hủy chốt kèm lý do; kỳ chốt không chồng ngày |
| Tất toán theo ngày | Mọi vai trò | Còn / quá hạn N ngày; “Theo dõi theo ngày” (dư nợ, lãi ngày, lãi lũy kế, sự kiện); xuất Excel / PDF |
| Gửi duyệt giải ngân | Nhập liệu | Chọn hồ sơ từ danh sách, không gõ tay |
| Chứng từ lỗi | Nhập liệu | Hiện danh sách trường thiếu + “Đi tới nơi sửa”; 🔄 Cập nhật mẫu; 🧩 Chọn mẫu khác |
| Lưu trữ theo năm | Quản trị toàn hệ thống | Cài đặt › 🗄 Lưu trữ theo năm: lưu năm, xem lại, ⏰ tự động đầu năm |
| Lưu trữ tệp + dung lượng | Quản trị toàn hệ thống | 📏 Ước tính → 📎 Tệp (Lập sổ → Sao tệp → Thử lại lỗi). Cảnh báo Drive ≥ 80% ở Lưu trữ và Tổng quan; chặn sao khi thiếu chỗ |
| So sánh & khôi phục | Quản trị toàn hệ thống | Xem bản lưu trữ › ⚖ So sánh → tích dòng đã mất → nhập lý do → ♻ Khôi phục. Không ghi đè dòng đang có |

**Lưu ý nghiệp vụ**
- Lãi quá hạn / phạt trong báo cáo lãi là số **ước tính** theo cấu hình lãi quá hạn (mục 4); đối chiếu thông báo ngân hàng.
- Quy đổi USD → VND dùng tỷ giá **cuối tháng** trong sổ tỷ giá; thiếu tỷ giá thì dòng đó **không cộng** và được đánh dấu.
- Bản chốt / bản lưu trữ chứa dữ liệu mọi công ty nên **không dùng được** với tài khoản bị giới hạn theo công ty.
- Khôi phục từ lưu trữ **chỉ thêm lại dòng đã mất** (hồ sơ, hợp đồng, công ty, khách hàng, tài sản thế chấp, hợp đồng bảo hiểm); bảng con phải khôi phục riêng.

## Gợi ý lộ trình bật từng bước
1. Khai báo **Hạn mức vay** cho các hợp đồng → xem màn Hạn mức (đối chiếu số đã dùng với thực tế trước khi để chế độ chặn hoạt động).
2. Kiểm tra màn **Nợ quá hạn** và **Dòng tiền** có khớp lịch ngân hàng (kiểm tra lãi suất, kỳ trả ở Hợp đồng vay).
3. Chỉnh **lãi suất quá hạn** và thứ tự phân bổ đúng hợp đồng; dùng **Trả gộp** cho vài giao dịch thật.
4. Đăng ký **tài sản bảo đảm** và **ràng buộc**.
5. Bật **nhắc nợ** (xem trước → gửi thử → tạo lịch).
6. Cuối cùng mới bật **duyệt hai cấp** khi đã có ít nhất hai quản trị.

## Xử lý sự cố nhanh

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Không thấy mục “Quản lý vay” | Chưa dán `Index.html` / chưa triển khai bản mới | Dán đủ file, triển khai phiên bản mới, tải lại trang (Ctrl + F5) |
| Màn Quản lý vay báo “Chức năng không tồn tại” | Thiếu file `.gs` mới hoặc `PHIEN.gs` cũ | Dán đủ 8 file mới và `PHIEN.gs` |
| “Dự báo/Quá hạn” bỏ qua một số khoản | Hồ sơ thiếu ngày giải ngân, ngày đến hạn hoặc số tiền | Bổ sung dữ liệu hồ sơ |
| Hạn mức hiện ⚠ | Khoản USD không có tỷ giá giải ngân hợp lệ | Sửa tỷ giá bán của hồ sơ |
| Không gửi được email | Chưa cấp quyền / hết hạn mức email của Google | Bấm “Gửi thử cho tôi” để cấp quyền; chờ sang ngày |
| Xác nhận giải ngân bị từ chối | Vượt hạn mức hoặc chưa có phiếu duyệt hợp lệ | Xem mục 1 hoặc 8 |
| Phiếu duyệt “lỗi thời” | Hồ sơ đã bị sửa sau khi duyệt | Gửi duyệt lại |
| Đối soát “Không nhận ra tiêu đề cột” | Thiếu cột Ngày hoặc cột số tiền | Thêm dòng tiêu đề đúng tên (xem mục 7) |

Báo lỗi: chụp màn hình thông báo đỏ ở đầu trang và gửi cho người phụ trách kỹ thuật.
