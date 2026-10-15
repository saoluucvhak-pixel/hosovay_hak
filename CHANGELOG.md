# CHANGELOG

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
