# CHANGELOG

## Lãi, lịch trả, tất toán theo ngày giải ngân THỰC TẾ (25/10/2026, sau b0307b0)
- **Đổi theo yêu cầu:** báo cáo tính lãi, lịch trả nợ, theo dõi tất toán/lãi theo ngày, dự báo, phân bổ tiền trả và kiểm tra ngày trả/ngày tất toán nay dùng ngày THỰC giải ngân (xác nhận ngân hàng hiệu lực; nhiều xác nhận → ngày sớm nhất). Hồ sơ chưa có xác nhận hiệu lực (hoặc xác nhận đã hủy bỏ) vẫn dùng ngày trên hồ sơ.
- **Cách làm:** `hoSoVoiNgayThuc_` (GIAINGANTHUCTE.gs) tạo BẢN SAO hồ sơ chỉ để tính; `khoanVayTrongPhamVi_` (TatToan.gs) trả bản sao đó cho mọi báo cáo hàng loạt; các đường một hồ sơ (`layLichTraNo`, `layNguCanhTra_`, ghi nhận trả nợ, đánh dấu tất toán, `layTheoDoiTatToanTheoNgay`) dùng cùng hàm. Ngày trên hồ sơ KHÔNG bị ghi đè; form hồ sơ, chứng từ in ấn vẫn dùng ngày hồ sơ (nên chỉnh cho khớp — danh sách ở “Chạy đối soát”, mục NGAY_GIAI_NGAN_LECH).
- **Hệ quả cần biết:** lãi tính từ ngày thực (không phải ngày ghi trên giấy nhận nợ); ngày đến hạn giữ nguyên theo hồ sơ nên nếu ngày thực muộn hơn thì kỳ vay ngắn lại; nếu ngày thực ≥ ngày đến hạn thì hồ sơ đó bị báo thiếu/sai ngày như dữ liệu lỗi.
- Test: `chay_lai_theo_ngay_thuc_te` (L1–L5; trước sửa 4/5 lỗi, sau sửa 0).

## Test OCR trong máy không còn đọc sớm (25/10/2026)
- CI full validation của e079f7b báo 1/110 mục lỗi: `chay_ocr_trong_may_ui` (mảng gom trang rỗng). Test chờ `window.gom` (đặt lúc GỌI hàm gom) nhưng đọc `DNT_.chungTu` (chỉ có sau khi kết quả được áp dụng ở timer kế tiếp) → đọc sớm theo thời điểm. Không tái hiện được trên máy cục bộ (8/8 lần đạt trước và sau); đã sửa chờ cả hai điều kiện. Không đổi mã ứng dụng.

## Ngày giải ngân thực tế trong báo cáo dư nợ (25/10/2026, sau 56f2ab0)
- **Lỗi (tái hiện trước khi sửa, test N1–N4):** báo cáo “Dư nợ theo kỳ/tại ngày” dùng ngày giải ngân KẾ HOẠCH trên hồ sơ. Hồ sơ ghi 10 ngày trước nhưng ngân hàng giải ngân thực tế 3 ngày trước vẫn bị tính vào dư nợ các ngày trước đó (báo cáo quá khứ phản ánh dư nợ sớm; “tăng” rơi sai kỳ).
- **Sửa:** `layBaoCaoDuNoTheoKy` (BAOCAODUNO.gs) dùng ngày THỰC theo xác nhận ngân hàng hiệu lực (`ngayThucGiaiNganTheoHoSo_`, GIAINGANTHUCTE.gs; nhiều xác nhận → ngày sớm nhất); hồ sơ chưa có xác nhận hiệu lực (hoặc xác nhận đã hủy bỏ) vẫn dùng ngày hồ sơ. Mỗi dòng có `ngayGiaiNganHoSo`, `lechNgay`; tổng có `soKhoanLechNgay`; giao diện hiện ⚠ + ghi chú. `Chạy đối soát` thêm mục thông tin `NGAY_GIAI_NGAN_LECH` liệt kê hồ sơ lệch ngày.
- **Chưa đổi (có chủ đích):** báo cáo tính lãi, lịch trả nợ, tất toán vẫn tính theo ngày giải ngân trên hồ sơ (ngày ghi trên giấy nhận nợ); hồ sơ lệch ngày nên chỉnh cho khớp (danh sách ở “Chạy đối soát”) — đổi cách tính lãi cần quyết định nghiệp vụ.
- Test: `chay_ngay_giai_ngan_thuc_te` (N1–N5), mở rộng `chay_giao_dien_nhap_lieu_moi` (dấu ⚠).

## Sửa theo BAO_CAO_TEST_MAIN_e318874 (25/10/2026)
- **P1 bảng lương bỏ nhầm người khác (đã tái hiện):** khóa chống trùng chỉ gồm họ tên + tháng + số tiền → hai người cùng tên/tháng/tiền khác tài khoản chỉ còn một. Nay khóa gồm cả số tài khoản + ngân hàng: chỉ bỏ dòng trùng HOÀN TOÀN (tải lại cùng bảng); khác tài khoản/ngân hàng giữ cả hai. Test T5.
- **P1 chống trùng hóa đơn/bảng lương chưa an toàn khi đồng thời:** bước đọc sổ + kiểm trùng nằm ngoài vùng khóa ghi. Nay đọc-kiểm-ghi cùng một vùng khóa (`taiLenTaiLieuHoSo`, ATTACHMENTSERVICE.gs); việc đọc file/OCR vẫn ở ngoài khóa. Test T6 kiểm các bước đọc kiểm trùng đều diễn ra khi đang giữ khóa (bộ giả lập không chạy song song thật nên không tái hiện được hai yêu cầu cùng lúc; tính đúng đắn dựa vào khóa script của Apps Script).
- **P2 kiểm tra sơ đồ lệch trên Windows (CRLF, đã tái hiện bằng cách đổi 3 tệp sang CRLF):** `tools/sinh_menu_luong.cjs` và `tools/sinh_luong_du_lieu.cjs` chuẩn hóa xuống dòng ở cả hai vế khi so sánh/sinh; thêm `.gitattributes` ép LF cho `LuongDuLieu.html`, `LUONG_DU_LIEU.md`, `tools/luong_goc.template.html`. Không bỏ kiểm tra nội dung.
- **Hiệu suất (đo lại 10.000 hồ sơ + 20.000 dòng con, mock):** màn hình khởi động của giao diện chỉ đọc 9 ô (công ty/hợp đồng/khách hàng); con số 400.124 ô trong báo cáo là hàm cũ `layDuLieuKhoiTao` không truyền miền (đọc cả 4 miền), giao diện không dùng. Danh sách hồ sơ/Tổng quan/Dư nợ theo kỳ vẫn quét cả bảng hồ sơ (≈400.000 ô, 1 lần đọc theo bảng) và Báo cáo tiền vay ≈780.000 ô — tăng tuyến tính, chưa tối ưu thêm trong đợt này (cần đọc theo cột/kỳ, đổi nhiều hàm).

## Chống ghi trùng khi bấm/tải lặp (25/10/2026, sau c1d8603)
Ba lỗi tái hiện trước khi sửa (cùng thao tác gửi hai lần):
1. **Điều kiện ràng buộc** (`luuDieuKienRangBuoc`, BAODAM.gs): lưu hai lần ra 2 dòng giống hệt → cảnh báo/ràng buộc bị tính đôi. Nay từ chối nếu hợp đồng đã có điều kiện đang áp dụng cùng tên (bỏ dấu/khoảng trắng) + loại + toán tử; sửa chính nó vẫn được.
2. **Hóa đơn tải lại** (`taiLenTaiLieuHoSo`, ATTACHMENTSERVICE.gs): cùng hóa đơn XML/PDF tải hai lần (cùng hồ sơ hoặc hồ sơ khác) ghi 2 dòng bảng kê → tổng tiền hóa đơn bị cộng đôi. Nay dùng cùng khóa với luồng nhiều trang (MST gốc + số + ký hiệu; thiếu ký hiệu một bên = cùng); trùng thì không ghi, có cảnh báo. Đồng thời `soHoaDonDaCo_` đọc ký hiệu từ số dạng “KÝHIỆU-SỐ” để không loại nhầm hóa đơn khác ký hiệu.
3. **Bảng lương tải lại**: 2 lần → 4 dòng. Nay bỏ dòng (họ tên + tháng + số tiền) đã có trong cùng hồ sơ, có cảnh báo.
- Giao diện đính kèm nay hiển thị cảnh báo của máy chủ (trước đây bị bỏ qua) và không đếm hóa đơn trùng là “chưa đọc được”.
- **Sửa CI đỏ trên main (từ commit da3c345 của phiên khác):** `tools/luong_nghiep_vu.cjs` thiếu `require('fs')` (làm `chay_menu_luong_du_lieu` sập); `chay_menu_luong_du_lieu` và `chay_bao_hiem_thu_cong_menu` nạp Playwright không bảo vệ nên lỗi khi CI không có Playwright (nay BỎ QUA như các test giao diện khác); bước chụp ảnh xem trước nay bỏ qua nếu tệp `ban_giao/luong-du-lieu-tuong-tac.html` không có trong repo.
- Test hồi quy: `chay_chong_trung_tai_lieu` (T1–T4). Hiệu năng: đo lại 100/1.000/5.000 hồ sơ — số lần đọc không đổi, số ô đọc tăng tuyến tính (không phát hiện thêm vòng lặp đọc lại toàn bảng).

## Sơ đồ quy trình đầy đủ hơn (25/10/2026)
- Giữ renderer, 5 cột và phong cách Archify gốc; mở rộng 25 điểm: chứng từ, duyệt, xác nhận, bảo hiểm, trả nợ, tất toán, lỗi và phục hồi.
- Bấm điểm xem hàm/bảng/khóa/phiên bản; bộ sinh kiểm tra tên hàm và bảng còn tồn tại. Tín hiệu vẫn là mô phỏng.
- Nêu rõ giới hạn ngày kế hoạch/ngày thực giải ngân ngay trong điểm báo cáo; chưa sửa mô hình ngày.

## Rà soát main và tối ưu (25/10/2026)
- Sửa xác nhận giải ngân: lỗi sau commit không tự hủy xác nhận; đọc lại trạng thái khi lỗi ghi và trả cảnh báo phần việc phụ.
- Sơ đồ tải theo nhu cầu, cache trong phiên, tháo iframe khi rời menu; HTML ban đầu giảm khoảng 49,2%.
- Tái sử dụng lịch trả nợ cùng lần tính quá hạn/phân bổ, kết quả không đổi.
- Chi tiết kiểm chứng và rủi ro ngày giải ngân còn mở: RA_SOAT_MAIN_2026_10_25.md.

## Menu Luồng dữ liệu (24/10/2026)
- Thêm menu độc lập: 6 bước nghiệp vụ, nhánh tài sản–bảo hiểm và 22 bảng cha–con. HTML sinh từ SO_DO_DU_LIEU_, có kiểm thử phát hiện lệch schema.
- Menu không gọi API dữ liệu; hỗ trợ sáng/tối và màn hình nhỏ.
- Sửa mô tả giao dịch Sheets, phạm vi revision/chống trùng và nhật ký kiểm tra; không coi tạo chứng từ là xác nhận giải ngân.
- Kiểm thử mới: chay_menu_luong_du_lieu.
- Sửa lỗi hai phiên: form sửa khách hàng đã bị xóa không được tạo lại bản ghi; có ca tái hiện trước/sau sửa.

## Nhập bảo hiểm thủ công, xóa khách hàng và bảng chế độ tối (24/10/2026)
- Cập nhật bảo hiểm: chọn hợp đồng và tài sản để mở form thêm/sửa/hủy, dùng lại service bảo hiểm hiện có; bỏ phản hồi tải tài sản cũ khi đổi hợp đồng.
- Hủy bảo hiểm dùng hộp thoại trong app có lý do và phiên bản; không phụ thuộc window.prompt. Ngày ký mới mặc định hôm nay.
- Quản trị có thể xóa khách hàng chưa dùng; máy chủ kiểm tra phiên bản, chi tiết thụ hưởng và công ty bảo hiểm, ghi bản chụp vào nhật ký trước xóa.
- Bảng khách hàng dùng màu theo theme và nền xen kẽ, bỏ nền vàng cố định làm chìm chữ ở chế độ tối.
- Kiểm thử: chay_xoa_khach_hang và chay_bao_hiem_thu_cong_menu (backend giả lập + Edge).

## Phản hồi cũ không ghi đè màn hình (24/10/2026, sau 7be0c6f)
- **Lỗi (tái hiện trước khi sửa, 4/4 ca):** chuyển bộ lọc/hồ sơ khi lời gọi trước còn chậm thì kết quả CŨ hiện sau cùng: (P1) Báo cáo “Dư nợ theo kỳ” đổi VND→USD vẫn hiện VND; (P2) Báo cáo lãi tương tự; (P3) mở hồ sơ A rồi B → form điền B rồi bị A ghi đè và “mã đang sửa” = A (lưu nhầm hồ sơ); (P4) xác nhận giải ngân của hồ sơ A hiện ở hồ sơ B.
- **Nguyên nhân:** 6 chỗ gọi thẳng `hakRun_()` không qua `RequestCoordinator` (chỉ lượt gọi mới nhất của cùng khoá được áp dụng). **Sửa:** JavaScript.html — `taiBcDuNo_`, `taiBcLai_`, `suaHoSoTuBang`, `taiXacNhanGN_`, `taiDanhSachChungTuHoSo_`, danh sách tài liệu đính kèm nay dùng `RequestCoordinator.goi` (khoá `bc_duno`, `bc_lai`, `mo_hoso`, `xn_gn`, `ct_hoso`, `tl_hoso`).
- Kiểm thử mới: `chay_giao_dien_phan_hoi_cu` (4 ca; trước sửa 4 lỗi, sau sửa 0), `chay_giao_dien_man_hinh` (14 màn hình × 360/390/768/1366 px × sáng/tối = 112 lượt: không tràn ngang trang — không phát hiện lỗi).
- Kiểm tra không phát hiện lỗi: nâng cấp cấu trúc chạy hai lần không đổi dữ liệu; số lượt đọc/ghi nhập 300 tài sản không đổi so với lần đo trước (639/1.201/41.549 ô).

## Luồng dữ liệu (24/10/2026, sau 88f213b)
Áp dụng skill `hak-data-integrity` + `hak-parent-child-data-model` (kho hak_ai_skills):
- **`QUANHEDULIEU.gs`**: `SO_DO_DU_LIEU_` (21 bảng: khoá chính, khoá ngoại, hàm ghi, chính sách xoá, chống trùng, phiên bản) + `kiemTraQuanHeDuLieu` (Quản trị, CHỈ ĐỌC): khoá chính rỗng/trùng, khoá ngoại mồ côi, trả gốc vượt gốc, nhiều xác nhận hiệu lực, trả nợ cho hồ sơ chưa giải ngân (cảnh báo), bảo hiểm trỏ thế hệ thiếu chi tiết. Nút “🔗 Kiểm tra quan hệ dữ liệu” ở Cài đặt.
- **`LUONG_DU_LIEU.md`** sinh tự động bằng `node tools/sinh_luong_du_lieu.cjs` (ERD Mermaid, luồng, vòng đời hồ sơ, từ điển dữ liệu, ma trận quyền API, bất biến → kiểm tra, migration, rủi ro). Test `chay_quan_he_du_lieu` báo lỗi nếu tài liệu lệch mã.
- Giới hạn: chỉ kiểm bằng bộ giả lập, chưa chạy trên Google Sheets thật.

## Nâng cấp theo thứ tự 1–5 (24/10/2026, sau 1fdca0d)
1. **Kiểm tra môi trường thật** (`KIEMTRAMOITRUONG.gs`, Cài đặt › Đồng bộ dữ liệu › “⏱ Kiểm tra môi trường & đo tốc độ thật”): chạy trên Google Sheets thật, dùng một sheet tạm tự xoá, kiểm múi giờ, kiểu dữ liệu đọc lại (ngày/số/số tài khoản), ghi một khối, flush, xoá dòng, khoá ghi và ĐO thời gian thật từng bước. Trên giả lập chỉ kiểm logic của bài kiểm tra; kết quả thật do Quản trị chạy.
2. **Tải trang:** đo lại cho thấy giao diện ĐÃ phân trang hồ sơ ở máy chủ và chỉ nạp công ty/hợp đồng/khách hàng lúc mở (≈1 KB + Tổng quan ≈3 KB + trang đầu ≈9 KB ở 5.000 hồ sơ). Con số 4 MB đã nêu trước đó là của API cũ `layDuLieuKhoiTao` mặc định — giao diện không dùng → không đổi code, chỉ ghi nhận.
3. **Tên hạng mục bảo hiểm khi gia hạn:** khoá hạng mục nay bỏ dấu câu/khoảng trắng thừa (“Kho  A.” = “KHO-A” = “Khô a”); gõ lệch tên (“Kho A1” so với “Kho A”) → cảnh báo “gần giống … nhưng được tính là hạng mục KHÁC” (không chặn lưu); ô tên có gợi ý từ các hạng mục đang có của tài sản.
4. **Báo cáo “6. Dư nợ theo kỳ”** (Báo cáo tiền vay; `layBaoCaoDuNoTheoKy`, `xuatBaoCaoDuNo` — `BAOCAODUNO.gs`): đầu kỳ + tăng (giải ngân) − giảm (trả gốc, tất toán ngoài hệ thống) = cuối kỳ theo từng loại tiền (USD tròn cent); chọn “Đến ngày” để xem “tại ngày” — không đổi khi có giao dịch ghi sau ngày đó; khớp dư nợ hiện tại ở hạn mức/báo cáo trả nợ; xuất Excel/PDF cùng số liệu; theo phạm vi công ty.
5. **Kiểm tra phiên bản khi sửa công ty** (`DM_CongTy.Revision`, `expectedRevision` bắt buộc khi sửa; cột tự thêm). Khách hàng, hợp đồng, tài sản, bảo hiểm đã có từ trước.
- Kiểm thử mới: `chay_kiem_tra_moi_truong`, `chay_goi_y_hang_muc`, `chay_bao_cao_du_no`, `chay_giao_dien_nhap_lieu_moi`.

## Rà soát luồng dữ liệu, chống ghi trùng/ghi đè, Hướng dẫn quy trình trực quan (24/10/2026, sau 7fdcea7)
- **Lỗi xác nhận (đã tái hiện trước khi sửa):**
  1. *Sửa công ty ghi nhầm công ty khác:* `luuCongTy` luôn ghi vào dòng công ty ĐẦU TIÊN — sửa công ty B làm hỏng dữ liệu công ty A (kể cả người bị giới hạn công ty B). Nay ghi đúng dòng theo mã; nhiều công ty mà mã lạ → báo lỗi (hệ thống một công ty vẫn giữ quy ước cũ).
  2. *Khách hàng:* tạo lại sau mất phản hồi sinh bản trùng; hai phiên sửa cùng khách hàng ghi đè số tài khoản/ngân hàng. Nay có `khoaYeuCau` (trả lại bản đã tạo) và `Revision` + `expectedRevision` bắt buộc khi sửa (giao diện giữ nội dung đang nhập, so với bản mới, chọn nạp bản mới hoặc lưu đè có xác nhận). Cột mới `DM_KhachHang.Revision/KhoaYeuCau` tự thêm.
  3. *OCR/hóa đơn:* `luuChungTuNhieuTrang` không kiểm trùng ở máy chủ — lưu lại cùng tài liệu cộng đôi hóa đơn. Nay hóa đơn đã có trong sổ (cùng MST, số, ký hiệu; thiếu ký hiệu ở một bên vẫn coi là trùng) hoặc lặp trong cùng lần lưu chỉ lưu MỘT lần, báo `boQuaTrung`, không tạo thêm tệp khi mọi chứng từ đã có. Hóa đơn khác ký hiệu/MST/số không bị coi là trùng.
  4. *Dư nợ USD sai số nhị phân:* theo dõi theo ngày, lịch trả và báo cáo lãi dùng cộng/trừ thập phân thường (7.500,299999999999). Nay dùng `duNoGocTaiNgay_` (cộng/trừ thập phân chính xác, tròn cent).
  5. *Ngày mặc định hồ sơ mới* dùng ngày lúc mở trang (qua nửa đêm vẫn ngày cũ); nay lấy ngày hiện hành (giờ Việt Nam) tại thời điểm mở form. Mở hồ sơ để sửa không bị đặt lại ngày.
- **Không tái hiện được lỗi:** dư nợ/hạn mức/Tổng quan/báo cáo trả nợ/tổng hợp khớp nhau; tạo chứng từ không tính dư nợ; hủy trả nợ hoàn lại số dư, giữ lịch sử; báo cáo lãi “tại ngày” không đổi khi có giao dịch sau ngày; cha–con không cộng đôi; Excel xuất khớp màn hình; gửi lại hồ sơ/xác nhận/trả nợ không nhân đôi.
- **Hướng dẫn sử dụng:** thêm “Quy trình trực quan” (A. Bắt đầu · B. Vay và giải ngân · C. Trả nợ và tất toán · D. Tài sản thế chấp và bảo hiểm · E. Nhập Excel và OCR · F. Báo cáo và xử lý sự cố) trong menu Hướng dẫn sử dụng: sơ đồ bước + rẽ nhánh, ví dụ minh họa (1/2/nhiều món, USD/VND, trả một phần/đủ), nút mở màn hình chỉ điều hướng. Tệp mới `HuongDanQuyTrinh.html`.
- Kiểm thử mới: `chay_doi_soat_bao_cao`, `chay_nhap_lieu_khong_chong_lan`, `chay_khach_hang_khong_ghi_de`, `chay_cong_ty_pham_vi`, `chay_giao_dien_huong_dan`.

## Giao dịch ghi bảo hiểm, khoá yêu cầu, nhập Excel theo lô (24/10/2026, sau 993b40d)
- **Thế hệ không tái sử dụng (P1):** thế hệ mới = lớn hơn MỌI thế hệ từng có của hợp đồng (kể cả dòng ghi dở còn sót) nên dòng ghi dở không còn lẫn vào lần lưu sau. Chi tiết ghi MỘT khối rồi đọc lại đúng khối đó (đủ dòng, STT, thế hệ, nội dung) trước khi chốt.
- **Không xoá khi chưa xác định kết quả (P1):** phân biệt ĐÃ CHỐT / CHẮC CHẮN CHƯA CHỐT (đọc lại thấy cha cũ → dọn đúng thế hệ ghi dở) / CHƯA XÁC ĐỊNH (không đọc lại được → giữ nguyên mọi dữ liệu, báo “CHƯA XÁC ĐỊNH”). Thế hệ khác chỉ được dọn sau khi bản chốt đã xác nhận.
- **Xác minh/phục hồi:** `xacMinhPhucHoiBaoHiem(maBH)` (Quản trị, idempotent): DA_CHOT / CHUA_CHOT_DA_DON / DA_PHUC_HOI (cha trỏ thế hệ thiếu chi tiết → trả về bản trước đủ chi tiết kèm thông tin cha cũ) / KHONG_PHUC_HOI_DUOC (không xoá gì). Dấu vết giao dịch ở bảng mới `GiaoDichBaoHiem`. Cài đặt › Đồng bộ liệt kê hợp đồng cần xác minh; “Dọn dòng thừa” không xoá thế hệ cũ của hợp đồng đang hỏng.
- **Chống nhập trùng/bỏ qua phiên bản (P2):** tạo tài sản BẮT BUỘC `khoaYeuCau` (giữ nguyên khi gửi lại, trả đúng tài sản cũ; khác nội dung bị chặn; hai tài sản thật trùng tên vẫn tạo được). Hủy hợp đồng bảo hiểm và giải chấp BẮT BUỘC `expectedRevision` ở máy chủ (đã cập nhật mọi nơi gọi). Xung đột hai phiên ở màn hình Bảo hiểm: giữ nội dung đang nhập, nạp bản mới để đối chiếu, chọn “Nạp bản mới” hoặc “Lưu đè” có xác nhận.
- **Định danh hạng mục thống nhất nhập tay/Excel:** Excel cập nhật khớp hạng mục theo khoá rồi theo tên; hạng mục nhập tay có mã riêng hoặc trống mã không còn bị thêm trùng; nhiều hạng mục cùng tên thì báo lỗi, không đoán.
- **Hiệu năng nhập Excel:** đọc mỗi bảng một lần (vị trí dòng, bộ đếm mã TS/BH, thế hệ), ghi theo khối, dọn thế hệ cũ dồn một lượt, flush một lần. Mock 300 dòng: ô đọc 2.812.106 → 41.549; lượt đọc 6.240 → 639. Màn hình tổng hợp (Tổng quan, Bảng điều hành, Tài sản, Bảo hiểm) dùng bộ nhớ đọc trong một lần xử lý (khoá theo người dùng + phạm vi công ty, xoá khi ghi, tắt khi xong): 5.000 hồ sơ: Tổng quan 1,23 triệu → 0,69 triệu ô; Bảng điều hành 1,03 triệu → 0,49 triệu ô.
- **Nâng cấp cấu trúc (chạy lại an toàn):** thêm cột `TaiSanBaoDam.KhoaYeuCau`, `BaoHiemTaiSan.SoDong/MaGD`, bảng `GiaoDichBaoHiem` (qua `nangCapCauTrucBaoDam_` / “Khởi tạo cấu trúc”). Dữ liệu cũ (chưa có cột) vẫn đọc/sửa được.
- Kiểm thử mới: `chay_giao_dich_bao_hiem`, `chay_nhat_quan_quy_trinh`, `chay_hieu_nang_tsdb`, `chay_giao_dien_giao_dich_bh`; công cụ đo `do_hieu_nang_tong_hop.js`.

## Toàn vẹn dữ liệu tài sản thế chấp / bảo hiểm / Excel (24/10/2026)
- **Cha–con theo "thế hệ":** dòng chi tiết bảo hiểm có cột `TheHe`; chỉ hiển thị khi trùng `TheHe` của hợp đồng cha. Sửa = ghi chi tiết thế hệ mới (ẩn) → ghi cha một lần (đặt `TheHe`+`Revision`) → dọn thế hệ cũ; sau mọi lỗi đều ĐỌC LẠI để xác minh. Lỗi dọn/khôi phục không báo "đã dọn" khi chưa kiểm; có `layTrangThaiToanVenBaoHiem` + `donChiTietBaoHiemThua` (nút trong Cài đặt › Đồng bộ). Áp dụng cho thêm, sửa, nạp Excel. Việc phụ sau lưu (thêm công ty BH, nhật ký) lỗi chỉ thành cảnh báo, không báo "chưa lưu".
- **Cảnh báo bảo hiểm một nguồn** (`bhDanhGiaHangMuc_`): theo từng hạng mục, nối khoảng liền/chồng; trạng thái chưa bắt đầu / đang BH / sắp hết / hở / hết hạn; tách tình trạng riêng của hợp đồng và mức bảo vệ hiện tại; hiện đúng hạng mục và ngày; đồng bộ bảng tài sản, modal bảo hiểm và Tổng quan.
- **Hai phiên:** `Revision` cho `TaiSanBaoDam` và `BaoHiemTaiSan`; sửa/hủy/giải chấp/nạp Excel phải gửi `expectedRevision`, lệch → `XUNG_DOT_PHIEN_BAN`, giao diện nạp lại.
- **Excel:** cùng khoá bảo hiểm nhưng đổi hạn/phí/số tiền → CẬP NHẬT (không bỏ qua); nhiều dòng cùng tài sản dùng dữ liệu dòng trước; ô trống giữ số cũ, số 0 ghi đè; quy tắc ngày/tiền như nhập tay.
- Nâng cấp cấu trúc: `nangCapCauTrucBaoDam_` (thêm cột `Revision`, `TheHe`, điền thế hệ cho dữ liệu cũ; chạy lại an toàn, gọi trong `khoiTaoCauTrucSheet_`).
- Kiểm thử: `chay_toan_ven_tsdb` (11 ca backend + giao diện Chromium).

## Rà soát luồng tài sản thế chấp & bảo hiểm — sửa 9 lỗi (24/10/2026)
- **Phạm vi công ty:** sửa/chuyển tài sản kiểm tra quyền với hợp đồng GỐC (không chỉ hợp đồng đích); chuyển hợp đồng ghi nhật ký.
- **Nguyên giá/khấu hao/còn lại:** hợp nhất số đang lưu với số mới rồi mới kiểm tra (`hopNhatGiaTriTS_`), cả nhập tay lẫn Excel; xem trước hiện số trước/sau.
- **Cảnh báo bảo hiểm theo từng hạng mục** (`hanBaoHiemTheoTaiSan_`): nối các khoảng gia hạn liền nhau; hạng mục đã hết hạn không bị che bởi hợp đồng khác còn hạn; mới thêm trạng thái **CHƯA HIỆU LỰC** (chưa tới ngày bắt đầu hoặc hở giữa hai hợp đồng) ở bảng thế chấp và Tổng quan.
- **Toàn vẹn khi lỗi giữa chừng:** sửa bảo hiểm thay chi tiết có khôi phục bản cũ (`thayChiTietBaoHiemAnToan_`); tạo mới/nạp Excel ghi chi tiết trước, hợp đồng cha sau và dọn nếu lỗi; kết quả nạp Excel có `ok:false` + `loiBH` nói rõ “tài sản đã ghi, bảo hiểm chưa ghi”.
- **Nạp Excel:** chỉ bỏ dòng Tổng/Tổng cộng/Cộng thật, không bỏ tài sản tên “Cổng…/Công trình…/Tổng kho”; Mã tài sản đã nhập phải khớp đúng mã và hợp đồng (không âm thầm chuyển sang dò theo tên), trùng tên nhiều tài sản thì yêu cầu điền mã.
- **Bảo hiểm:** lưu bị từ chối thì không thêm công ty vào Khách hàng (thêm SAU khi lưu thành công); gửi lại cùng yêu cầu tạo không nhân đôi (`trungLap`), cùng số/ngày ký/công ty nhưng nội dung khác bị chặn kèm hướng dẫn phụ lục/gia hạn; nút lưu chống bấm lặp.
- Kiểm thử: `chay_ra_soat_tsdb` (9 nhóm ca tái hiện, gồm giả lập lỗi ghi Sheets giữa chừng).

## Cập nhật bảo hiểm TSĐB từ Excel; nguyên giá/khấu hao/còn lại; nhập số có phân cách (24/10/2026)
- **`CAPNHATBAOHIEM.gs` (tệp mới):** `xemTruocCapNhatTSDB` (đọc Excel, không ghi) → `apDungCapNhatTSDB` (chuẩn hoá lại từ giá trị thô, ghi); `taiMauCapNhatTSDB`; `themCongTyBaoHiem`. Menu mới **Vận hành › Cập nhật bảo hiểm TSĐB**.
- `TaiSanBaoDam` thêm `NguyenGia`, `KhauHao`, `GiaTriConLai` (còn lại = nguyên giá − khấu hao, kiểm khớp); giá trị định giá (`GiaTriVND`) vẫn là số hiện ở Đăng ký thế chấp; bảng thế chấp hiện 4 cột giá trị.
- Công ty bảo hiểm: chọn từ Khách hàng (lọc khi gõ) hoặc gõ tên mới — tự thêm vào Khách hàng khi lưu (cả khi nhập tay lẫn khi nạp Excel).
- Mọi ô tiền ở Đăng ký thế chấp và chi tiết bảo hiểm: tự phân cách hàng nghìn khi gõ, căn phải.
- Kiểm thử: `chay_cap_nhat_bao_hiem_tsdb` (6 ca, có giao diện).

## Cài đặt: menu lên đầu, trạng thái lịch tự động, Thông tin công ty tải nhanh (24/10/2026)
- Thanh menu Cài đặt (Quản lý mẫu / Cấu hình / Đăng nhập / Đồng bộ / Lưu trữ / Thông tin công ty) nằm TRÊN CÙNG; màn Thông tin công ty có đủ 6 mục.
- Lưu trữ theo năm: hiện **“ĐÃ BẬT TỰ ĐỘNG” / “CHƯA BẬT TỰ ĐỘNG”** đọc từ trình kích hoạt thật (`layTrangThaiLichLuuTruNam`), nút đổi Bật ↔ Tắt (`tatLichLuuTruNam` mới).
- Thông tin công ty: nếu bộ nhớ chưa có (lần nạp đầu còn chậm) thì đọc riêng `layDanhSachCongTy` (1 bảng nhỏ) thay vì treo “Đang tải…”.

## Hồ sơ đính kèm: bảng con “Chi tiết …” và cột tải lên Bảo hiểm (24/10/2026)
### Thay đổi
- Ba bảng con đổi tên: **Chi tiết hoá đơn**, **Chi tiết bảng lương**, **Chi tiết bảo hiểm**.
- Bảng cha thêm cột **Bảo hiểm** (tải lên như bảng lương): PDF/ảnh bảng đóng BHXH, đọc OCR từng trang (cùng luồng nhiều trang), chỉ chọn sẵn trang nhận ra là bảng đóng bảo hiểm; `luuChungTuNhieuTrang` nhận `tep.loaiTaiLieu = 'BaoHiem'` (từ chối trang không phải bảo hiểm), lưu `TaiLieuDinhKem.LoaiTaiLieu = 'BaoHiem'` vào thư mục `BaoHiem` của hồ sơ; `layTongHopHoSoVaTaiLieu` trả thêm `soBaoHiem`; gói ZIP đính kèm có `dinh_kem_bao_hiem/`.
- File không phải PDF/ảnh ở cột Bảo hiểm bị từ chối kèm hướng dẫn nhập riêng.
### Kiểm thử
- `chay_cha_con_dinh_kem` 6 ca (thêm cột Bảo hiểm ở máy chủ và giao diện).

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
