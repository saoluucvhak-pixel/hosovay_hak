# Báo cáo kiểm toán P0 — cache, trạng thái dữ liệu, đồng bộ (HOSOVAY_HAK)

Phạm vi: Phụ lục "ƯU TIÊN P0 – KIỂM TOÁN VÀ TÁI CẤU TRÚC CACHE, DATA STATE, DATA SYNC" (mục I–VII; nội dung bị cắt ở mục VIII).
Trạng thái: **ĐÃ KIỂM TOÁN, CHƯA TÁI CẤU TRÚC.** Chỉ có báo cáo này và một bộ test mới (`kiem_thu/chay_dong_goi.js`). Chưa chạy trên Google Apps Script thật.
Nhánh: `claude/friendly-faraday-g049cv` (không đụng `main`).

## 1. Bản đồ dữ liệu hiện tại

```
Google Sheets (nguồn thẩm quyền)
  └─ getSS_() [Code.gs, _ssDaMo_: nhớ Spreadsheet trong 1 lượt thực thi]
       └─ sheetToObjects_() / layGiaTriThatCuaSheet_() [DataService.gs]  (đọc cả tab, bỏ dòng lỗi âm thầm)
            └─ docCoThuLai_()  (đọc lại 3 lần nếu mảng rỗng, ngủ 0,5 + 0,9 + 1,3 giây)
                 └─ chuanHoaTruocKhiTra_() (Date → chuỗi)
                      └─ google.script.run  (5 lượt gọi LỒNG NHAU khi mở trang)
                           └─ JavaScript.html: DS_CONG_TY, DS_HOP_DONG, DS_HOP_DONG_ALL, DS_KHACH_HANG, DS_HO_SO_GOC, DS_HO_SO
                                (83 chỗ tham chiếu; nhiều nơi tự ghi)
Bộ nhớ đệm phía máy chủ: duy nhất CacheService cho danh mục MẪU (TemplateRegistry.gs, TTL 30 phút, xoá khi đổi mẫu).
Không có: version/revision dữ liệu, request ID, schema kiểm tra response, localStorage/sessionStorage cho dữ liệu nghiệp vụ.
```

## 2. Phát hiện

| # | Mức | Vị trí | Vấn đề | Tác động |
|---|---|---|---|---|
| F1 | P0 | `DataService.gs` `docCoThuLai_` | Coi "mảng rỗng" là dấu hiệu lỗi và thử lại bằng `Utilities.sleep` (tối đa 2,7 giây). Không phân biệt "rỗng hợp lệ" với "đọc hỏng". | Danh sách thật sự rỗng (khách hàng mới) luôn chậm thêm 2,7 giây; lỗi đọc thật bị che. Đúng kiểu "thêm retry" mà phụ lục cấm. |
| F2 | P0 | `sheetToObjects_` | `try/catch` quanh từng dòng bỏ qua dòng lỗi **không ghi nhận**; dòng có `row.join('')===''` cũng bỏ. Tab thiếu tiêu đề → trả `[]` thay vì lỗi cấu trúc. | Dữ liệu "biến mất" khỏi giao diện mà không ai biết dòng nào, tại sao. |
| F3 | P0 | `JavaScript.html` `taiDuLieuBanDau` | 5 lượt `google.script.run` lồng nhau (ngày, công ty, hợp đồng, khách hàng, hồ sơ). Lỗi ở lượt nào thì các lượt sau không chạy; mỗi lượt có độ trễ riêng; không có tính nhất quán chụp (snapshot) giữa các lượt. | Màn hình có thể thấy công ty mới nhưng hồ sơ cũ (hai lượt đọc ở hai thời điểm). |
| F4 | P0 | `JavaScript.html` `tuChuaHopDongNeuRong_` | Nếu hợp đồng rỗng thì `setTimeout` 1,5 giây rồi tải lại và tự vá `DS_HOP_DONG`/`DS_HOP_DONG_ALL`. | Che triệu chứng, hai biến cùng giữ một dữ liệu. |
| F5 | P0 | `JavaScript.html` (83 tham chiếu) | Sáu mảng toàn cục độc lập là "nguồn dữ liệu"; `DS_HOP_DONG` và `DS_HOP_DONG_ALL` trùng nhau; nhiều hàm tự gán lại. | Màn hình này cập nhật, màn hình kia chưa. |
| F6 | P1 | Mọi `luu*` | Không có `revision`/`expectedRevision`. `LockService` chỉ bảo vệ trong lúc ghi; hai người sửa cùng hồ sơ thì người lưu sau ghi đè người trước. | Mất sửa đổi mà không cảnh báo. |
| F7 | P1 | Client | Không có request ID/sequence: response chậm của bộ lọc cũ có thể ghi đè kết quả bộ lọc mới (`locDanhSachHoSoClick`). | Danh sách nhảy về kết quả cũ. |
| F8 | P1 | Máy chủ | `chuanHoaTruocKhiTra_` (Date → chuỗi) chỉ gọi ở một số hàm. Chú thích trong mã ghi đây là **nguyên nhân gốc đã xác định** của "có dữ liệu trên Sheet nhưng giao diện nhận rỗng" (Date không đóng gói được qua `google.script.run`). Hàm nào quên gọi sẽ lặp lại lỗi. | Rỗng bất thường khi thêm hàm mới. |
| F9 | P1 | Response API | Trả thẳng `[]`/object/`throw`; không có `ok/data/meta/error`, không có mã lỗi `retryable`. | Client không phân biệt rỗng/lỗi/không quyền/xung đột. |
| F10 | P2 | `TemplateRegistry.gs` | Cache danh mục mẫu TTL 30 phút; sửa tay tab `DM_MauVanBan` trong Sheet không làm mới cache. | Mẫu mới/ngừng sửa tay có thể chưa có hiệu lực tới 30 phút. |
| F11 | P2 | `ATTACHMENTSERVICE.gs` | Không gọi `SpreadsheetApp.flush()` sau khi ghi. | Đọc ngay sau ghi ở lượt thực thi khác có thể chưa thấy (cần xác nhận trên Google thật). |

### Kiểm chứng đã làm (trong môi trường giả lập, KHÔNG phải Google thật)

`node kiem_thu/chay_dong_goi.js`: gọi 33 hàm đọc mà giao diện dùng, trên dữ liệu có ô ngày, rồi quét kết quả tìm Date/NaN/Infinity/hàm/BigInt/vòng lặp/`undefined` trong mảng → **0 lỗi đóng gói** (F8 hiện chưa tái hiện). Test này chỉ chứng minh giá trị trả về đóng gói được; **không** chứng minh hành vi serialization thật của Google.
Không có test nào chứng minh F1–F7 được sửa, vì chưa sửa.

## 3. Kiến trúc đề xuất (chưa làm)

1. **Một lượt tải khởi tạo**: `layDuLieuKhoiTao()` trả công ty + hợp đồng + khách hàng + hồ sơ + `meta.revision` cho từng bộ trong cùng một lần đọc (snapshot nhất quán). Bỏ 5 lượt lồng nhau.
2. **Phong bì thống nhất** `{ok, data, meta:{requestId, revision, fetchedAt, isComplete}, error:{code, message, retryable}}`; bọc ở một chỗ (`ApiResponse_`), kèm bộ làm sạch (Date → chuỗi, bỏ NaN) để F8 không tái diễn.
3. **Đọc dữ liệu có chẩn đoán**: `sheetToObjects_` trả `{rows, skipped:[{row, reason}], schemaErrors}`; thiếu tiêu đề/cột bắt buộc → lỗi cấu trúc, không trả `[]`. Bỏ `docCoThuLai_`.
4. **Revision**: thêm cột `Revision`, `UpdatedAt`, `UpdatedBy` cho hồ sơ/công ty/hợp đồng; `luu*` nhận `expectedRevision`, so trong vùng khoá, lệch thì trả `CONFLICT` kèm bản mới.
5. **`AppDataStore` ở client**: thực thể theo ID, truy vấn lưu ID + version, `requestSeq` bỏ response cũ, ma trận invalidation theo mutation; gỡ 6 mảng toàn cục và `tuChuaHopDongNeuRong_`.
6. **Cache danh mục**: khoá + version + TTL + xoá theo mutation; báo cáo chính thức luôn kiểm version nguồn.

Mỗi bước đều phải có test (đọc rỗng hợp lệ vs lỗi, đua request, xung đột revision, invalidation) trước khi đánh dấu xong.

## 4. Đối chiếu phần còn lại của prompt với những gì ĐÃ có

| Hạng mục | Tình trạng |
|---|---|
| Xuất chứng từ từ mẫu DOCX/XLSX, placeholder, kiểm tra mẫu, link tách định dạng, chống bấm đúp, lịch sử phát hành | Đã làm (PR #1) |
| Tiền VND/USD số nguyên, quy đổi BigInt, số bằng chữ | Đã làm (một phần: cần bổ sung bộ test liệt kê trong mục IV.3) |
| Lưu cha–con an toàn, phục hồi khi lỗi giữa chừng | Có phục hồi khi lỗi ghi; **chưa** có revision/ghi dở dang phát hiện sau sự cố |
| Chuyển trạng thái do backend kiểm soát, xoá mềm, chống trùng mã, `SheetRepository`, báo cáo đối chiếu, lọc dùng chung, form cha–con có tab, phân trang/sắp xếp | **Chưa làm** |
| `PortalAuthAdapter` | **Chưa làm — cần hợp đồng tích hợp HAK_HDMB** (xem mục 5) |

## 5. Cần bạn quyết định / cung cấp

1. **Phần bị cắt**: tin nhắn dừng ở mục VIII ("`tuChuaHop…`"). Mục VIII trở đi (retry, rồi các mục sau trong phụ lục) cần gửi lại.
2. **Tích hợp cổng HAK**: cần repo `HAK_HDMB` (hoặc tài liệu giao thức) để biết cổng truyền danh tính/quyền thế nào (token, tham số, khoá xác minh). Chưa có thì mình chỉ tạo khung `PortalAuthAdapter` + cấu hình, không tự đặt giao thức, không tuyên bố đã tích hợp.
3. **Thứ tự**: đề xuất P0 (mục 3 ở trên) → trạng thái hồ sơ + revision + xoá mềm → giao diện form cha–con và bộ lọc → báo cáo đối chiếu. Đây là khối lượng lớn; mình làm tuần tự, mỗi bước kèm test và báo cáo.
