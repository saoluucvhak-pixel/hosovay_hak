# BÁO CÁO ĐỐI CHIẾU DỮ LIỆU GOOGLE SHEETS TRƯỚC/SAU NGHIỆP VỤ

> **Môi trường:** Google Sheets GIẢ LẬP + dữ liệu thử (không phải dữ liệu thật, không phải Google thật). Mỗi bước chụp toàn bộ các sheet theo dõi trước/sau, so từng ô, kiểm tra bất biến (tổng cha = tổng con, không chi tiết mồ côi, hợp đồng tồn tại, trạng thái hợp lệ, số tiền hợp lệ). Cùng chuỗi bước được chạy trên **mã cũ (main trước nâng cấp)** và **mã mới** để chứng minh nâng cấp không làm đổi dữ liệu nghiệp vụ.

**Kết luận tổng:** bất biến sau mọi bước — mã mới: 0 lỗi; mã cũ: 0 lỗi. Số ô khác nhau giữa trạng thái Sheets CUỐI của mã cũ và mã mới: **0**.

## 1. Từng bước: dữ liệu Sheets trước → sau (mã MỚI)

| Bước | Nghiệp vụ | Kỳ vọng | Kết quả nghiệp vụ | Thay đổi trong Sheets (dòng trước→sau, +thêm/−xoá/~ô đổi) | Bất biến |
|---|---|---|---|---|---|
| B01 | Lưu công ty vay vốn | thêm 1 dòng DM_CongTy | Thành công | DM_CongTy: 0→1 dòng, +1/−0/~0 ô | Đạt (0 hồ sơ / 0 chi tiết) |
| B02 | Lưu hợp đồng vay thứ 1 | thêm 1 dòng DM_HopDongVay | Thành công | DM_HopDongVay: 0→1 dòng, +1/−0/~0 ô | Đạt (0 hồ sơ / 0 chi tiết) |
| B03 | Lưu hợp đồng vay thứ 2 | thêm 1 dòng DM_HopDongVay | Thành công | DM_HopDongVay: 1→2 dòng, +1/−0/~0 ô | Đạt (0 hồ sơ / 0 chi tiết) |
| B04 | Bấm lưu hợp đồng trùng số (lỗi bấm 2 lần) | bị chặn, Sheet không đổi | Từ chối: Công ty này đã có hợp đồng số "HD-DC-01" (mã HD001). Hãy mở hợp đồng đó để sửa, không tạo thêm bản trùng. | (không đổi) | Đạt (0 hồ sơ / 0 chi tiết) |
| B05 | Tạo hồ sơ VND 2 dòng thụ hưởng (1.000.000 + 2.000.000) | +1 HoSoGiaiNgan, +2 ChiTietThuHuong, tổng khớp | Thành công | HoSoGiaiNgan: 0→1 dòng, +1/−0/~0 ô; ChiTietThuHuong: 0→2 dòng, +2/−0/~0 ô; BaoCaoTienVay_Draft: 0→2 dòng, +2/−0/~0 ô | Đạt (1 hồ sơ / 2 chi tiết) |
| B06 | Gửi lại đúng yêu cầu vừa lưu (mất mạng rồi bấm lại, cùng khoaYeuCau) | không tạo hồ sơ trùng | Thành công | (không đổi) | Đạt (1 hồ sơ / 2 chi tiết) |
| B07 | Tạo hồ sơ USD 1 dòng (25.000 USD, tỷ giá 25.810) | +1 hồ sơ USD, SoTienQuyDoi = 645.250.000 | Thành công | HoSoGiaiNgan: 1→2 dòng, +1/−0/~0 ô; ChiTietThuHuong: 2→3 dòng, +1/−0/~0 ô; BaoCaoTienVay_Draft: 2→3 dòng, +1/−0/~0 ô | Đạt (2 hồ sơ / 3 chi tiết) |
| B08 | Sửa hồ sơ VND: đổi số tiền và thêm dòng thứ 3 | chi tiết thay đúng 3 dòng, tổng cha 4.000.000, Revision 2 | Thành công | HoSoGiaiNgan: 2→2 dòng, +0/−0/~3 ô; ChiTietThuHuong: 3→4 dòng, +1/−0/~3 ô; BaoCaoTienVay_Draft: 3→4 dòng, +1/−0/~2 ô | Đạt (2 hồ sơ / 4 chi tiết) |
| B09 | Lưu bằng revision CŨ (người khác đã sửa) — phải bị từ chối | báo xung đột, Sheet không đổi | Từ chối: XUNG_DOT_PHIEN_BAN/2/Hồ sơ HS0001 đã được người khác thay đổi (phiên bản hiện tại 2, bạn đang xem phiên bản 1). Hãy tải  | (không đổi) | Đạt (2 hồ sơ / 4 chi tiết) |
| B10 | Cập nhật thông tin phi tiền tệ (số giấy nhận nợ, tên người hưởng) | số tiền KHÔNG đổi, Revision 3 | Thành công | HoSoGiaiNgan: 2→2 dòng, +0/−0/~2 ô; ChiTietThuHuong: 4→4 dòng, +0/−0/~1 ô | Đạt (2 hồ sơ / 4 chi tiết) |
| B11 | Các thao tác chỉ ĐỌC (danh sách, tìm kiếm, tổng quan, báo cáo, đối soát) | Sheet KHÔNG đổi | Thành công | (không đổi) | Đạt (2 hồ sơ / 4 chi tiết) |
| B12 | Xoá mềm hồ sơ USD | DaXoa=TRUE, dòng cha/con còn nguyên | Thành công | HoSoGiaiNgan: 2→2 dòng, +0/−0/~4 ô; BaoCaoTienVay_Draft: 4→3 dòng, +1/−2/~2 ô | Đạt (2 hồ sơ / 4 chi tiết) |
| B13 | Khôi phục hồ sơ USD (quản trị) | DaXoa=FALSE, Revision tăng | Thành công | HoSoGiaiNgan: 2→2 dòng, +0/−0/~2 ô | Đạt (2 hồ sơ / 4 chi tiết) |

## 2. Chi tiết ô thay đổi (mã MỚI)

**B01** — Lưu công ty vay vốn
- `DM_CongTy`: 0→1 dòng; thêm: CTY001

**B02** — Lưu hợp đồng vay thứ 1
- `DM_HopDongVay`: 0→1 dòng; thêm: HD001

**B03** — Lưu hợp đồng vay thứ 2
- `DM_HopDongVay`: 1→2 dòng; thêm: HD002

**B04** — Sheets không đổi.

**B05** — Tạo hồ sơ VND 2 dòng thụ hưởng (1.000.000 + 2.000.000)
- `HoSoGiaiNgan`: 0→1 dòng; thêm: HS0001
- `ChiTietThuHuong`: 0→2 dòng; thêm: HS0001|1, HS0001|2
- `BaoCaoTienVay_Draft`: 0→2 dòng; thêm: HS0001|NCC A, HS0001|NCC B

**B06** — Sheets không đổi.

**B07** — Tạo hồ sơ USD 1 dòng (25.000 USD, tỷ giá 25.810)
- `HoSoGiaiNgan`: 1→2 dòng; thêm: HS0002
- `ChiTietThuHuong`: 2→3 dòng; thêm: HS0002|1
- `BaoCaoTienVay_Draft`: 2→3 dòng; thêm: HS0002|NCC Mỹ

**B08** — Sửa hồ sơ VND: đổi số tiền và thêm dòng thứ 3
- `HoSoGiaiNgan`: 2→2 dòng; ô đổi: HS0001.SoTienNhanNoLanNay 3000000→4000000 · HS0001.SoTienBangChu "Ba triệu đồng chẵn"→"Bốn triệu đồng chẵn" · HS0001.Revision 1→2
- `ChiTietThuHuong`: 3→4 dòng; thêm: HS0001|3; ô đổi: HS0001|2.SoTaiKhoan "92000000"→"92500000" · HS0001|2.SoTien 2000000→2500000 · HS0001|2.SoTienQuyDoi 2000000→2500000
- `BaoCaoTienVay_Draft`: 3→4 dòng; thêm: HS0001|NCC C; ô đổi: HS0001|NCC B.SoTienVay 2000000→2500000 · HS0001|NCC B.SoTienQuyDoi 2000000→2500000

**B09** — Sheets không đổi.

**B10** — Cập nhật thông tin phi tiền tệ (số giấy nhận nợ, tên người hưởng)
- `HoSoGiaiNgan`: 2→2 dòng; ô đổi: HS0001.SoGiayNhanNo "GNN-DC-1"→"GNN-DC-SUA" · HS0001.Revision 2→3
- `ChiTietThuHuong`: 4→4 dòng; ô đổi: HS0001|1.TenNguoiHuong "NCC A"→"NCC A (sửa)"

**B11** — Sheets không đổi.

**B12** — Xoá mềm hồ sơ USD
- `HoSoGiaiNgan`: 2→2 dòng; ô đổi: HS0002.Revision 1→2 · HS0002.DaXoa ""→true · HS0002.NguoiXoa ""→"ketoan@example.com" · HS0002.LyDoXoa ""→"nhập nhầm"
- `BaoCaoTienVay_Draft`: 4→3 dòng; thêm: HS0001|NCC A (sửa); xoá: HS0001|NCC A, HS0002|NCC Mỹ; ô đổi: HS0001|NCC B.SoGiayNhanNo "GNN-DC-1"→"GNN-DC-SUA" · HS0001|NCC C.SoGiayNhanNo "GNN-DC-1"→"GNN-DC-SUA"

**B13** — Khôi phục hồ sơ USD (quản trị)
- `HoSoGiaiNgan`: 2→2 dòng; ô đổi: HS0002.Revision 2→3 · HS0002.DaXoa true→false

## 3. Tương đương mã cũ ↔ mã mới, từng bước

| Bước | Giống nhau? | Ghi chú |
|---|---|---|
| B01 | Giống |  |
| B02 | Giống |  |
| B03 | Giống |  |
| B04 | Giống |  |
| B05 | Giống |  |
| B06 | Giống |  |
| B07 | Giống |  |
| B08 | Giống |  |
| B09 | Giống |  |
| B10 | Giống |  |
| B11 | Giống |  |
| B12 | Giống |  |
| B13 | Giống |  |

## 4. Khác biệt trạng thái Sheets CUỐI (cũ vs mới)

Không có: hai trạng thái Sheets cuối **giống hệt** nhau (bỏ qua các cột thời điểm và mã ngẫu nhiên).

## 5. Giới hạn
- Dữ liệu thử trong Sheets giả lập; chưa đối chiếu trên Google Sheets thật (độ trễ, định dạng ô, giới hạn dòng, quyền chia sẻ).
- Cột thời điểm (CapNhatLuc, NgayTao…) và mã yêu cầu ngẫu nhiên bị bỏ qua khi so sánh.
- Chuỗi bước không gồm phát hành chứng từ (cần mẫu DOCX và Drive) — phần đó được kiểm riêng ở `chay_tich_hop*.js`.
