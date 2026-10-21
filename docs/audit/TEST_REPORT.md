# TEST_REPORT (giả lập Apps Script + LibreOffice + Chromium; KHÔNG phải Google thật)
| Lệnh | Trước sửa (main 65b52c9) | Sau sửa |
|---|---|---|
| `npm ci` | PASS | PASS |
| `npm run check` | PASS (3 findings tồn tại từ trước) | PASS (3 findings, không thêm) |
| `npm test` | 42/42 suite PASS | 43/43 suite PASS (thêm `chay_sao_luu`) |
| `npm run test:ui` | NOT RUN trước sửa (trình duyệt cần `HAK_BROWSER_PATH`) | 189/189 PASS |
| `npm run test:full` | NOT RUN trước sửa | 63/63 stages PASS, 0 not run |
Mã mới: 7 ca sao lưu/cấu hình + 1 ca tỷ giá bất thường; ca "DataService cấu hình" **fail trên code cũ**, pass sau sửa (đã xác nhận bằng hoàn tác).
Không chạy được: kiểm thử trên Google Apps Script/Drive/Docs thật, SSO với Cổng thật, GOOGLEFINANCE thật, đồng thời nhiều người dùng thật (NOT RUN/BLOCKED).
CI: `hak-quality.yml` và `hak-full-validation.yml` chạy trên PR.
