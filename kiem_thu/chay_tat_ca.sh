#!/usr/bin/env bash
# Chạy TOÀN BỘ kiểm thử ngoài Google. Cần: node, python3 + python-docx + openpyxl + lxml, unzip, zip, LibreOffice (soffice), pdftotext;
# riêng giao diện cần thêm Playwright + Chromium (có thì chạy, không có thì bỏ qua và báo rõ).
set -u
cd "$(dirname "$0")/.."
RA="${1:-/tmp/hosovay_kiem_thu}"; rm -rf "$RA"; mkdir -p "$RA"
GOC_UPLOAD="${MAU_GOC:-}"   # (tuỳ chọn) thư mục chứa 4 file biểu mẫu gốc để sinh lại mau_that/ ; mặc định dùng mau_that/ đã commit
[ -n "$GOC_UPLOAD" ] && python3 kiem_thu/chuan_bi_mau_that.py "$GOC_UPLOAD" >/dev/null
python3 kiem_thu/tao_mau_thu.py >/dev/null || exit 1
b() { echo; echo "### $1"; }
b "1. Logic: engine XML, quy tắc tiền, hoá đơn/bảng lương, kiểm tra phát hành";           node kiem_thu/chay_thu_logic.js | tail -1 || exit 1
b "2. Engine DOCX trên mẫu thử (1/2/5/20 dòng, VND/USD) + kiểm tra độc lập + PDF";        node kiem_thu/chay_thu.js "$RA/engine" >/dev/null && python3 kiem_thu/kiem_tra_docx.py "$RA/engine" | tail -1 || exit 1
b "3. Engine trên 5 MẪU THẬT (Word + Excel, 1/2/5/20 dòng) + kiểm tra độc lập + PDF";    node kiem_thu/chay_thu_mau_that.js "$RA/mau_that" >/dev/null && python3 kiem_thu/kiem_tra_mau_that.py "$RA/mau_that" | tail -1 || exit 1
b "4. Tích hợp luồng phát hành trên mẫu thử (dịch vụ Apps Script giả lập)";              node kiem_thu/chay_tich_hop.js "$RA/tichhop" | tail -1 || exit 1
b "5. Kiểm tra độc lập file do luồng (4) sinh ra";                                        python3 kiem_thu/kiem_tra_docx.py "$RA/tichhop" | tail -1 || exit 1
b "6. Tích hợp luồng phát hành trên MẪU THẬT (đăng ký, chọn mẫu, Word+Excel, chế độ B…)"; node kiem_thu/chay_tich_hop_mau_that.js "$RA/ih_mau_that" | tail -1 || exit 1
b "7. Kiểm tra độc lập file do luồng (6) sinh ra";                                        python3 kiem_thu/kiem_tra_mau_that.py "$RA/ih_mau_that" | tail -1 || exit 1
b "8. Hồi quy chức năng cũ (hồ sơ, hợp đồng, khách hàng, hoá đơn, báo cáo, khoá, xoá)";   node kiem_thu/chay_hoi_quy.js "$RA/hoi_quy" | tail -1 || exit 1
b "9. Giao diện (Chromium + Playwright, google.script.run giả lập)"
if node -e "require('playwright')" 2>/dev/null; then node kiem_thu/chay_giao_dien.js "$RA/ui" | tail -1 || exit 1; else echo "BỎ QUA: chưa cài Playwright"; fi
echo; echo "TẤT CẢ ĐẠT. Kết quả: $RA"
