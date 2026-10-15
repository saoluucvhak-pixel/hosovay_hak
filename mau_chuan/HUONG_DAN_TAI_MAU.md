# Bộ mẫu chuẩn — cách tải vào hệ thống

Tải bằng tài khoản **quản trị**: menu quản lý mẫu văn bản → "Tải mẫu". Mẫu mới cùng **Mã mẫu** sẽ thay thế mẫu cũ (mẫu cũ chuyển "Hết hiệu lực", không bị xoá).

| File | Mã mẫu | Loại tài liệu | Loại tiền | Số dòng | Khổ giấy |
|---|---|---|---|---|---|
| `BANG_KE_VND.xlsx` | `BANG_KE_VND` | Chứng từ thanh toán | VND | `2+` | A4 **ngang** |
| `BANG_KE_USD.xlsx` | `BANG_KE_USD` | Chứng từ thanh toán | USD | `2+` | A4 **ngang** |
| `UNC_2LIEN.xlsx` | `UNC_2LIEN` | Chứng từ thanh toán | Tất cả | `1` | A4 **dọc**, 2 liên / tờ |
| `HDMB_USD.docx` | `HDMB_USD` | Hợp đồng mua bán ngoại tệ | USD | `1+` | A4 dọc, không kẻ khung |
| `HDTD_USD_1_KHOAN.docx` | `HDTD_USD_1` | Đề nghị giải ngân | USD | `1` | Letter (nguyên bản) |
| `HDTD_USD_NHIEU_KHOAN.docx` | `HDTD_USD_N` | Đề nghị giải ngân | USD | `2-999` | Letter (nguyên bản) |
| `HDTD_VND_1_KHOAN.docx` | `HDTD_VND_1` | Đề nghị giải ngân | VND | `1` | Letter (nguyên bản) |
| `HDTD_VND_NHIEU_KHOAN.docx` | `HDTD_VND_N` | Đề nghị giải ngân | VND | `2-999` | Letter (nguyên bản) |

- Nếu **chưa tải** mẫu HĐMB, hệ thống dùng biểu mẫu mặc định dựng bằng code (khác mẫu công ty).
- HĐTD giữ nguyên chữ và bố cục mẫu gốc; chỉ thêm lề trong ô bảng, không cắt đôi hàng bảng giữa 2 trang, lặp tiêu đề bảng.
- Sinh lại bộ mẫu: `python3 kiem_thu/tao_mau_chuan.py`; kiểm thử: `node kiem_thu/chay_mau_chuan.js`.
