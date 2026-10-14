# BÁO CÁO NGUYÊN NHÂN GỐC — CACHE, TRẠNG THÁI DỮ LIỆU, ĐỒNG BỘ

> Phạm vi bằng chứng: mã nguồn + kiểm thử trên **giả lập** (Node vm / Chromium với `google.script.run` giả). **Chưa** quan sát log Executions của Google thật, nên nguyên nhân "response rỗng" dưới đây là **giả thuyết có căn cứ**, không phải chẩn đoán đã chứng minh trên môi trường thật.

## 1. Nguyên nhân (theo mục VIII.1–9 của phụ lục)
| # | Hạng mục điều tra | Kết luận từ mã nguồn | Mức chắc chắn |
|---|---|---|---|
| 1 | Đọc sai file / sai sheet | `getSS_()` mở **theo `SPREADSHEET_ID` gắn cứng** (Code.gs:21), không theo file đang chứa script. Sao chép Spreadsheet mà quên đổi ID → web app đọc **file gốc**, màn hình "không thấy dữ liệu mới" (đã có công cụ `layThongTinSpreadsheetDangDung` để so). `_ssDaMo_` chỉ sống trong 1 lượt thực thi (mỗi `google.script.run` là lượt mới) → không gây dữ liệu cũ. | Có thể xảy ra; **cần bạn kiểm ID** |
| 2 | Date không đóng gói được | Trước đây chỉ chuẩn hoá Date ở **tầng 1** của đối tượng (`chuanHoaTruocKhiTra_`); Date lồng sâu hoặc `NaN/Infinity` vẫn lọt → `google.script.run` trả `null`/rỗng dù server không lỗi. Nay `anToanChoTrinhDuyet_` đệ quy và **báo** giá trị hỏng (`isComplete=false` + vị trí dòng/cột). | Giả thuyết mạnh; chưa tái hiện trên Google |
| 3 | Dữ liệu quá lớn | 150 hồ sơ + 20 khách hàng ≈ 135 KB/lượt (đo trên giả lập). Giới hạn thật của `google.script.run` không được kiểm ở đây. Cache giá trị > 90 KB bị BYPASS (không lỗi). | Chưa kiểm giới hạn thật |
| 4 | Quota / 6 phút | Mỗi lượt nạp 4 lần đọc Range (cold) / 1 lần (warm). Không có vòng lặp dài trong luồng đọc. Hồ sơ rất nhiều dòng khi phát hành vẫn bị giới hạn 6 phút (ngoài phạm vi này). | Chưa đo trên Google |
| 5 | Request cạnh tranh | Trước: 5 lượt lồng nhau + `locDanhSachHoSo` + `layToanBoHoSoGoc` có thể trả sai thứ tự và ghi đè nhau; không có số thứ tự. Nay `RequestCoordinator` bỏ response cũ theo khoá. | Đã kiểm bằng test |
| 6 | Bất đồng bộ phía client | 6 mảng toàn cục (`DS_HOP_DONG` và `DS_HOP_DONG_ALL` cùng giữ 1 dữ liệu), vá bằng `setTimeout` 1,5 s (`tuChuaHopDongNeuRong_`). Nay `AppDataStore` duy nhất. | Đã kiểm bằng test |
| 7 | `SpreadsheetApp.flush()` | Có 21 lệnh flush rải rác; các hàm ghi đều flush trước khi trả. Thiếu flush không phải nguyên nhân (đã có), nhưng **đọc lại ngay** từng được dùng để "sửa" → nay mutation chỉ báo thành công sau khi ghi + (với hồ sơ) đối chiếu đọc lại số dòng/tổng. | Đã xử lý |
| 8 | Hàm nuốt lỗi, trả mặc định | `docCoThuLai_` (retry vì rỗng), `layBaoCaoTienVay` (retry + sleep), `sheetToObjects_` bỏ dòng im lặng, `layDanhSachHopDongDayDu` từng nuốt lỗi trả `[]`, `capNhatBaoCaoDraft_` lỗi bị nuốt. Nay: lỗi cấu trúc ném ra; dòng thiếu khoá được ghi nhận; báo cáo nháp lỗi ghi `NhatKyHeThong` (`LOI_BAO_CAO_NHAP`). Còn một số `catch {}` hợp lý (dọn file tạm Drive, lấy email) — không ảnh hưởng đọc dữ liệu. | Đã xử lý |
| 9 | Retry vì rỗng | Đã gỡ hoàn toàn (kiểm bằng quét mã: TC-RETRY). Chỉ còn 2 `setTimeout` giao diện không liên quan dữ liệu. | Đã kiểm |

## 2. Sơ đồ luồng dữ liệu
**CŨ**
```
Sheet ─► sheetToObjects_ ─► docCoThuLai_(sleep 0,5+0,9+1,3 s nếu rỗng) ─► chuanHoa (Date tầng 1) ─┐
 5 lượt google.script.run lồng nhau ────────────────────────────────────────────────────────────┤
 DS_CONG_TY / DS_HOP_DONG / DS_HOP_DONG_ALL / DS_HO_SO / DS_HO_SO_GOC / DS_KHACH_HANG (6 mảng) ◄─┘
 sau lưu: cập nhật mảng bằng payload (optimistic) + setTimeout vá nếu rỗng ; mỗi nơi tự gọi lại server
```
**MỚI**
```
Sheet (nguồn thẩm quyền) ─► docBangChanDoan_ (lỗi cấu trúc/ dòng thiếu khoá có chẩn đoán)
   └► docMien_ ─► CacheManager (chỉ danh mục; khoá HOSOVAY:V2:{phạm vi}:{miền}:{revision}, TTL 300 s, BYPASS khi quá lớn/dữ liệu hỏng)
        └► phongBi_ {ok,data,meta{requestId,revision,fetchedAt,source,isComplete,phienBanDoc,cache},error{code,retryable}}
             └► api() (phiên + vai trò) ─► RequestCoordinator (seq theo khoá, bỏ response cũ)
                  └► AppDataStore (entities theo ID + versions + queries + requestState + subscribers)
                       └► subscribers ─► veLaiTheoMien_ (dropdown, bảng, tổng quan, badge)
Mutation ─► khoá ghi + expectedRevision ─► ghi ─► tangRevision_(miền) ─► MA_TRAN_VO_HIEU_ ─► nạp lại ĐÚNG miền ─► subscribers
```

## 3. Cơ chế đã xoá / thay
`docCoThuLai_` (xoá) · `tuChuaHopDongNeuRong_` (xoá) · retry+sleep ở `layBaoCaoTienVay` (xoá) · 5 lượt nạp lồng (→ 1 lượt) · `DS_*` (→ `AppDataStore`) · cập nhật lạc quan bằng payload sau lưu công ty/hợp đồng/khách hàng (→ nạp lại từ máy chủ) · `chuanHoaTruocKhiTra_` tầng 1 (→ đệ quy, nay chỉ là vỏ gọi `anToanChoTrinhDuyet_`).

## 4. Ánh xạ 20 test của phụ lục → bằng chứng thực thi
(Chạy bằng `kiem_thu/chay_tat_ca.sh`; chi tiết từng ca: `BAO_CAO_KIEM_THU_DONG_BO.md` — dữ liệu vào / kỳ vọng / thực tế / PASS)
| Phụ lục | Nội dung | Test |
|---|---|---|
| TC01 | Mở lần đầu có dữ liệu | chay_dong_bo TC3–TC6, TC16; chay_hoi_quy |
| TC02 | Sheet rỗng thật | chay_dong_bo TC2 (sleep=0); UI TC2-UI (1 lượt nạp, hiển thị 0) |
| TC03 | Lưu khách hàng | TC5; UI: luuKhachHang xử lý riêng, không nạp lại 2 lần |
| TC04 | Sửa hợp đồng → danh sách hồ sơ | TC4 |
| TC05 | Lưu hồ sơ → bảng + tổng quan | TC6; UI [TC12] ma trận vô hiệu hoá |
| TC06 | Hai người cùng sửa | TC11; chay_trang_thai |
| TC07 | Response cũ về sau | UI [TC12] đảo thứ tự |
| TC08 | Chuyển tab liên tục | UI [TC14] chuyển tab nhanh (1 lượt hỏi phiên bản) |
| TC09 | Bộ lọc đổi nhanh | UI [TC13] |
| TC10 | Cache hết hạn | TC15 |
| TC11 | Server lỗi không xoá dữ liệu | UI [TC17-UI], [TC11] schema; TC17, TC-META |
| TC12 | Đánh dấu giải ngân → các view | TC8-10 (+ UI ma trận) |
| TC13 | Hủy giải ngân, báo cáo không cộng sai | TC13 |
| TC14 | Mất mạng sau mutation | UI [TC14] ×2 (hỏi `kiemTraKetQuaLuu`, không tự gửi lại); TC18; TC14b |
| TC15 | Hai phiên trình duyệt | UI [TC19] (phát hiện phiên khác, nạp lại đúng miền) — **mô phỏng** |
| TC16 | Tải lại khớp Sheets | TC16 |
| TC17 | Date không hợp lệ | TC17c (isComplete=false + vị trí; không cache) |
| TC18 | Cache miss/eviction | TC15, TC16 (JSON hỏng, quá lớn) |
| TC19 | Đổi công ty / hết phiên không rò rỉ | TC19 (khoá cache theo phạm vi); UI [TC19] xoá store khi hết phiên |
| TC20 | Xuất chứng từ lúc hồ sơ đổi | TC20 (chặn chuyển trạng thái; hash dữ liệu chặn giải ngân nếu chứng từ cũ) |

## 5. Quyết định thiết kế cần biết
- **Ngày/số hỏng**: phản hồi vẫn `ok:true` nhưng `isComplete:false` + cảnh báo đỏ trên giao diện (không chặn cả ứng dụng vì một ô hỏng; cũng không im lặng). Nếu bạn muốn nghiêm hơn (lỗi cứng), đổi ở `phongBi_`.
- **Mutation trả dữ liệu chuẩn**: hàm ghi trả mã/phiên bản; dữ liệu chuẩn được nạp lại ngay từ máy chủ theo ma trận (không dùng payload đầu vào).
- **Báo cáo**: báo cáo web đọc trực tiếp từ Sheet (không cache) và hiển thị thời điểm; sheet `BaoCaoTienVay_Draft` là bản **nháp** (lỗi cập nhật được ghi nhật ký). Chưa có "báo cáo chính thức" có xác minh phiên bản nguồn — đối soát (`DoiSoat.gs`) là công cụ kiểm.
- **Chẩn đoán** (Cài đặt → Đồng bộ dữ liệu, chỉ Quản trị khi bật chế độ Cổng): phiên bản, số bản ghi, cache, thời gian, request lỗi/bị bỏ, kiểm nhất quán, xuất JSON đã loại dữ liệu nhạy cảm. **Không có nút xoá cache toàn cục.**

## 6. Phụ thuộc giới hạn Google Apps Script / Sheets (chưa kiểm trên môi trường thật)
CacheService 100 KB/giá trị, TTL ≤ 6 giờ, có thể bị đẩy ra bất kỳ lúc nào · LockService một khoá cho toàn script (tuần tự hoá mọi ghi) · 6 phút/lượt thực thi · quota đọc/ghi Sheets · kích thước phản hồi `google.script.run` · `Session.getActiveUser()` chỉ có email với chủ/cùng domain · Sheets không có giao dịch ACID (đã bù bằng journal ghi dở dang).

## 7. Hướng dẫn migration không mất dữ liệu
Xem `TAI_LIEU_BAN_GIAO.md` mục 4 và `TAI_LIEU_DONG_BO_DU_LIEU.md` mục 4–5: chỉ **thêm** cột/tab/khoá; thử trên bản sao; đối soát trước khi dùng bản chính; rollback bằng deployment cũ.

## 8. Benchmark trước/sau
Xem `TAI_LIEU_DONG_BO_DU_LIEU.md` mục 3 (`kiem_thu/do_hieu_suat_dong_bo.js`): Sheets rỗng 10 800 ms `sleep` + 5 lượt gọi + 16 lần đọc → 0 ms `sleep` + 1 lượt gọi + 4 lần đọc (lần 2: 1). Chỉ số đếm trên giả lập.
