# Nâng cấp danh mục tài sản, thế chấp và bảo hiểm

## Cách dùng

Menu **Tài sản & Thế chấp** có ba màn hình:

1. **Danh mục tài sản**: chọn công ty quản lý/vay; nhập tên, loại, chủ sở hữu (công ty/tổ chức khác/cá nhân), địa điểm, số hiệu, nguyên giá và khấu hao. Giá trị còn lại do máy chủ tính. Chủ sở hữu không mặc nhiên là công ty quản lý.
2. **Đăng ký thế chấp**: chọn hợp đồng và tài sản trong danh mục; nhập mã đăng ký, hợp đồng bảo đảm, ngày đăng ký, ngày định giá, đơn vị định giá, số chứng thư. Có định giá từng tài sản hoặc tổng cả nhóm. Không tự chia tổng định giá nhóm. Bấm Sửa để định giá lại, Lịch sử để đối chiếu các phiên bản.
3. **Bảo hiểm tài sản**: chọn trực tiếp tài sản trong danh mục (không cần đã thế chấp), nhập hợp đồng, công ty bảo hiểm, ngày ký. Mỗi tài sản có giá trị tài sản được bảo hiểm, số tiền bảo hiểm, phí và thời hạn. Giá trị tài sản được bảo hiểm được gợi ý bằng giá trị còn lại, phải kiểm tra theo hợp đồng; không dùng định giá thế chấp làm số tiền bảo hiểm.

**Gia hạn mới** tạo hợp đồng bảo hiểm mới. Kiểm tra ngày bắt đầu và đến ngày; không tự coi gia hạn đã liên tục. **Giải chấp** áp dụng toàn bộ đăng ký; không xóa tài sản hoặc hủy bảo hiểm. Hủy bảo hiểm cũng không giải chấp. Mỗi lần thay đổi giữ phiên bản cũ cùng người ghi và thời điểm.

## Chống chồng lấn và lỗi ghi

- Một mã tài sản dùng chung cho chi tiết thế chấp và bảo hiểm. Không ghép tài sản chỉ theo tên.
- Cùng hợp đồng vay: không đăng ký lại tài sản đang được bảo đảm trong một đăng ký khác. Mã đăng ký không trùng trong công ty quản lý.
- Báo cáo cộng tổng định giá mỗi đăng ký đang bảo đảm một lần. Giải chấp loại giá trị khỏi tổng bảo đảm.
- Cảnh báo theo mã tài sản và khoảng thời gian bảo hiểm. Một tài sản chưa mua bảo hiểm vẫn làm nhóm có cảnh báo.
- Máy chủ kiểm quyền, phạm vi công ty, tiền, ngày, liên kết và revision. Không xóa hợp đồng vay đã có lịch sử thế chấp.
- Ghi chi tiết vào phiên mới, đọc lại xác minh rồi mới chốt bản cha. Phiên chưa chốt không tham gia báo cáo.
- Cùng khóa yêu cầu và nội dung: thử lại không tạo trùng. Nếu báo CHUA_XAC_DINH, giữ nguyên biểu mẫu và bấm Lưu để xác minh. Không tạo yêu cầu khác cho cùng nghiệp vụ khi chưa biết kết quả.

## Dữ liệu cũ

Không chuyển tự động `TaiSanBaoDam`, `BaoHiemTaiSan`, `BaoHiemTaiSanChiTiet`. Một dòng cũ có thể đại diện cho cả nhóm nên chưa đủ căn cứ xác định từng tài sản/chủ sở hữu. Các dòng cũ vẫn được báo cáo và thao tác theo cơ chế cũ. Menu nhập Excel cũ được ghi rõ **Nhập bảo hiểm cũ**.

Không tạo lại cùng đăng ký vào mô hình mới khi bản cũ còn được tính trong tổng bảo đảm. Việc chuyển các hồ sơ cũ cần lập bảng đối chiếu từng tài sản và các hợp đồng bảo hiểm trước; bản nâng cấp này chưa thực hiện chuyển dữ liệu vận hành.

## Cấu trúc lưu trữ mới

- `DM_TaiSan`: phiên bản danh mục.
- `DangKyTheChap` và `DangKyTheChapChiTiet`: đăng ký + tài sản/định giá.
- `BaoHiemDanhMuc` và `BaoHiemDanhMucChiTiet`: hợp đồng bảo hiểm + tài sản/thời hạn/tiền.

Bảng cha có mã, revision, công ty quản lý, phiên, khóa yêu cầu, nội dung JSON, số dòng, thời điểm, người ghi. Chi tiết tham chiếu mã cha + phiên và mã tài sản. Nội dung JSON giữ bản chụp thông tin tại lần ghi. Không sửa trực tiếp ô JSON trên Sheets.

Các bảng được tạo khi lưu lần đầu; thao tác đọc không tự tạo dữ liệu. Mỗi lần tối đa 100 tài sản và có giới hạn kích thước bản ghi; nếu vượt, ứng dụng báo lỗi thay vì ghi thiếu chi tiết. Danh sách đọc mỗi bảng con một lần, không gọi Sheets riêng cho mỗi hợp đồng.

## Cập nhật Apps Script

Tạo mới đúng tên **TAISANDANHMUC.gs** và **TaiSanDanhMuc.html**. Thay toàn bộ nội dung các file sau bằng bản cùng đợt:

- BAODAM.gs
- DataService.gs
- PHIEN.gs
- QUANHEDULIEU.gs
- Index.html
- JavaScript.html
- QuanLyVayGiaoDien.html
- HuongDanQuyTrinh.html
- LuongDuLieu.html

Lưu dự án. Với URL `/exec`: Deploy → Manage deployments → Edit → New version → Deploy; giữ deployment hiện có để giữ URL. Tải lại app, vào **Tài sản & Thế chấp**. URL `/dev` dùng mã đã lưu của dự án có quyền chỉnh sửa.

Bản cập nhật GitHub không tự cập nhật deployment Google Apps Script. Nên kiểm tra trên bản thử có Sheets tách riêng trước khi dùng dữ liệu vận hành.

## Kiểm chứng

Bộ kiểm thử mới `danh_muc_tai_san.js` kiểm tra quyền, phạm vi, công thức còn lại, liên kết, định giá nhóm/từng tài sản, gửi lại, phiên bản, giải chấp, hủy, lịch sử, lỗi ghi con và lỗi phản hồi sau ghi cha. `giao_dien_danh_muc_tai_san.js` kiểm tra payload, định giá nhóm, retry và 8 cấu hình chiều rộng/sáng tối. Dịch vụ Google được giả lập; ảnh giao diện là mô phỏng bằng Edge, không phải dữ liệu thật.

## Tỷ lệ phí và tối ưu tải dữ liệu

Mỗi tài sản trong hợp đồng bảo hiểm có tỷ lệ phí (%), chế độ Tự tính/Nhập tay và phí bảo hiểm. Tự tính: phí = giá trị tài sản được bảo hiểm × tỷ lệ / 100, làm tròn đến đồng (0,5 đồng làm tròn lên). Ví dụ 100.000.000 × 0,2% = 200.000 VND. Căn cứ tính là giá trị tài sản được bảo hiểm, không phải số tiền bảo hiểm.

Gõ vào ô phí chuyển sang Nhập tay. Sau đó đổi giá trị hoặc tỷ lệ không ghi đè phí đã nhập; muốn tự tính lại, chọn Tự tính. Phí cũ thiếu tỷ lệ được giữ ở chế độ Nhập tay. Máy chủ tính lại phí tự động, lưu tỷ lệ, chế độ và phí theo công thức cùng lịch sử. Tỷ lệ từ 0 đến 100%, tối đa 6 chữ số thập phân; nhận dấu chấm hoặc dấu phẩy.

Ghép cha–con bằng chỉ mục mã cha + phiên thay vì quét lại toàn bảng. Báo cáo tái dùng dữ liệu trong cùng một lượt gọi; không cache xuyên người dùng/công ty và xóa bộ nhớ trước các lần xác minh ghi. Các yêu cầu tải cùng công ty đang chạy được gộp; phản hồi cũ không thay dữ liệu công ty đang xem. Biểu mẫu chưa cho thêm khi danh mục đang tải. Khi tài sản thay đổi trong lúc người dùng đang mở biểu mẫu, bản lưu mới yêu cầu tải lại để tránh dùng bản chụp khác dữ liệu đã xem.

## Bổ sung kiểm soát danh mục và bảo hiểm
- Số hiệu/giấy tờ trùng trong cùng công ty bị chặn, thông báo mã tài sản đã có.
- Ngừng sử dụng/Thanh lý chỉ khi không còn đăng ký đang bảo đảm và không còn bảo hiểm hiện tại/tương lai chưa hủy. Giữ lịch sử; không tự kích hoạt lại khi sửa.
- Trạng thái hợp đồng chưa hủy tách khỏi tình trạng bảo hiểm theo thời hạn.
- Chọn tài sản hiển thị mã đăng ký và hợp đồng vay đang liên kết.
- Phí nhập tay có phí tham chiếu theo tỷ lệ, chênh lệch và lý do lưu trong lịch sử.
- Danh sách phân trang 25 dòng; trả về hợp đồng của tab đang xem. Tab thế chấp không đọc bảo hiểm. Đây là phân trang giao diện, chưa phải phân trang Sheets phía máy chủ.
