# BÁO CÁO KIỂM THỬ QUY TRÌNH NGHIỆP VỤ (TC01–TC30)

> **Môi trường:** GIẢ LẬP (Node vm + Apps Script mock; PDF giả). Không phải Google Apps Script/Sheets/Drive/cổng HAK thật.
> Không có test nào ở đây chạy trên Google Apps Script thật. Mục B là test giao diện trên Chromium với `google.script.run` giả.

## A. Phía máy chủ (`chay_quy_trinh.js`)

| Mã | Kết quả | Hàm/module |
|---|---|---|
| TC01 | PASS | luuHoSoGiaiNgan (HoSoDomain/DataService) |
| TC02 | PASS | xemTruocChungTu (DocumentService) |
| TC03 | PASS | phatHanhChungTu_ / taoDeNghiGiaiNganBIDV (revision bắt buộc, không ghi ngầm) |
| TC04 | PASS | luuHoSoGiaiNgan — cha–con |
| TC05 | PASS | taoDeNghiGiaiNganBIDV → phatHanhChungTu_ |
| TC06 | PASS | taoTronBoTheoMau (DocGenerator/BoChungTu) |
| TC07 | PASS | taoTronBoTheoMau + loại tài liệu BẮT BUỘC thiếu mẫu |
| TC08 | PASS | taoTronBoTheoMau + loại KHÔNG bắt buộc thiếu mẫu |
| TC09 | PASS | taoTronBoTheoMau — lỗi ở tài liệu thứ ba |
| TC10 | PASS | taoTronBoTheoMau — thử lại (tiếp tục / phát hành lại 1 tài liệu / phát hành lại toàn bộ) |
| TC11 | PASS | chuyenHoSoVeNhap |
| TC12 | PASS | luuHoSoGiaiNgan sau khi đã phát hành chứng từ |
| TC13 | PASS | kiemTraDuDieuKienGiaiNgan_ / chuyenTrangThaiHoSo_ / xacNhanGiaiNganThucTe |
| TC14 | PASS | luuHoSoGiaiNgan / capNhatThongTinPhiTienTe (xung đột) |
| TC15 | PASS | Mọi hàm cập nhật hồ sơ — expectedRevision bắt buộc |
| TC16 | PASS | capNhatThongTinPhiTienTe — lỗi giữa chừng |
| TC17 | PASS | xacNhanGiaiNganThucTe |
| TC18 | PASS | xacNhanGiaiNganThucTe — thiếu/sai thông tin ngân hàng |
| TC19 | PASS | huyGiaiNgan |
| TC20 | PASS | ghiNhanDieuChinhGiaiNgan |
| TC21 | PASS | xoaHoSo / khoiPhucHoSo / layDanhSachHoSoXoaMem |
| TC22 | PASS | layBaoCaoGiaiNganThucTe |
| TC23 | PASS | layBaoCaoGiaiNganThucTe / layBaoCaoDoiSoat (VND/USD) |
| TC24 | PASS | layBaoCaoTienVay — lọc ngày |
| TC25 | PASS | taoTronBoTheoMau + luuHoSoGiaiNgan đồng thời |
| TC26 | PASS | kiemTraKetQuaLuu / luuHoSoGiaiNgan (mất mạng sau khi ghi) |
| TC27 | PASS | Gửi lại cùng yêu cầu (xác nhận, hủy, về Nháp, trọn bộ) |
| TC28 | PASS | api() + PortalAuthAdapter (chế độ Cổng) — phân quyền API đổi trạng thái |
| TC29 | PASS | layRevisionDuLieu + luuHoSoGiaiNgan + phát hành (máy khác đổi dữ liệu khi form đang mở) |
| TC30 | PASS | Bộ hồi quy hiện có (chạy lại các kịch bản cũ) |

### TC01 — PASS
- Hàm/module: luuHoSoGiaiNgan (HoSoDomain/DataService)
- Dữ liệu đầu vào: Hồ sơ mới 2 dòng (1.000.000 + 2.000.000), payload cố tình gửi trangThai="Đã giải ngân" và khoaYeuCau
- Kết quả mong đợi: Lưu thành Nháp (bỏ qua trangThai client), Revision=1, 2 dòng con, tổng khớp, journal HOAN_TAT
- Kết quả thực tế / bằng chứng: HS0001: Nháp, rev 1, 2 dòng, journal HOAN_TAT
- Môi trường: giả lập

### TC02 — PASS
- Hàm/module: xemTruocChungTu (DocumentService)
- Dữ liệu đầu vào: Hồ sơ Nháp đã lưu; xem trước UNC/Bảng kê; có file xem trước cũ >24h và 1 file khác trong thư mục XemTruoc
- Kết quả mong đợi: Không đổi hồ sơ/chi tiết/revision/trạng thái/lịch sử phát hành; chỉ nhật ký XEM_TRUOC; file xem trước cũ vào thùng rác, file khác KHÔNG bị đụng
- Kết quả thực tế / bằng chứng: dữ liệu trước=sau: true; revisionNguon=1; dọn bản cũ=true, file khác giữ=true; lịch sử phát hành không tăng
- Môi trường: giả lập

### TC03 — PASS
- Hàm/module: phatHanhChungTu_ / taoDeNghiGiaiNganBIDV (revision bắt buộc, không ghi ngầm)
- Dữ liệu đầu vào: Máy A mở hồ sơ ở revision r; máy B lưu (r+1); A phát hành với r; phát hành không truyền revision
- Kết quả mong đợi: A bị XUNG_DOT_PHIEN_BAN, không tạo chứng từ; thiếu revision → THIEU_REVISION; phát hành đúng revision KHÔNG đổi dữ liệu/revision hồ sơ
- Kết quả thực tế / bằng chứng: A:XUNG_DOT_PHIEN_BAN|2|Hồ sơ HS0002 đã đượ | không rev:THIEU_REVISION|Thiếu phiên bản | đúng rev: true; dữ liệu không đổi=true; bị chặn không tạo chứng từ=true
- Môi trường: giả lập

### TC04 — PASS
- Hàm/module: luuHoSoGiaiNgan — cha–con
- Dữ liệu đầu vào: Sửa hồ sơ TC01 từ 2 dòng thành 3 dòng với expectedRevision đúng
- Kết quả mong đợi: Chi tiết thay đúng 3 dòng, tổng cha = tổng con, revision +1, journal HOAN_TAT, đối chiếu cha–con đạt
- Kết quả thực tế / bằng chứng: rev 2; 3 dòng; tổng 3500000; journal HOAN_TAT,HOAN_TAT
- Môi trường: giả lập

### TC05 — PASS
- Hàm/module: taoDeNghiGiaiNganBIDV → phatHanhChungTu_
- Dữ liệu đầu vào: Hồ sơ A (Nháp, rev 2): phát hành Văn bản đề nghị
- Kết quả mong đợi: Bản "Hiệu lực" có link, HashDuLieu, RevisionHoSo=2; hồ sơ vẫn Nháp; bộ chứng từ = Phát hành thiếu
- Kết quả thực tế / bằng chứng:  bản=1, rev nguồn=2, hồ sơ Nháp, bộ "Phát hành thiếu"
- Môi trường: giả lập

### TC06 — PASS
- Hàm/module: taoTronBoTheoMau (DocGenerator/BoChungTu)
- Dữ liệu đầu vào: Hồ sơ A: phát hành trọn bộ (loại "Bộ cơ bản", VND → Đề nghị + Bảng kê)
- Kết quả mong đợi: Phiên "Đã hoàn tất" ghi revision nguồn + danh sách; bộ "Đã hoàn tất"; hồ sơ → Đã tạo hồ sơ; chứng từ cũ được dùng lại (không trùng)
- Kết quả thực tế / bằng chứng: phiên PH-HS0001-15/10/2026-816 Đã hoàn tất; đã tạo DE_NGHI_GIAI_NGAN(dùng lại),CHUNG_TU_THANH_TOAN; hồ sơ Đã tạo hồ sơ
- Môi trường: giả lập

### TC07 — PASS
- Hàm/module: taoTronBoTheoMau + loại tài liệu BẮT BUỘC thiếu mẫu
- Dữ liệu đầu vào: Loại "Tờ trình" bắt buộc, chưa có mẫu; hồ sơ loại "Có tờ trình"
- Kết quả mong đợi: Phiên "Phát hành lỗi"; hồ sơ KHÔNG sang Đã tạo hồ sơ; chứng từ khác vẫn được tạo và giữ; kiemTraDuDieuKien báo thiếu
- Kết quả thực tế / bằng chứng: Phát hành lỗi; lỗi: TO_TRINH; hồ sơ Nháp; bộ "Phát hành lỗi"
- Môi trường: giả lập

### TC08 — PASS
- Hàm/module: taoTronBoTheoMau + loại KHÔNG bắt buộc thiếu mẫu
- Dữ liệu đầu vào: Đặt "Tờ trình" không bắt buộc; hồ sơ mới loại "Có tờ trình", chưa có mẫu
- Kết quả mong đợi: Bộ hoàn tất, hồ sơ → Đã tạo hồ sơ; ghi rõ lý do bỏ qua trong phiên
- Kết quả thực tế / bằng chứng: Đã hoàn tất; bỏ qua: TO_TRINH – Chưa có mẫu hiệu lực phù hợp; loại KHÔNG
- Môi trường: giả lập

### TC09 — PASS
- Hàm/module: taoTronBoTheoMau — lỗi ở tài liệu thứ ba
- Dữ liệu đầu vào: Tờ trình (thứ tự 25 → thứ ba) có mẫu nhưng phát hành ném lỗi (mô phỏng lỗi Drive)
- Kết quả mong đợi: Hai tài liệu đầu GIỮ nguyên (Hiệu lực); phiên "Phát hành lỗi"; hồ sơ vẫn Nháp; bộ "Phát hành lỗi"; không xoá gì
- Kết quả thực tế / bằng chứng: đã tạo DE_NGHI_GIAI_NGAN,CHUNG_TU_THANH_TOAN; lỗi TO_TRINH; hồ sơ Nháp; bộ "Phát hành lỗi"
- Môi trường: giả lập

### TC10 — PASS
- Hàm/module: taoTronBoTheoMau — thử lại (tiếp tục / phát hành lại 1 tài liệu / phát hành lại toàn bộ)
- Dữ liệu đầu vào: Tiếp tục phiên lỗi của TC09; tiếp tục khi hồ sơ đã đổi; phát hành lại 1 tài liệu; phát hành lại toàn bộ
- Kết quả mong đợi: Tiếp tục: chỉ tạo phần thiếu, 2 tài liệu cũ dùng lại (không L2); hồ sơ đổi → từ chối; lại 1 tài liệu → L2 + bản cũ "Đã thay thế"; toàn bộ → phiên bản mới
- Kết quả thực tế / bằng chứng: tiếp tục: true; hồ sơ đổi: Không tiếp tục được phiên PH-HS0006-15/10/2026-362: hồ sơ đã; lại 1: L2; toàn bộ: L3,L2,L2
- Môi trường: giả lập

### TC11 — PASS
- Hàm/module: chuyenHoSoVeNhap
- Dữ liệu đầu vào: Hồ sơ A (Đã tạo hồ sơ): về Nháp không truyền revision, rồi với revision đúng
- Kết quả mong đợi: Thiếu revision → THIEU_REVISION; đúng → Nháp, chứng từ cũ GIỮ NGUYÊN trong lịch sử, lịch sử trạng thái ghi lý do
- Kết quả thực tế / bằng chứng: không rev: THIEU_REVISION|Thiếu phiên bản; có rev: true; số bản lịch sử 2→2
- Môi trường: giả lập

### TC12 — PASS
- Hàm/module: luuHoSoGiaiNgan sau khi đã phát hành chứng từ
- Dữ liệu đầu vào: Hồ sơ A (Nháp): đổi số tiền dòng C 500.000 → 600.000
- Kết quả mong đợi: Chứng từ cũ không bị xoá nhưng hiện "Hết hiệu lực do hồ sơ thay đổi"; bộ chứng từ = Hết hiệu lực; file Drive còn
- Kết quả thực tế / bằng chứng: bộ "Hết hiệu lực do hồ sơ thay đổi"; lịch sử: Hết hiệu lực do hồ sơ thay đổi,Hết hiệu lực do hồ sơ thay đổi; file còn: true
- Môi trường: giả lập

### TC13 — PASS
- Hàm/module: kiemTraDuDieuKienGiaiNgan_ / chuyenTrangThaiHoSo_ / xacNhanGiaiNganThucTe
- Dữ liệu đầu vào: Chứng từ hết hiệu lực: (a) hồ sơ Nháp muốn sang Đã tạo hồ sơ, (b) hồ sơ Đã tạo hồ sơ bị đổi dữ liệu trực tiếp trên Sheet rồi xác nhận giải ngân
- Kết quả mong đợi: Cả hai bị chặn, nêu "HẾT HIỆU LỰC"; dữ liệu không đổi
- Kết quả thực tế / bằng chứng: (a) Chưa thể chuyển sang "Đã tạo hồ sơ": bộ chứng từ đang ở trạng thái "Hết hiệu lực | (b) Chưa đủ điều kiện xác nhận giải ngân:
• "Văn bản đề nghị giải ngân" đã HẾT HIỆU 
- Môi trường: giả lập

### TC14 — PASS
- Hàm/module: luuHoSoGiaiNgan / capNhatThongTinPhiTienTe (xung đột)
- Dữ liệu đầu vào: Hai máy cùng đọc revision r rồi lần lượt lưu
- Kết quả mong đợi: Máy 1 thành công; máy 2 bị XUNG_DOT_PHIEN_BAN kèm phiên bản mới; dữ liệu máy 1 còn nguyên
- Kết quả thực tế / bằng chứng: máy 2: XUNG_DOT_PHIEN_BAN|2|Hồ sơ HS0008 đã được người khác thay đổi (phiên b
- Môi trường: giả lập

### TC15 — PASS
- Hàm/module: Mọi hàm cập nhật hồ sơ — expectedRevision bắt buộc
- Dữ liệu đầu vào: Gọi KHÔNG truyền / truyền "abc", -1, 1.5, true / truyền đúng cho: lưu, phi tiền tệ, về Nháp, xoá mềm, khôi phục, trọn bộ, xác nhận, hủy, điều chỉnh
- Kết quả mong đợi: Thiếu → THIEU_REVISION; sai định dạng → REVISION_KHONG_HOP_LE; không tự lấy revision mới nhất; dữ liệu không đổi
- Kết quả thực tế / bằng chứng: thiếu-revision sai: []; revision-sai: []; revision đúng: true
- Môi trường: giả lập

### TC16 — PASS
- Hàm/module: capNhatThongTinPhiTienTe — lỗi giữa chừng
- Dữ liệu đầu vào: Hồ sơ có số tiền lẻ lịch sử (1.500.000,5); đổi tên người hưởng + số GNN; ép lỗi ghi sheet ChiTietThuHuong
- Kết quả mong đợi: Báo lỗi; cha + con phục hồi nguyên trạng (so từng ô), revision KHÔNG tăng, số lẻ lịch sử giữ nguyên, journal DA_PHUC_HOI; lần không lỗi: ghi đủ, tiền không đổi, revision +1
- Kết quả thực tế / bằng chứng: lỗi: Lưu thất bại, dữ liệu cũ đã được giữ nguyên (không đổi revision): Mô p; phục hồi nguyên trạng=true; rev 1→2; số lẻ giữ=1500000.5; journal HOAN_TAT,DA_PHUC_HOI
- Môi trường: giả lập

### TC17 — PASS
- Hàm/module: xacNhanGiaiNganThucTe
- Dữ liệu đầu vào: Hồ sơ Đã tạo hồ sơ, bộ chứng từ đủ; xác nhận NH: ngày hôm nay, tham chiếu FT-TC17, số tiền = tổng hồ sơ, bằng chứng
- Kết quả mong đợi: Hồ sơ → Đã giải ngân; ghi XacNhanGiaiNgan hiệu lực đủ trường; revision +1; lịch sử trạng thái có lý do; báo cáo thực tế có giao dịch
- Kết quả thực tế / bằng chứng: HS0012: Đã giải ngân, rev 2→3, xác nhận XN-HS0012-1 1500000 VND
- Môi trường: giả lập

### TC18 — PASS
- Hàm/module: xacNhanGiaiNganThucTe — thiếu/sai thông tin ngân hàng
- Dữ liệu đầu vào: Lần lượt bỏ: ngày, tham chiếu, bằng chứng; số tiền lệch (từng phần); ngày tương lai; tham chiếu trùng hồ sơ khác; sai loại tiền; hồ sơ còn Nháp
- Kết quả mong đợi: Mọi trường hợp bị từ chối, hồ sơ giữ "Đã tạo hồ sơ", KHÔNG ghi XacNhanGiaiNgan
- Kết quả thực tế / bằng chứng: được chấp nhận nhầm: []; Số tiền thực giải ngân (999.999 VND) khác số tiền hồ sơ (1.000.000 VND
- Môi trường: giả lập

### TC19 — PASS
- Hàm/module: huyGiaiNgan
- Dữ liệu đầu vào: Hồ sơ Đã giải ngân: hủy loại "đã thực hiện", NH thất bại không bằng chứng, không lý do, rồi hợp lệ
- Kết quả mong đợi: Chỉ 2 tình huống chưa/ thất bại được hủy; đã thực hiện bị từ chối kèm hướng dẫn hoàn trả/điều chỉnh; hủy hợp lệ → Đã hủy (kết thúc), xác nhận chuyển "Hủy bỏ" giữ dấu vết; chứng từ giữ
- Kết quả thực tế / bằng chứng: đã thực hiện: Giao dịch ĐÃ được ngân hàng thực hiện thành công thì KHÔNG h; hủy hợp lệ: true; xác nhận → Hủy bỏ; chứng từ 2→2
- Môi trường: giả lập

### TC20 — PASS
- Hàm/module: ghiNhanDieuChinhGiaiNgan
- Dữ liệu đầu vào: Hồ sơ 2.000.000 đã giải ngân thực tế; NH hoàn trả 200.000 (FT-HT1); hoàn trả quá số tiền; trùng tham chiếu; thử hủy sau khi có hoàn trả
- Kết quả mong đợi: Hồ sơ vẫn Đã giải ngân; ròng thực tế 1.800.000; báo cáo thực tế có 2 giao dịch (2.000.000 và −200.000); hủy bị từ chối; đối soát ghi nhận điều chỉnh (thông tin) và KHÔNG báo lệch
- Kết quả thực tế / bằng chứng: ròng 1800000; báo cáo 2000000,-200000; hủy: Hồ sơ HS0016 đã có ghi nhận hoàn trả/điều chỉnh — không hủy 
- Môi trường: giả lập

### TC21 — PASS
- Hàm/module: xoaHoSo / khoiPhucHoSo / layDanhSachHoSoXoaMem
- Dữ liệu đầu vào: Xoá mềm hồ sơ Nháp có chứng từ; thử xoá hồ sơ Đã giải ngân; khôi phục bởi người không phải quản trị; khôi phục khi hợp đồng bị xoá; khôi phục hợp lệ
- Kết quả mong đợi: Xoá cần xác nhận CO_TAI_LIEU; dòng cha/con/chứng từ/file giữ; hiện trong kiểm toán; Đã giải ngân không xoá được; chỉ quản trị khôi phục (cần revision); dữ liệu không tương thích → từ chối; hợp lệ → hoạt động lại
- Kết quả thực tế / bằng chứng: xoá: true; cha/con/file giữ; người thường khôi phục: Bạn không có quyền quản trị để khôi phục; HĐ mất: Không khôi phục được hồ sơ HS0017: hợp đồng HD001 không còn ; khôi phục hợp lệ: true
- Môi trường: giả lập

### TC22 — PASS
- Hàm/module: layBaoCaoGiaiNganThucTe
- Dữ liệu đầu vào: Có hồ sơ Nháp 7.777.777 và Đã tạo hồ sơ 3.333.333 (chưa NH xác nhận) cùng các hồ sơ đã giải ngân
- Kết quả mong đợi: Tổng VND thực tế = đúng tổng các xác nhận hiệu lực; không chứa hồ sơ Nháp / Đã tạo / Đã hủy
- Kết quả thực tế / bằng chứng: VND thực tế 3300000 = tính tay 3300000; Nháp/Đã tạo không có trong báo cáo
- Môi trường: giả lập

### TC23 — PASS
- Hàm/module: layBaoCaoGiaiNganThucTe / layBaoCaoDoiSoat (VND/USD)
- Dữ liệu đầu vào: Hồ sơ USD 25.000 × 25.810 giải ngân thực tế cùng các hồ sơ VND
- Kết quả mong đợi: Tổng VND và USD tách riêng; quy đổi VND của USD hiển thị riêng (645.250.000) và KHÔNG cộng vào tổng VND; đối soát tách nhóm theo loại tiền
- Kết quả thực tế / bằng chứng: USD 25000 (quy đổi 645250000); VND 3300000; quy tắc: Quy đổi VND của giao dịch USD = ROUND(số USD × tỷ 
- Môi trường: giả lập

### TC24 — PASS
- Hàm/module: layBaoCaoTienVay — lọc ngày
- Dữ liệu đầu vào: Hồ sơ không có ngày giải ngân; lọc khoảng ngày / chỉ thiếu ngày / ngày thực tế
- Kết quả mong đợi: Khoảng ngày KHÔNG mặc nhiên gồm hồ sơ thiếu ngày; chiThieuNgay chỉ liệt kê nhóm thiếu; THUC_TE loại hồ sơ chưa có xác nhận
- Kết quả thực tế / bằng chứng: khoảng ngày: thiếu-ngày bị loại; chiThieuNgay: true; không lọc gồm cả hai: true; THUC_TE chỉ hồ sơ đã xác nhận: true
- Môi trường: giả lập

### TC25 — PASS
- Hàm/module: taoTronBoTheoMau + luuHoSoGiaiNgan đồng thời
- Dữ liệu đầu vào: Giữa hai tài liệu của bộ, phiên khác lưu sửa cùng hồ sơ
- Kết quả mong đợi: XUNG_DOT_PHIEN_BAN; phiên "Phát hành lỗi"; hồ sơ vẫn Nháp (không "Đã tạo hồ sơ"); chứng từ đã tạo hiện "Hết hiệu lực"; không trộn dữ liệu cũ/mới thành bộ hoàn tất
- Kết quả thực tế / bằng chứng: XUNG_DOT_PHIEN_BAN|2|Hồ sơ HS0023 đã được người khác thay đổ; phiên "Phát hành lỗi"; hồ sơ Nháp; bộ "Hết hiệu lực do hồ sơ thay đổi"
- Môi trường: giả lập

### TC26 — PASS
- Hàm/module: kiemTraKetQuaLuu / luuHoSoGiaiNgan (mất mạng sau khi ghi)
- Dữ liệu đầu vào: Lưu hồ sơ mới & lưu sửa thành công nhưng phản hồi bị mất; client hỏi kiemTraKetQuaLuu rồi (nếu cần) gửi lại
- Kết quả mong đợi: Biết đã ghi (daGhi); gửi lại hồ sơ mới cùng khoaYeuCau không tạo trùng; gửi lại bản sửa với revision cũ bị XUNG_DOT (không ghi 2 lần)
- Kết quả thực tế / bằng chứng: hồ sơ mới: daGhi=true, gửi lại → HS0024 (daCo=true); sửa: daGhi=true; gửi lại → XUNG_DOT_PHIEN_BAN|2|Hồ sơ HS0
- Môi trường: giả lập

### TC27 — PASS
- Hàm/module: Gửi lại cùng yêu cầu (xác nhận, hủy, về Nháp, trọn bộ)
- Dữ liệu đầu vào: Gửi 2 lần liên tiếp: xác nhận giải ngân, hủy, chuyển về Nháp, phát hành trọn bộ
- Kết quả mong đợi: Lần 2 không tạo bản ghi/chứng từ trùng: xác nhận trùng bị từ chối; hủy lần 2 bị từ chối; về Nháp lần 2 xung đột; trọn bộ lần 2 dùng lại tài liệu (không L2)
- Kết quả thực tế / bằng chứng: trọn bộ lần 2 dùng lại=true; xác nhận lần 2: XUNG_DOT_PHIEN_BAN|3|Hồ sơ HS0025 đã được người kh (bản ghi=1); hủy lần 2: XUNG_DOT_PHIEN_BAN|4|Hồ sơ HS0025 đã đượ; về Nháp lần 2: XUNG_DOT_PHIEN_BAN|3|Hồ sơ HS0
- Môi trường: giả lập

### TC28 — PASS
- Hàm/module: api() + PortalAuthAdapter (chế độ Cổng) — phân quyền API đổi trạng thái
- Dữ liệu đầu vào: Chế độ CONG_HAK; người dùng XEM, NHAP_LIEU; ẩn danh; gọi chuyển trạng thái/xác nhận/hủy/xoá/khôi phục qua api() và gọi trực tiếp
- Kết quả mong đợi: XEM và ẩn danh bị chặn mọi API ghi; NHAP_LIEU xác nhận/hủy được nhưng không khôi phục (quản trị); gọi trực tiếp không qua api() bị chặn
- Kết quả thực tế / bằng chứng: XEM bị chặn 7/7; ẩn danh: [AUTH] Chưa đăng nhập - vui lò; trực tiếp: [AUTH] Chưa đăng nhập qua Cổng; NHAP_LIEU xác nhận: true; khôi phục: [QUYEN] Tài khoản nhap28@x.com; XEM đọc dữ liệu: true
- Môi trường: giả lập

### TC29 — PASS
- Hàm/module: layRevisionDuLieu + luuHoSoGiaiNgan + phát hành (máy khác đổi dữ liệu khi form đang mở)
- Dữ liệu đầu vào: Máy A mở hồ sơ (revision r); máy B lưu; A hỏi layRevisionDuLieu rồi cố lưu / phát hành
- Kết quả mong đợi: A phát hiện revision miền HOSO đã tăng; lưu & phát hành của A đều bị XUNG_DOT_PHIEN_BAN kèm revision mới; dữ liệu B nguyên vẹn (kiểm tra phía giao diện: UI [TC19])
- Kết quả thực tế / bằng chứng: revision HOSO 64→65; lưu: XUNG_DOT_PHIEN_BAN|2|Hồ sơ HS0028 đã đượ; phát hành: XUNG_DOT_PHIEN_BAN|2|Hồ sơ HS0028 đã đượ
- Môi trường: giả lập

### TC30 — PASS
- Hàm/module: Bộ hồi quy hiện có (chạy lại các kịch bản cũ)
- Dữ liệu đầu vào: Chạy lại: logic tiền, hồi quy, tích hợp (mẫu thử + mẫu thật), trình tạo mẫu, đóng gói, vòng đời, đồng bộ, đăng nhập (+ giao diện nếu có Playwright)
- Kết quả mong đợi: Tất cả thoát mã 0 (không lỗi)
- Kết quả thực tế / bằng chứng: chay_thu_logic:OK chay_hoi_quy:OK chay_tich_hop:OK chay_tich_hop_mau_that:OK chay_trinh_tao_mau:OK chay_dong_goi:OK chay_trang_thai:OK chay_dong_bo:OK chay_dang_nhap:OK chay_giao_dien:OK
- Môi trường: giả lập

## B. Phía giao diện (`chay_giao_dien.js`, tag [QT-TCxx])

- [ĐẠT] [QT-TC02] Xem trước: gọi xemTruocChungTu (bản tạm), KHÔNG gọi hàm phát hành, KHÔNG gọi lưu hồ sơ/ghi gì; revision hồ sơ không đổi
- [ĐẠT] [QT-TC02] Xem trước khi form CHƯA LƯU: hỏi xác nhận (xem bản đã lưu, không lưu ngầm); chưa gọi máy chủ
- [ĐẠT] [QT-TC03] Phát hành (1 tài liệu / xuất đã chọn / trọn bộ) khi form CHƯA LƯU: bị chặn, báo lưu trước, KHÔNG gọi máy chủ, KHÔNG lưu ngầm
- [ĐẠT] [QT-TC19] Hủy giải ngân khi chưa chọn tình huống/lý do: chặn ngay ở trình duyệt, không gọi máy chủ; có gợi ý dùng hoàn trả/điều chỉnh nếu tiền đã chuyển
- [ĐẠT] [QT-TC18] Xác nhận giải ngân thiếu thông tin ngân hàng (ngày/tham chiếu/số tiền/bằng chứng): chặn ngay, không gọi máy chủ
- [ĐẠT] [QT-TC17] Xác nhận giải ngân đủ thông tin: gửi đủ trường + expectedRevision; hồ sơ chuyển Đã giải ngân; phiên bản cập nhật
