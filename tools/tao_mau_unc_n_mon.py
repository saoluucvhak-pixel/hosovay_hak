#!/usr/bin/env python3
"""Tạo mẫu UNC BIDV n món (n >= 2, mỗi món một trang = 2 liên) từ mẫu 2 món có sẵn.
Dùng: python3 tools/tao_mau_unc_n_mon.py <n> <file_ra.xlsx> [mau_2_mon.xlsx]
Mỗi sheet UNC_k dùng {{MON_k.*}}; ứng dụng nhận mẫu qua điều kiện số người = n (không cần sửa code)."""
import sys, os, shutil, zipfile, tempfile
n = int(sys.argv[1]); out = sys.argv[2]
src = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(__file__), '..', 'mau_that', 'UNC_BIDV_ANH_2_MON.xlsx')
if n < 2 or n > 20: sys.exit('n phải từ 2 đến 20')
d = tempfile.mkdtemp()
with zipfile.ZipFile(src) as z: z.extractall(d)
def rd(p):
    with open(os.path.join(d, p), encoding='utf-8-sig') as f: return f.read()
def wr(p, s):
    with open(os.path.join(d, p), 'w', encoding='utf-8') as f: f.write(s)
sheet2, draw2, rel2 = rd('xl/worksheets/sheet2.xml'), rd('xl/drawings/_rels/drawing2.xml.rels'), rd('xl/worksheets/_rels/sheet2.xml.rels')
wb, wbr, ct = rd('xl/workbook.xml'), rd('xl/_rels/workbook.xml.rels'), rd('[Content_Types].xml')
for k in range(3, n + 1):
    wr(f'xl/worksheets/sheet{k}.xml', sheet2.replace('MON_2.', f'MON_{k}.'))
    shutil.copy(os.path.join(d, 'xl/drawings/drawing2.xml'), os.path.join(d, f'xl/drawings/drawing{k}.xml'))
    a, b = 2 * k - 1, 2 * k
    shutil.copy(os.path.join(d, 'xl/media/image3.png'), os.path.join(d, f'xl/media/image{a}.png'))
    shutil.copy(os.path.join(d, 'xl/media/image4.png'), os.path.join(d, f'xl/media/image{b}.png'))
    wr(f'xl/drawings/_rels/drawing{k}.xml.rels', draw2.replace('image3.png', f'image{a}.png').replace('image4.png', f'image{b}.png'))
    wr(f'xl/worksheets/_rels/sheet{k}.xml.rels', rel2.replace('drawing2.xml', f'drawing{k}.xml'))
    rid = f'RmonSheet{k:02d}'
    wb = wb.replace('</sheets>', f'<sheet name="UNC_{k}" sheetId="{k}" r:id="{rid}" /></sheets>')
    wbr = wbr.replace('</Relationships>', f'<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet{k}.xml" Id="{rid}" /></Relationships>')
    ct = ct.replace('</Types>', f'<Override PartName="/xl/worksheets/sheet{k}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" /><Override PartName="/xl/drawings/drawing{k}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml" /></Types>')
wr('xl/workbook.xml', wb); wr('xl/_rels/workbook.xml.rels', wbr); wr('[Content_Types].xml', ct)
if os.path.exists(out): os.remove(out)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(d, '[Content_Types].xml'), '[Content_Types].xml')
    for r, _, fs in os.walk(d):
        for f in fs:
            full = os.path.join(r, f); rel = os.path.relpath(full, d)
            if rel != '[Content_Types].xml': z.write(full, rel)
print(f'Đã tạo {out}: {n} món, {2 * n} liên')
