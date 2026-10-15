# TÀI LIỆU DESIGN SYSTEM — HỒ SƠ VAY HAK (hiện trạng + chuẩn áp dụng)
Nguồn thật: `Stylesheet.html` (token ở `:root`), `Index.html`, `JavaScript.html`. Tài liệu này mô tả **những gì đã có và đã áp dụng**, không mô tả thiết kế chưa làm.

## 1. Token (đã có trong `Stylesheet.html`)
| Nhóm | Token | Giá trị | Dùng cho |
|---|---|---|---|
| Màu thương hiệu | `--primary` / `--accent` | `#2563eb` | nút chính, liên kết, tab đang chọn |
| | `--primary-soft` | `#DBEAFE` | nền chip, dòng đang chọn |
| Thành công / lỗi / cảnh báo | `--success` `#16a34a` + `--success-bg`; `--danger` `#dc2626` + `--danger-bg`; `--amber` `#b45309` + `--amber-bg` | | thông báo, trạng thái |
| Nền | `--content-bg` `#f3f4f6`; `--card-bg` `#fff`; `--card-border` `#e5e7eb` | | khung trang, thẻ |
| Chữ | `--text-primary` `#1f2937`; `--text-secondary` `#4b5563`; `--text-muted` `#6b7280` | | |
| Hình khối | `--radius` 12px; `--shadow-card` | | thẻ, modal |
| Phông | Manrope (nội dung), IBM Plex Mono (mã/số) | 13px cơ sở | |
Không có token khoảng cách riêng: dùng lớp `.spacer`, `.grid`, `.grid2`. **Tồn đọng:** chưa gom khoảng cách/cỡ chữ thành token.

## 2. Thành phần
| Thành phần | Lớp / hàm | Ghi chú |
|---|---|---|
| Nút | `.btn` + `.btn-primary` (hành động chính) · `.btn-secondary` (phụ) · `.btn-success` (tạo mới) · `.btn-danger` (nguy hiểm — luôn có hộp xác nhận `modalXacNhan`) | `disabled` khi đang xử lý |
| Thẻ | `.card`, tiêu đề `h3` | |
| Lưới form | `.grid`, `.grid2`, nhãn `<label>` + gợi ý `.hint` | |
| Bảng dữ liệu | `table.detail` | số tiền căn phải; **tiêu đề cố định khi cuộn** (`#tbl_dsHoSo thead th {position:sticky}`, khung cuộn `max-height:65vh`) |
| Huy hiệu trạng thái | `.trangthai-badge` + `trangthai-nhap / -daigiaingan / -huy` | luôn kèm CHỮ trạng thái, không chỉ dùng màu |
| Thông báo | `#msgBox` + `.msg-ok / .msg-err`; hàm `baoThanhCong()`, `baoLoi()` | nội dung được **thoát HTML** (`esc()`); chỉ báo thành công sau khi máy chủ xác nhận |
| Chip bộ lọc | `.chip-loc` (+ dấu ✕ bỏ từng điều kiện) | **mới** |
| Thanh phân trang | `#hs_phanTrang` | **mới** (Trước / số trang / Sau, 20-50-100 dòng, tổng bản ghi, tổng tiền VND và USD tách riêng) |
| Tab cha–con | `.hoso-tabbar` + `.hoso-tab` (`chuyenTabChiTietHoSo`) | đã có từ trước: hồ sơ (cha) gồm 5 tab con (Công ty & hợp đồng → Giấy nhận nợ → Tải hồ sơ → Danh sách thụ hưởng → Thực hiện/Văn bản) trong CÙNG màn hình, có cảnh báo thay đổi chưa lưu |
| Hộp xác nhận | `modalXacNhan` (`xacNhanDongY_`) | hủy/xoá/giải ngân |
| Trạng thái rỗng / đang tải / lỗi | `Không có hồ sơ nào khớp…` (kèm liên kết "Xoá lọc"), `Đang tải...` + làm mờ bảng, `LỖI: …` | |

## 3. Mẫu bộ lọc chuẩn (đã áp dụng cho danh sách hồ sơ)
1. **Tìm kiếm nhanh** (ô trên cùng, debounce 400 ms, Enter gửi ngay) + **Trạng thái** (chọn nhanh).
2. **Bộ lọc nâng cao** mở/đóng bằng nút (`aria-expanded`), gồm: khoảng ngày giải ngân, người thụ hưởng, công ty, hợp đồng, loại tiền, "chỉ hồ sơ thiếu ngày". Nút **Áp dụng** và **Xoá lọc**; nút ghi số điều kiện đang dùng, vd "Bộ lọc nâng cao (3)".
3. Mỗi điều kiện hiện thành **chip** có ✕ để bỏ riêng; đổi điều kiện → **về trang 1**; xem chi tiết rồi quay lại → **giữ nguyên** bộ lọc/sắp xếp/trang.
4. Gửi **một** đối tượng `{page, pageSize, search, filters, sortBy, sortDir}` tới máy chủ (`layTrangHoSo`) — frontend không tự lọc.
**Tồn đọng:** mẫu này mới áp dụng cho danh sách hồ sơ. Màn Hợp đồng/Khách hàng/Báo cáo vẫn dùng bộ lọc riêng và chưa chuyển sang cùng một component.

## 4. Trạng thái & truy cập (a11y)
Có: nhãn `aria-label` cho ô tìm kiếm/số trang/cỡ trang, `aria-sort` trên tiêu đề bảng, `aria-live` cho dòng số lượng, trạng thái luôn có chữ. Chưa kiểm: tương phản màu theo WCAG, điều hướng bàn phím toàn bộ modal, trình đọc màn hình thật (cần kiểm tay).

## 5. Responsive
`@media (max-width:1100px)` và `(max-width:900px)` trong `Stylesheet.html`; thanh công cụ lọc dùng `flex-wrap`. **Chưa kiểm** trên thiết bị/trình duyệt thật ngoài Chromium giả lập.

## 6. Chưa làm (không tuyên bố đạt)
Date picker riêng (đang dùng `<input type="date">`), dropdown có tìm kiếm cho danh mục lớn, skeleton loading, toast tự ẩn, phân quyền ẩn/hiện nút theo từng quyền chi tiết (hiện theo trạng thái hồ sơ; quyền thật kiểm ở backend), gom khoảng cách/cỡ chữ thành token.
