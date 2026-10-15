#!/usr/bin/env bash
# Sinh lại 2 báo cáo "trước/sau": BAO_CAO_SO_SANH_TOC_DO.md và BAO_CAO_DOI_CHIEU_DU_LIEU.md.
# Dùng: bash kiem_thu/tao_bao_cao_truoc_sau.sh [ref_cũ]      (mặc định ref_cũ = d40bf5c = main ngay trước đợt nâng cấp phân trang)
# "Trước" = mã ở ref_cũ (checkout vào thư mục tạm bằng git worktree, KHÔNG đụng nhánh đang làm); "Sau" = mã hiện tại.
set -eu -o pipefail
cd "$(dirname "$0")/.."
REF="${1:-d40bf5c}"; TMP="$(mktemp -d)"; GOC="$TMP/goc"
git worktree add -f --detach "$GOC" "$REF" >/dev/null
trap 'git worktree remove --force "$GOC" >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
node kiem_thu/so_sanh_toc_do.js "$GOC" "$TMP/truoc.json" >/dev/null
node kiem_thu/so_sanh_toc_do.js "$PWD" "$TMP/sau.json" >/dev/null
node kiem_thu/so_sanh_toc_do.js bao-cao "$TMP/truoc.json" "$TMP/sau.json" BAO_CAO_SO_SANH_TOC_DO.md
node kiem_thu/doi_chieu_du_lieu.js chay "$GOC" "$TMP/dc_cu.json"
node kiem_thu/doi_chieu_du_lieu.js chay "$PWD" "$TMP/dc_moi.json"
node kiem_thu/doi_chieu_du_lieu.js bao-cao "$TMP/dc_cu.json" "$TMP/dc_moi.json" BAO_CAO_DOI_CHIEU_DU_LIEU.md
echo "Đã tạo BAO_CAO_SO_SANH_TOC_DO.md và BAO_CAO_DOI_CHIEU_DU_LIEU.md (ref cũ: $REF)"
