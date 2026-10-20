# Bộ công cụ kiểm chứng HAK

## Kiểm tra nhanh
Yêu cầu Node.js 20 hoặc 22. Không cần npm install cho bộ kiểm tra nhanh.

```sh
npm run check
npm test
```

Kiểm tra cú pháp, vòng phụ thuộc và 16 nhóm hồi quy, gồm USD có số lẻ, dữ liệu cha–con, mẫu 1/2/nhiều món, quyền, đồng bộ/cache và phân trang. Dịch vụ Google được giả lập. TC30/PDF không nằm trong lệnh kiểm tra nhanh.

## Kiểm tra đầy đủ
GitHub Actions chạy trên push main, nhánh tích hợp và pull request vào main. Có thể chạy thủ công workflow HAK full document and workflow validation. Workflow tự cài Python, LibreOffice, Poppler và Chromium rồi chạy npm run check và npm run test:full.

Tại máy đã cài đủ các phụ thuộc như workflow:

```sh
npm run test:full
```

Bộ đầy đủ kiểm tra trình duyệt, DOCX/XLSX thật và PDF được LibreOffice tạo; dịch vụ Google vẫn giả lập. Không dùng dữ liệu vận hành làm fixture.

## Đọc kết quả
- reports/quality-report.json và reports/dashboard.html: kiểm tra mã.
- kiem_thu/ket_qua_hak/summary.json và *.log: kiểm tra nhanh.
- kiem_thu/ket_qua_full/full-summary.json: kết quả từng giai đoạn đầy đủ.
- GitHub Actions → Artifacts: tải bằng chứng của lần chạy.

Các thư mục kết quả được .gitignore bỏ qua. File dài là cảnh báo bảo trì; lỗi cú pháp, debugger và chu trình phụ thuộc làm check thất bại. Các khẳng định thất bại làm test thất bại. Kết quả CI không thay thế kiểm thử quyền Google/Drive/Sheets thực tế.
