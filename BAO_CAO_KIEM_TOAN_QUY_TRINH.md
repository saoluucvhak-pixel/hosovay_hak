# BÁO CÁO KIỂM TOÁN LOGIC & HOÀN THIỆN QUY TRÌNH NGHIỆP VỤ — HOSOVAY_HAK
Nhánh: `claude/hosovay-quy-trinh-nghiep-vu` (tách từ `claude/friendly-faraday-g049cv`; không đụng `main`). Không thay đổi dữ liệu sản xuất. Không thêm hệ thống đăng nhập/phân quyền riêng (vẫn qua Cổng HAK: `api()` + bảng quyền).

> **Trung thực về kiểm thử:** toàn bộ test chạy trên **dịch vụ Apps Script GIẢ LẬP** (Node vm) và Chromium với `google.script.run` giả. **Chưa** có test nào trên Google Apps Script/Sheets/Drive/Cổng HAK thật. Xem mục 7.

## 1. Kiểm toán TRƯỚC khi sửa — bảng luồng
| Nút/luồng | Hàm client → API | Sheet đọc/ghi | Trạng thái | Chứng từ | Lỗi giữa chừng | Lối vòng (bypass) |
|---|---|---|---|---|---|---|
| Xem trước | `xemTruoc` → **`luuHoSo` rồi** phát hành | ghi HoSoGiaiNgan+Chi tiết | tự ghi | tạo file thật | hồ sơ đã bị ghi | ghi ngầm; hồ sơ khoá (Đã tạo) không xem trước được |
| Phát hành 1 chứng từ | `taoDeNghi…` sau `luuHoSo` | như trên | — | file thật | không biết bộ nào dở | revision tuỳ chọn |
| Tạo trọn bộ | `taoTronBoTheoMau` | lịch sử phát hành, trạng thái | luôn → "Đã tạo hồ sơ" | bộ cố định | tạo lại = trùng phiên bản | loại tuỳ chọn bắt buộc bị bỏ qua nếu thiếu mẫu |
| Cập nhật phi tiền tệ | `capNhatThongTinPhiTienTe` | cha rồi con (không journal) | — | — | cha mới/con cũ | revision tuỳ chọn |
| Đánh dấu giải ngân | `danhDauDaGiaiNgan` | HoSo | → Đã giải ngân | không kiểm hiệu lực | — | không cần bằng chứng NH |
| Xoá/khôi phục | `xoaHoSo`/`khoiPhucHoSo` | DaXoa | — | giữ | khôi phục không kiểm | không revision |
| Báo cáo | `layBaoCaoTienVay` | đọc | — | — | — | hồ sơ thiếu ngày lọt vào mọi khoảng ngày; Nháp lẫn vào số giải ngân |

## 2. Danh sách lỗi theo mức ưu tiên & nguyên nhân gốc
| # | Mức | Lỗi | Nguyên nhân gốc | Sửa |
|---|---|---|---|---|
| 1 | P0 | Xem trước/phát hành **ghi ngầm** hồ sơ; hồ sơ đã khoá không phát hành lại được | Client gọi `luuHoSo` trước mọi tác vụ | Tách: `xemTruocChungTu` chỉ đọc, file tạm có vòng đời; phát hành chỉ từ dữ liệu đã lưu + đúng revision |
| 2 | P0 | `expectedRevision` tuỳ chọn ở nhiều đường ghi | Kiểm revision "nếu có" | `kiemTraRevisionBatBuoc_`: THIẾU→`THIEU_REVISION`, sai→`REVISION_KHONG_HOP_LE`, lệch→`XUNG_DOT_PHIEN_BAN`; áp cho lưu, phi tiền tệ, về Nháp, chuyển trạng thái, xoá, khôi phục, phát hành, trọn bộ, xác nhận/hủy/điều chỉnh |
| 3 | P0 | "Đã tạo hồ sơ" khi bộ chưa đủ; loại bắt buộc tự thêm thiếu mẫu bị bỏ qua | Không có khái niệm bộ/bắt buộc | Cấu hình loại tài liệu (BatBuoc, ApDung…); chỉ sang "Đã tạo hồ sơ" khi mọi chứng từ bắt buộc hiệu lực + khớp dữ liệu |
| 4 | P0 | "Đã giải ngân" không cần xác nhận ngân hàng; cho phép chứng từ cũ | Không có sổ xác nhận | Sheet `XacNhanGiaiNgan`: ngày thực tế, số tham chiếu NH, số tiền thực, loại tiền, bằng chứng, người/giờ; chặn trùng/từng phần |
| 5 | P0 | Cập nhật phi tiền tệ không nguyên tử, làm mất số lẻ lịch sử | Ghi cha rồi con không phục hồi | Viết lại: kiểm tra, snapshot, journal, ghi batch, đọc lại, phục hồi, revision chỉ tăng khi thành công |
| 6 | P1 | Chứng từ hiện "Đã phát hành" dù dữ liệu đã đổi | Không so hash/revision | `HashDuLieu`+`RevisionHoSo`; "Hết hiệu lực do hồ sơ thay đổi"; chặn giải ngân khi hết hiệu lực |
| 7 | P1 | Thử lại bộ lỗi tạo phiên bản trùng | Không có phiên phát hành | `PhienPhatHanhBo` + 3 chế độ thử lại (tiếp tục / 1 tài liệu / toàn bộ) |
| 8 | P1 | Báo cáo: thiếu ngày lọt khoảng ngày; Nháp vào giải ngân; | Điều kiện lọc | Bộ lọc riêng "chỉ thiếu ngày"; ngày kế hoạch vs thực tế; báo cáo thực tế chỉ từ xác nhận NH hiệu lực |
| 9 | P2 | Khôi phục không kiểm tính toàn vẹn | — | Quản trị + revision + kiểm trùng mã/hợp đồng/tổng cha–con |
| 10 | P2 | Hủy giao dịch đã thực hiện xoá dấu vết | — | Hủy chỉ khi NH chưa thực hiện/thất bại (có bằng chứng); đã thực hiện → hoàn trả/điều chỉnh |

## 3. Luồng mới (sơ đồ)
```
Nháp --(lưu, rev bắt buộc)--> Nháp
Nháp --(Xem trước: ĐỌC-ONLY, file tạm tự dọn)--> (không đổi dữ liệu)
Nháp --(Phát hành trọn bộ, đủ chứng từ bắt buộc, hiệu lực)--> Đã tạo hồ sơ [nội dung khoá]
Đã tạo hồ sơ --(về Nháp + lý do, rev)--> Nháp   (chứng từ cũ giữ lịch sử)
Đã tạo hồ sơ --(xác nhận NH: ngày/tham chiếu/số tiền/bằng chứng)--> Đã giải ngân
Đã tạo hồ sơ|Đã giải ngân(chưa/thất bại) --(hủy + lý do/bằng chứng)--> Đã hủy [kết thúc]
Đã giải ngân --(hoàn trả/điều chỉnh)--> Đã giải ngân (ròng thực tế thay đổi)
Bộ chứng từ: Chưa phát hành → Đang phát hành → Phát hành thiếu | Phát hành lỗi | Đã hoàn tất → Hết hiệu lực do hồ sơ thay đổi
```

## 4. File/hàm thay đổi
Mới: `BOCHUNGTU.gs` (phiên, trạng thái bộ, hiệu lực), `GIAINGANTHUCTE.gs` (`xacNhanGiaiNganThucTe`, `huyGiaiNgan`, `ghiNhanDieuChinhGiaiNgan`, `layXacNhanGiaiNgan`, `layBaoCaoGiaiNganThucTe`), `kiem_thu/chay_quy_trinh.js`.
Sửa: `HOSODOMAIN.gs` (`kiemTraRevisionBatBuoc_`, `kiemTraDuDieuKienGiaiNgan_`, `chuyenTrangThaiHoSo_`, `chuyenHoSoVeNhap`, `xoaHoSo`, `khoiPhucHoSo`), `DOCUMENTSERVICE.gs` (`phatHanhChungTu_`, `xemTruocChungTu`, `donXemTruocCu_`), `DocGenerator.gs` (`taoTronBoTheoMau`), `DOCUMENTAUDIT.gs`, `DataService.gs` (`luuHoSoGiaiNganKhongKhoa_`, `capNhatThongTinPhiTienTeKhongKhoa_`, `layBaoCaoTienVay_`), `DOISOAT.gs`, `Setting.gs`, `TEMPLATEMAPPER.gs`, `DATASYNC.gs` (mã lỗi), `PHIEN.gs` (bảng quyền), `JavaScript.html`, `Index.html`.
**Bỏ:** `danhDauDaGiaiNgan` (thay bằng `xacNhanGiaiNganThucTe`).

## 5. Migration (tự động, không đụng dữ liệu cũ)
- Tab mới (tự tạo khi chạy "Khởi tạo / kiểm tra cấu trúc Sheet"): **`PhienPhatHanhBo`**, **`XacNhanGiaiNgan`**.
- Cột mới: `RevisionHoSo` trong `LichSuPhatHanhTaiLieu`; bản cũ không có giá trị → xét bằng `HashDuLieu`.
- Loại tài liệu tự thêm cũ: mặc định `BatBuoc=false` → **quản trị cần đặt lại** nếu muốn bắt buộc.
- Hồ sơ đã "Đã giải ngân" từ trước: chưa có xác nhận NH → đối soát báo `THIẾU_XÁC_NHẬN`; nhập bổ sung bằng ghi nhận điều chỉnh/đối soát, không sửa tay Sheet.

## 6. Triển khai & rollback
1. Backup Spreadsheet (Tệp → Tạo bản sao). 2. Dán các file `_gui/*.txt` (bỏ `.txt`) vào Apps Script, thêm 2 file `.gs` mới. 3. Chạy "Khởi tạo / kiểm tra cấu trúc Sheet". 4. Triển khai lại web app (phiên bản mới). 5. Kiểm nhanh: lưu hồ sơ → xem trước → trọn bộ → xác nhận giải ngân.
**Rollback:** triển khai lại phiên bản cũ; tab/cột mới không cản trở bản cũ. **Lưu ý:** bản cũ không hiểu `DaXoa` → hồ sơ xoá mềm có thể hiện lại; không xoá tab `XacNhanGiaiNgan`/`PhienPhatHanhBo` (mất dấu vết giải ngân).

## 7. Kết quả kiểm thử (đầy đủ ở `BAO_CAO_KIEM_THU_QUY_TRINH.md`)
| Bộ | Kết quả | Loại |
|---|---|---|
| Quy trình TC01–TC30 | 30/30 PASS | GIẢ LẬP |
| Hồi quy 22 · tích hợp 118 · mẫu thật 102 · trình tạo mẫu 29 · đóng gói 34 · vòng đời 54 · đồng bộ 25 · đăng nhập 37 | tất cả PASS | GIẢ LẬP |
| Giao diện Chromium | 111/111 PASS | UI thật + `google.script.run` GIẢ |
Chưa kiểm trên GAS thật: LockService thực, quota Drive, chuyển DOCX→PDF, SSO Cổng HAK thật.
