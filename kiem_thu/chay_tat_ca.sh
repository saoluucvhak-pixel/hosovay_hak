#!/usr/bin/env bash
# Chạy toàn bộ kiểm thử ngoài Google (cần: node, python3 + python-docx + lxml, unzip, zip, LibreOffice 'soffice', pdftotext).
set -u
cd "$(dirname "$0")/.."
RA="${1:-/tmp/hosovay_kiem_thu}"; rm -rf "$RA"; mkdir -p "$RA"
python3 kiem_thu/tao_mau_thu.py >/dev/null || exit 1
echo "### 1. Logic: engine XML, quy tắc tiền, hoá đơn/bảng lương, kiểm tra phát hành"; node kiem_thu/chay_thu_logic.js | tail -1 || exit 1
echo "### 2. Engine trên 12 kịch bản DOCX (1/2/5/20 dòng, VND/USD) + kiểm tra độc lập + PDF"; node kiem_thu/chay_thu.js "$RA/engine" >/dev/null && python3 kiem_thu/kiem_tra_docx.py "$RA/engine" | tail -1 || exit 1
echo "### 3. Tích hợp luồng phát hành (dịch vụ Apps Script giả lập)"; node kiem_thu/chay_tich_hop.js "$RA/tichhop" | tail -1 || exit 1
echo "### 4. Kiểm tra độc lập DOCX/PDF do luồng tích hợp sinh ra"; python3 kiem_thu/kiem_tra_docx.py "$RA/tichhop" | tail -1 || exit 1
echo "TẤT CẢ ĐẠT. Kết quả: $RA   (giao diện: node kiem_thu/chay_giao_dien.js)"
