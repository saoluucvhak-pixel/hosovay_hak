#!/usr/bin/env python3
"""Sinh mau_that/UNC_2_KHOAN.xlsx TỪ MẪU THẬT mau_that/UNC_1_KHOAN.xlsx (không vẽ lại mẫu).

Yêu cầu nghiệp vụ: hồ sơ có 2 món → 2 ỦY NHIỆM CHI RIÊNG (mỗi món một UNC), mỗi UNC in 2 liên.
  • Trang 1 = món 1: liên 1 (nửa trên) + liên 2 (nửa dưới); trang 2 = món 2: liên 1 + liên 2.   → A4 dọc, 2 UNC/trang.
  • Khối UNC được NHÂN NGUYÊN VĂN từ mẫu thật (logo, ô tích, khung, phông, độ rộng cột); chỉ đổi placeholder:
        {{CT.X}}                    → {{MON_i.X}}                      (i = số món; engine đã hỗ trợ MON_1/MON_2)
        {{CT.SO_TIEN_QUY_DOI}}      → {{MON_i.SO_TIEN_VN}} {{MON_i.LOAI_TIEN}}   (mỗi món có loại tiền riêng USD/VND)
        {{CT.SO_TIEN_QUY_DOI_BANG_CHU}} → {{MON_i.SO_TIEN_BANG_CHU}}
        {{CONG_TY.TAI_KHOAN_VND}}   → {{MON_i.TAI_KHOAN_TRICH_NO}}     (tài khoản trích nợ theo loại tiền của món)
  • Thêm dòng nhãn "Món i — Liên j" phía trên mỗi khối; thiết lập in A4 dọc tỉ lệ 74%, ngắt trang sau món.
Cách chạy: python3 kiem_thu/tao_mau_unc_2_khoan.py [mau_that/UNC_1_KHOAN.xlsx] [ra: mau_that/UNC_2_KHOAN.xlsx]"""
import re, sys, zipfile, os

NGUON = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'mau_that', 'UNC_1_KHOAN.xlsx')
RA = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'mau_that', 'UNC_2_KHOAN.xlsx')
SO_HANG_KHOI = 22            # hàng 1–22 của mẫu thật là UNC (hàng 23–24 chỉ là ô trống gộp) → bỏ để 2 khối vừa 1 trang
KHOI = [(1, 1), (1, 2), (2, 1), (2, 2)]  # (món, liên)
COT_TOI_DA = 27             # A..AA là vùng UNC; cột AB+ là ô trợ giúp của file gốc (công thức/tùy chọn) → bỏ

def cot_so(ten):
    n = 0
    for ch in ten: n = n * 26 + ord(ch) - 64
    return n

def doi_ma(s, i):
    s = s.replace('{{CT.SO_TIEN_QUY_DOI_BANG_CHU}}', '{{MON_%d.SO_TIEN_BANG_CHU}}' % i)
    s = s.replace('{{CT.SO_TIEN_QUY_DOI}}', '{{MON_%d.SO_TIEN_VN}} {{MON_%d.LOAI_TIEN}}' % (i, i))
    s = s.replace('{{CONG_TY.TAI_KHOAN_VND}}', '{{MON_%d.TAI_KHOAN_TRICH_NO}}' % i)
    return re.sub(r'\{\{CT\.([A-Z0-9_]+)\}\}', lambda m: '{{MON_%d.%s}}' % (i, m.group(1)), s)

def main():
    z = zipfile.ZipFile(NGUON)
    parts = {n: z.read(n) for n in z.namelist()}
    sh = parts['xl/worksheets/sheet1.xml'].decode('utf8')
    a, b = sh.index('<sheetData>') + 11, sh.index('</sheetData>')
    rows = re.findall(r'<row [^>]*?(?:/>|>.*?</row>)', sh[a:b], flags=re.S)
    assert len(rows) == 24, len(rows)
    rows = rows[:SO_HANG_KHOI]
    merges = [m for m in re.findall(r'<mergeCell ref="([^"]+)"/>', sh) if int(re.search(r'(\d+)$', m.split(':')[0]).group(1)) <= SO_HANG_KHOI and int(re.search(r'(\d+)$', m.split(':')[-1]).group(1)) <= SO_HANG_KHOI]

    def dich_hang(row, off, mon):
        def sua_o(m):
            o = m.group(0); ref = re.search(r' r="([A-Z]+)(\d+)"', o)
            if cot_so(ref.group(1)) > COT_TOI_DA: return ''
            o = re.sub(r' r="([A-Z]+)(\d+)"', lambda r: ' r="%s%d"' % (r.group(1), int(r.group(2)) + off), o, count=1)
            return doi_ma(o, mon)
        row = re.sub(r'<c [^>]*?(?:/>|>.*?</c>)', sua_o, row, flags=re.S)
        row = re.sub(r'(<row [^>]*?\br=")(\d+)(")', lambda r: r.group(1) + str(int(r.group(2)) + off) + r.group(3), row, count=1)
        return re.sub(r' spans="[^"]*"', ' spans="1:27"', row)

    # mỗi khối = 1 hàng nhãn liên (đầu khối) + 22 hàng UNC của mẫu thật
    DAI = SO_HANG_KHOI + 1
    out_rows, out_merges = [], []
    for k, (mon, lien) in enumerate(KHOI):
        off = k * DAI
        out_rows.append('<row r="%d" spans="1:27" ht="14.25" customHeight="1"><c r="A%d" t="inlineStr"><is><t>%s</t></is></c></row>' % (
            off + 1, off + 1, 'Món %d — Liên %d (%s)' % (mon, lien, 'lưu tại đơn vị' if lien == 1 else 'gửi ngân hàng')))
        out_rows += [dich_hang(r, off + 1, mon) for r in rows]
        for m in merges:
            out_merges.append(re.sub(r'([A-Z]+)(\d+)', lambda r: '%s%d' % (r.group(1), int(r.group(2)) + off + 1), m))
    tong = len(KHOI) * DAI
    ngat_trang = [2 * DAI]  # ngắt sau món 1

    sheet = sh[:a] + ''.join(out_rows) + sh[b:]
    sheet = re.sub(r'<mergeCells count="\d+">.*?</mergeCells>', '<mergeCells count="%d">%s</mergeCells>' % (len(out_merges), ''.join('<mergeCell ref="%s"/>' % m for m in out_merges)), sheet, flags=re.S)
    sheet = re.sub(r'<dataValidations.*?</dataValidations>', '', sheet, flags=re.S)  # ô trợ giúp của file gốc (AD1/AD2/I7) không còn
    sheet = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:AA%d"/>' % tong, sheet)
    sheet = sheet.replace('<selection activeCell="AG8" sqref="AG8"/>', '<selection activeCell="A1" sqref="A1"/>')
    # thiết lập in: A4 dọc, tỉ lệ 74% (khối UNC của mẫu thật cao ~504pt → 2 khối vừa một trang), mỗi trang đúng 2 UNC (2 liên)
    sheet = re.sub(r'<pageMargins [^>]*/>', '<pageMargins left="0.4" right="0.4" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>'
                   '<pageSetup paperSize="9" scale="74" orientation="portrait"/>', sheet)
    sheet = sheet.replace('<drawing r:id="rId1"/>', '<rowBreaks count="%d" manualBreakCount="%d">%s</rowBreaks><drawing r:id="rId1"/>' % (
        len(ngat_trang), len(ngat_trang), ''.join('<brk id="%d" max="16383" man="1"/>' % n for n in ngat_trang)))
    parts['xl/worksheets/sheet1.xml'] = sheet.encode('utf8')

    # drawing: nhân logo + 3 ô tích cho từng khối (dời chỉ số hàng)
    d = parts['xl/drawings/drawing1.xml'].decode('utf8')
    dau = d[:d.index('<xdr:twoCellAnchor')]; cuoi = '</xdr:wsDr>'
    neo = re.findall(r'<xdr:twoCellAnchor.*?</xdr:twoCellAnchor>', d, flags=re.S)
    moi = []
    for k in range(len(KHOI)):
        off = k * DAI + 1
        for j, n in enumerate(neo):
            n = re.sub(r'<xdr:row>(\d+)</xdr:row>', lambda r: '<xdr:row>%d</xdr:row>' % (int(r.group(1)) + off), n)
            n = re.sub(r'(<xdr:cNvPr id=")(\d+)(")', lambda r: r.group(1) + str(int(r.group(2)) + 1000 * k) + r.group(3), n)
            n = re.sub(r'(<a16:creationId [^>]*?id=")\{[^}]*\}(")', lambda r: r.group(1) + '{%08X-0000-4000-8000-%012X}' % (k + 1, j + 1) + r.group(2), n)
            moi.append(n)
    parts['xl/drawings/drawing1.xml'] = (dau + ''.join(moi) + cuoi).encode('utf8')

    # bỏ calcChain (không còn công thức) và quy chiếu của nó
    parts.pop('xl/calcChain.xml', None)
    ct = parts['[Content_Types].xml'].decode('utf8'); ct = re.sub(r'<Override PartName="/xl/calcChain.xml"[^>]*/>', '', ct); parts['[Content_Types].xml'] = ct.encode('utf8')
    wr = parts['xl/_rels/workbook.xml.rels'].decode('utf8'); wr = re.sub(r'<Relationship [^>]*calcChain[^>]*/>', '', wr); parts['xl/_rels/workbook.xml.rels'] = wr.encode('utf8')
    wb = parts['xl/workbook.xml'].decode('utf8')
    wb = re.sub(r'<definedNames>.*?</definedNames>', '', wb, flags=re.S); parts['xl/workbook.xml'] = wb.encode('utf8')

    os.makedirs(os.path.dirname(os.path.abspath(RA)), exist_ok=True)
    with zipfile.ZipFile(RA, 'w', zipfile.ZIP_DEFLATED) as o:
        # [Content_Types].xml phải đứng đầu
        for n in ['[Content_Types].xml'] + [x for x in parts if x != '[Content_Types].xml']:
            o.writestr(n, parts[n])
    print('Đã tạo', os.path.abspath(RA), '(%d khối UNC × %d hàng)' % (len(KHOI), DAI))

main()
