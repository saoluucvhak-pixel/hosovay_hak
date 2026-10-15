#!/usr/bin/env python3
"""Sinh BỘ MẪU CHUẨN (khổ A4 DỌC, canh lề gọn) vào thư mục mau_chuan/:
  HDMB_USD.docx      Hợp đồng mua bán ngoại tệ giao ngay — đúng nội dung biểu mẫu công ty (mau_that/HDMB_USD.docx), chỉ sửa trình bày
  BANG_KE_VND.xlsx   Bảng kê chuyển tiền vay (VND)  — in DỌC, 1 trang ngang, tiền dạng chữ 1.234.567 (cố định dấu chấm)
  BANG_KE_USD.xlsx   Bảng kê chuyển tiền vay (USD)  — thêm cột quy đổi VND
Chạy: python3 kiem_thu/tao_mau_chuan.py   (cần python-docx, openpyxl)."""
import os, sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.worksheet.properties import PageSetupProperties

RA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mau_chuan')
os.makedirs(RA, exist_ok=True)

# ====================================================================== HDMB (Word)
FONT = 'Times New Roman'
def dat_font(run, size=13, bold=False, italic=False, mau=None, ten=FONT):
    run.font.name = ten; run.font.size = Pt(size); run.font.bold = bold; run.font.italic = italic
    rpr = run._element.get_or_add_rPr(); rf = rpr.find(qn('w:rFonts'))
    if rf is None: rf = OxmlElement('w:rFonts'); rpr.append(rf)
    for a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'): rf.set(qn(a), ten)
    if mau: run.font.color.rgb = RGBColor.from_string(mau)

def doan(cha, van_ban='', size=13, bold=False, italic=False, can='left', truoc=0, sau=3, thut=None, giu=False):
    p = cha.add_paragraph()
    pf = p.paragraph_format; pf.space_before = Pt(truoc); pf.space_after = Pt(sau); pf.line_spacing = 1.07
    if thut is not None: pf.left_indent = Cm(thut)
    pf.keep_together = True; pf.keep_with_next = giu
    p.alignment = {'left': WD_ALIGN_PARAGRAPH.LEFT, 'center': WD_ALIGN_PARAGRAPH.CENTER, 'right': WD_ALIGN_PARAGRAPH.RIGHT, 'both': WD_ALIGN_PARAGRAPH.JUSTIFY}[can]
    if van_ban: dat_font(p.add_run(van_ban), size, bold, italic)
    return p

def chay(p, van_ban, size=13, bold=False, italic=False, ten=FONT):
    r = p.add_run(van_ban); dat_font(r, size, bold, italic, ten=ten); return r

def vien_bang(bang, mau='000000', sz=6):
    tbl = bang._tbl; pr = tbl.tblPr
    b = OxmlElement('w:tblBorders')
    for e in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        x = OxmlElement('w:' + e); x.set(qn('w:val'), 'single'); x.set(qn('w:sz'), str(sz)); x.set(qn('w:space'), '0'); x.set(qn('w:color'), mau); b.append(x)
    pr.append(b)

def le_o(bang, trai=0.18, tren=0.1):
    pr = bang._tbl.tblPr; m = OxmlElement('w:tblCellMar')
    for e, v in (('top', tren), ('left', trai), ('bottom', tren), ('right', trai)):
        x = OxmlElement('w:' + e); x.set(qn('w:w'), str(int(v * 567))); x.set(qn('w:type'), 'dxa'); m.append(x)
    pr.append(m)

def co_dinh_cot(bang, rong_cm):
    bang.autofit = False
    tw = OxmlElement('w:tblLayout'); tw.set(qn('w:type'), 'fixed'); bang._tbl.tblPr.append(tw)
    for i, w in enumerate(rong_cm):
        for c in bang.columns[i].cells: c.width = Cm(w)
    grid = bang._tbl.tblGrid
    for i, gc in enumerate(grid.findall(qn('w:gridCol'))): gc.set(qn('w:w'), str(int(rong_cm[i] * 567)))

def khong_cat_hang(bang):
    for r in bang.rows:
        trPr = r._tr.get_or_add_trPr(); x = OxmlElement('w:cantSplit'); trPr.append(x)

def o(cell, dong, size=13):
    """dong: list of [(text, bold, italic)] hoặc str. Xoá đoạn rỗng mặc định rồi ghi từng dòng (canh TRÁI để không bị giãn chữ)."""
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
    first = True
    for d in dong:
        p = cell.paragraphs[0] if first else cell.add_paragraph(); first = False
        pf = p.paragraph_format; pf.space_before = Pt(0); pf.space_after = Pt(3); pf.line_spacing = 1.0; pf.keep_together = True
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for seg in ([(d, False, False)] if isinstance(d, str) else d):
            t, b, i = (seg + (False, False))[:3] if isinstance(seg, tuple) else (seg, False, False)
            ten = 'MS Gothic' if t in ('☐', '☒') else FONT
            chay(p, t, size, b, i, ten)

def khong_vien(bang):
    """Bảng chỉ để canh cột — KHÔNG kẻ khung."""
    pr = bang._tbl.tblPr; b = OxmlElement('w:tblBorders')
    for e in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        x = OxmlElement('w:' + e); x.set(qn('w:val'), 'nil'); b.append(x)
    pr.append(b)

def tieu_muc(d, van_ban, truoc=7):
    p = doan(d, '', truoc=truoc, sau=3, giu=True)
    chay(p, van_ban, SZ, True)
    return p

SZ = 11
def muc_dau(d, nhan, van_ban, thut=0.0, giu=False, sau=2):
    """Mục có ô tick / gạch đầu dòng: ký hiệu treo ở lề, chữ canh trái (không giãn chữ)."""
    p = doan(d, '', can='left', sau=sau, giu=giu)
    pf = p.paragraph_format; pf.left_indent = Cm(thut + 0.7); pf.first_line_indent = Cm(-0.7)
    pf.tab_stops.add_tab_stop(Cm(thut + 0.7))
    chay(p, nhan, SZ, ten='MS Gothic' if nhan in ('☐', '☒') else FONT); chay(p, '\t' + van_ban, SZ)
    return p

def hdmb():
    d = Document()
    s = d.sections[0]
    s.page_width, s.page_height = Cm(21.0), Cm(29.7)
    s.left_margin, s.right_margin, s.top_margin, s.bottom_margin = Cm(2.2), Cm(1.8), Cm(1.1), Cm(1.0)
    st = d.styles['Normal']; st.font.name = FONT; st.font.size = Pt(SZ)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    # đầu văn bản
    doan(d, 'HỢP ĐỒNG MUA BÁN NGOẠI TỆ GIAO NGAY', 15, True, can='center', sau=2)
    doan(d, '(Áp dụng giữa BIDV và Khách hàng đã ký Hợp đồng khung A01)', SZ, False, True, can='center', sau=2)
    doan(d, 'Số: 01…..2026/BIDV-HAK', SZ, False, False, can='center', sau=2)
    doan(d, 'Đà Nẵng, {{NGAY.GIAI_NGAN_DAY_DU}}', SZ, False, True, can='center', sau=8)
    p = doan(d, '', can='both', sau=6)
    chay(p, 'Căn cứ Hợp đồng khung số {{HOP_DONG.HD_KHUNG_MBNT_SO}} ngày {{HOP_DONG.HD_KHUNG_MBNT_NGAY}} giữa {{HOP_DONG.TEN_NGAN_HANG}} – {{HOP_DONG.CHI_NHANH}} và {{CONG_TY.TEN}}.', SZ, False, True)

    W = 17.0  # cm khả dụng
    # Bên A / Bên B (2 cột canh lề, không kẻ khung)
    t = d.add_table(rows=1, cols=3); t.alignment = WD_TABLE_ALIGNMENT.CENTER; khong_vien(t); le_o(t, 0.0, 0.04); co_dinh_cot(t, [8.3, 0.5, W - 8.8]); khong_cat_hang(t)
    o(t.cell(0, 0), [[('BÊN A: NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM', True)], '{{HOP_DONG.CHI_NHANH}}', 'Địa chỉ: {{HOP_DONG.DIA_CHI_CHI_NHANH}}', 'Người đại diện: {{HOP_DONG.NGUOI_DAI_DIEN_NH}}',
                      'Chức vụ/Số CMT: {{HOP_DONG.CHUC_VU_NH}}', 'Giấy ủy quyền số: {{HOP_DONG.GIAY_UY_QUYEN_NH}}', 'Điện thoại: {{HOP_DONG.DIEN_THOAI_NH}}'], SZ)
    o(t.cell(0, 2), [[('BÊN B: {{CONG_TY.TEN}} (Khách hàng)', True)], 'Địa chỉ: {{CONG_TY.DIA_CHI}}', 'Người đại diện: {{CONG_TY.NGUOI_DAI_DIEN}}', 'Chức vụ/Số CMT: {{CONG_TY.CHUC_VU}}', 'Điện thoại: {{CONG_TY.DIEN_THOAI}}'], SZ)
    # Thông tin giao dịch
    tieu_muc(d, 'THÔNG TIN GIAO DỊCH:')
    t = d.add_table(rows=1, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER; khong_vien(t); le_o(t, 0.0, 0.04); co_dinh_cot(t, [12.2, W - 12.2]); khong_cat_hang(t)
    o(t.cell(0, 0), ['Chiều giao dịch của Khách hàng:', [('☐', ), (' Mua            ',), ('☒', ), (' Bán',)], 'Số tiền giao dịch: {{HO_SO.SO_TIEN_VN}} USD', 'Tỷ giá: {{HO_SO.TY_GIA}} USD/VND',
                      'Số tiền thanh toán: {{HO_SO.SO_TIEN_QUY_DOI_VN}} VND', 'Bằng chữ: {{HO_SO.SO_TIEN_QUY_DOI_BANG_CHU}}.', 'Ngày giao dịch: {{HO_SO.NGAY_GIAI_NGAN}}', 'Mục đích sử dụng ngoại tệ: {{HO_SO.MUC_DICH}}'], SZ)
    o(t.cell(0, 1), ['Loại tiền giao dịch: USD', 'Loại tiền thanh toán: VND', 'Ngày thanh toán: {{HO_SO.NGAY_GIAI_NGAN}}'], SZ)
    # Chỉ dẫn thanh toán (toàn bề ngang: ít xuống dòng, dễ đọc)
    tieu_muc(d, 'CHỈ DẪN THANH TOÁN:')
    doan(d, '- Chỉ dẫn thanh toán đồng USD (khách hàng bán):', SZ, sau=2, giu=True)
    muc_dau(d, '☐', 'Bên B ủy quyền vô điều kiện không hủy ngang cho bên A tự động trích nợ USD từ tài khoản tiền gửi thanh toán số {{CONG_TY.TAI_KHOAN_USD}} của bên B mở tại Bên A/BIDV chi nhánh Quảng Nam.', 0.3, True)
    muc_dau(d, '☐', 'Bên A trích nợ tự động từ tài khoản tiền vay (số …………………………) của bên B (Nếu KH thanh toán bằng vốn vay).', 0.3, True, sau=4)
    doan(d, '- Chỉ dẫn thanh toán đồng VND (khách hàng mua):', SZ, sau=2, giu=True)
    muc_dau(d, '☐', 'Bên A chuyển tiền VND vào TK số {{CONG_TY.TAI_KHOAN_VND}} của bên B tại Bên A/BIDV chi nhánh Quảng Nam', 0.3, True)
    muc_dau(d, '☐', 'Bên A chuyển tiền để thanh toán theo bảng kê tại Hợp đồng tín dụng cụ thể số {{HO_SO.SO_GIAY_NHAN_NO}} ngày {{HO_SO.NGAY_GIAI_NGAN}}.', 0.3, False)
    # Hiệu lực
    tieu_muc(d, 'HIỆU LỰC CỦA HỢP ĐỒNG')
    ds = ['Hợp đồng này là một phần không thể tách rời của Hợp đồng khung số {{HOP_DONG.HD_KHUNG_MBNT_SO}} ngày {{HOP_DONG.HD_KHUNG_MBNT_NGAY}} giữa {{HOP_DONG.TEN_NGAN_HANG}} – {{HOP_DONG.CHI_NHANH}} và {{CONG_TY.TEN}}.',
          'Hợp đồng này có hiệu lực kể từ ngày ký. Mọi điều chỉnh, bổ sung Hợp đồng này chỉ có hiệu lực khi được lập thành văn bản với chữ ký, xác nhận của hai bên và là bộ phận không thể tách rời của Hợp đồng này.',
          'Hợp đồng này được lập thành 02 bản bằng tiếng Việt, có giá trị pháp lý ngang nhau, mỗi Bên giữ 01 bản.']
    for i, tx in enumerate(ds, 1):
        p = doan(d, '', can='both', sau=2, giu=True)
        chay(p, f'{i}. ' + tx, SZ)
    doan(d, '', sau=0, giu=True).paragraph_format.line_spacing = 0.6
    # Chữ ký: luôn đi cùng khối "Hiệu lực" (giu=keep_with_next) -> không bao giờ có trang chỉ toàn chữ ký trống
    t = d.add_table(rows=1, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER; khong_vien(t); co_dinh_cot(t, [W / 2, W / 2]); khong_cat_hang(t)
    for ci, tieude in enumerate(['NGÂN HÀNG', 'KHÁCH HÀNG']):
        c = t.cell(0, ci); first = True
        for tx, b, it in ([(tieude, True, False), ('(Ký, đóng dấu)', False, True)] + [('', False, False)] * 2 + ([('Kế toán trưởng', True, False)] if ci == 1 else [])):
            p = c.paragraphs[0] if first else c.add_paragraph(); first = False
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(2); p.paragraph_format.keep_with_next = True
            if tx: chay(p, tx, SZ, b, it)
    d.core_properties.title = 'Hợp đồng mua bán ngoại tệ giao ngay'
    d.save(os.path.join(RA, 'HDMB_USD.docx'))

# ====================================================================== BẢNG KÊ (Excel, in dọc)
def bang_ke(ten_file, usd):
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'HAK'
    F = 'Times New Roman'
    mong = Side(style='thin', color='000000'); khung = Border(left=mong, right=mong, top=mong, bottom=mong)
    cols = (['Stt', 'Tên đơn vị thụ hưởng', 'Số tài khoản của đơn vị thụ hưởng', 'Ngân hàng của đơn vị thụ hưởng', 'Số tiền (USD)', 'Quy đổi (VND)', 'Nội dung'] if usd
            else ['Stt', 'Tên đơn vị thụ hưởng', 'Số tài khoản của đơn vị thụ hưởng', 'Ngân hàng của đơn vị thụ hưởng', 'Số tiền (VND)', 'Nội dung'])
    rong = [6, 52, 22, 27, 15, 20, 36] if usd else [6, 60, 24, 30, 22, 38]
    n = len(cols); L = openpyxl.utils.get_column_letter
    for i, w in enumerate(rong): ws.column_dimensions[L(i + 1)].width = w
    ws.sheet_view.showGridLines = False
    def gop(r, ten, can='left', size=12, b=False, i=False, h=None, wrap=False):
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=n)
        c = ws.cell(r, 1); c.value = ten; c.font = Font(name=F, size=size, bold=b, italic=i); c.alignment = Alignment(horizontal=can, vertical='center', wrap_text=wrap)
        if h: ws.row_dimensions[r].height = h
    gop(1, 'Tên đơn vị: {{CONG_TY.TEN}}', size=12, b=True, h=18)
    gop(2, 'Địa chỉ: {{CONG_TY.DIA_CHI}}', size=12, h=18)
    gop(3, 'MST: {{CONG_TY.MA_SO_THUE}}', size=12, h=18)
    ws.row_dimensions[4].height = 6
    gop(5, 'BẢNG KÊ CHUYỂN TIỀN VAY NGÀY: {{HO_SO.NGAY_GIAI_NGAN}}', can='center', size=15, b=True, h=28)
    r = 6
    if usd:
        gop(6, 'Tỷ giá: {{HO_SO.TY_GIA}} USD/VND', can='center', size=12, i=True, h=18); r = 7
    ws.row_dimensions[r].height = 8; r += 1
    hdr = r
    xanh = PatternFill('solid', fgColor='E7E6E6')
    for i, tx in enumerate(cols, 1):
        c = ws.cell(hdr, i); c.value = tx; c.font = Font(name=F, size=11, bold=True); c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = khung; c.fill = xanh
    ws.row_dimensions[hdr].height = 36
    dr = hdr + 1
    mau = (['{{CT.STT}}', '{{CT.TEN_NGUOI_HUONG}}', '{{CT.SO_TAI_KHOAN}}', '{{CT.NGAN_HANG}}', '{{CT.SO_TIEN_VN}}', '{{CT.SO_TIEN_QUY_DOI_VN}}', '{{CT.NOI_DUNG}}'] if usd
           else ['{{CT.STT}}', '{{CT.TEN_NGUOI_HUONG}}', '{{CT.SO_TAI_KHOAN}}', '{{CT.NGAN_HANG}}', '{{CT.SO_TIEN_QUY_DOI_VN}}', '{{CT.NOI_DUNG}}'])
    so_cot_tien = [5, 6] if usd else [5]
    for i, tx in enumerate(mau, 1):
        c = ws.cell(dr, i); c.value = tx; c.font = Font(name=F, size=10 if i == n else 11); c.border = khung
        c.alignment = Alignment(horizontal='center' if i == 1 else ('right' if i in so_cot_tien else 'left'), vertical='center', wrap_text=True, indent=0 if i == 1 else 1)
    ws.row_dimensions[dr].height = 34
    tr = dr + 1
    ws.merge_cells(start_row=tr, start_column=1, end_row=tr, end_column=4)
    for i in range(1, n + 1):
        c = ws.cell(tr, i); c.border = khung; c.fill = PatternFill('solid', fgColor='F2F2F2'); c.font = Font(name=F, size=11, bold=True)
        c.alignment = Alignment(horizontal='left', vertical='center', indent=1)
    ws.cell(tr, 1).value = 'Tổng cộng'
    ws.cell(tr, 5).value = '{{BANG_KE.TONG_TIEN_VN}}' if usd else '{{BANG_KE.TONG_TIEN_QUY_DOI_VN}}'
    if usd: ws.cell(tr, 6).value = '{{BANG_KE.TONG_TIEN_QUY_DOI_VN}}'
    for i in so_cot_tien: ws.cell(tr, i).alignment = Alignment(horizontal='right', vertical='center', indent=1)
    ws.row_dimensions[tr].height = 26
    br = tr + 1
    ws.row_dimensions[br].height = 8
    k = br + 1
    if usd:
        gop(k, 'Bằng chữ (USD): {{BANG_KE.TONG_TIEN_BANG_CHU}}', size=11, i=True, h=22, wrap=True); k += 1
        gop(k, 'Quy đổi bằng chữ (VND): {{BANG_KE.TONG_TIEN_QUY_DOI_BANG_CHU}}', size=11, i=True, h=22, wrap=True); k += 1
    else:
        gop(k, 'Bằng chữ: {{BANG_KE.TONG_TIEN_QUY_DOI_BANG_CHU}}', size=11, i=True, h=22, wrap=True); k += 1
    ws.row_dimensions[k].height = 14; k += 1
    ws.merge_cells(start_row=k, start_column=1, end_row=k, end_column=3); ws.merge_cells(start_row=k, start_column=4, end_row=k, end_column=n)
    for col, tx in ((1, 'KẾ TOÁN TRƯỞNG'), (4, 'NGÂN HÀNG')):
        c = ws.cell(k, col); c.value = tx; c.font = Font(name=F, size=12, bold=True); c.alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[k].height = 20; k += 1
    ws.merge_cells(start_row=k, start_column=1, end_row=k, end_column=3); ws.merge_cells(start_row=k, start_column=4, end_row=k, end_column=n)
    for col in (1, 4):
        c = ws.cell(k, col); c.value = '(Ký, ghi rõ họ tên)' if col == 1 else '(Ký, đóng dấu)'; c.font = Font(name=F, size=10, italic=True); c.alignment = Alignment(horizontal='center', vertical='center')
    # trang in: A4 NGANG, vừa 1 trang ngang, canh giữa
    ws.page_setup.orientation = 'landscape'; ws.page_setup.paperSize = 9
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
    ws.page_margins.left = 0.5; ws.page_margins.right = 0.5; ws.page_margins.top = 0.55; ws.page_margins.bottom = 0.55
    ws.print_options.horizontalCentered = True
    ws.print_title_rows = f'{hdr}:{hdr}'  # tiêu đề cột lặp lại ở mỗi trang khi bảng dài
    wb.properties.title = 'Bảng kê chuyển tiền vay' + (' (USD)' if usd else ' (VND)')
    wb.save(os.path.join(RA, ten_file))

# ====================================================================== UNC (Excel, A4 DỌC, 2 liên / 1 tờ)
def unc():
    from openpyxl.drawing.image import Image as XImage
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'UNC'
    F = 'Arial'; XANH = '0B5E5A'
    for col, w in zip('ABCD', (31, 22, 22, 22)): ws.column_dimensions[col].width = w
    ws.sheet_view.showGridLines = False
    mong = Side(style='thin', color=XANH); sợi = Side(style='hair', color='9E9E9E')
    def nhan(r, vi, en):
        c = ws.cell(r, 1); c.alignment = Alignment(vertical='center', indent=1, wrap_text=True)
        c.value = CellRichText(TextBlock(InlineFont(rFont=F, sz=9, b=True, color=XANH), vi + '/'), TextBlock(InlineFont(rFont=F, sz=8.5, i=True, color='444444'), en)) if CellRichText else vi + '/' + en
    def gtri(r, van_ban, b=False, i=False, sz=10, h=None, wrap=True):
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
        c = ws.cell(r, 2); c.value = van_ban; c.font = Font(name=F, size=sz, bold=b, italic=i)
        c.alignment = Alignment(vertical='center', wrap_text=wrap, indent=1)
        if h: ws.row_dimensions[r].height = h
    def dong_gop(r, van_ban, sz=9, h=16, b=False, i=False, can='left'):
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
        c = ws.cell(r, 1); c.value = van_ban; c.font = Font(name=F, size=sz, bold=b, italic=i)
        c.alignment = Alignment(vertical='center', horizontal=can, wrap_text=True, indent=1); ws.row_dimensions[r].height = h
    def khoi(r0, lien):
        r = r0
        ws.row_dimensions[r].height = 24; ws.row_dimensions[r + 1].height = 16
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3); ws.merge_cells(start_row=r + 1, start_column=2, end_row=r + 1, end_column=3)
        c = ws.cell(r, 2); c.value = 'ỦY NHIỆM CHI'; c.font = Font(name=F, size=15, bold=True, color=XANH); c.alignment = Alignment(horizontal='center', vertical='center')
        c = ws.cell(r + 1, 2); c.value = 'PAYMENT ORDER'; c.font = Font(name=F, size=9.5, color=XANH); c.alignment = Alignment(horizontal='center', vertical='top')
        c = ws.cell(r, 4); c.value = 'Liên %d' % lien; c.font = Font(name=F, size=9, italic=True, color='666666'); c.alignment = Alignment(horizontal='right', vertical='center', indent=1)
        c = ws.cell(r + 1, 4); c.value = 'Ngày/Date: {{HO_SO.NGAY_GIAI_NGAN}}'; c.font = Font(name=F, size=9.5, bold=True); c.alignment = Alignment(horizontal='right', vertical='top', indent=1)
        try:
            lg = XImage(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logo_bidv.png')); lg.width, lg.height = 84, 32; ws.add_image(lg, 'A%d' % r)
        except Exception as e: print('không thêm được logo:', e)
        r += 2
        hang = [('Tên TK trích Nợ', 'Dr A/c Name:', '{{CONG_TY.TEN}}', dict(b=True), 17),
                ('Địa chỉ', 'Address:', '{{CONG_TY.DIA_CHI}}', dict(sz=9.5), 26),
                ('Số TK trích Nợ', 'Dr A/C No:', '{{CONG_TY.TAI_KHOAN_VND}}', dict(), 17),
                ('Tại Ngân hàng', 'At Bank:', '{{HOP_DONG.TEN_NGAN_HANG}} – {{HOP_DONG.CHI_NHANH}}', dict(sz=9.5), 26),
                ('Số tiền bằng số', 'Amount in figures:', '{{CT.SO_TIEN_QUY_DOI_VN}} VND', dict(b=True, sz=11), 20),
                ('Số tiền bằng chữ', 'Amount in words:', '{{CT.SO_TIEN_QUY_DOI_BANG_CHU}} y./.', dict(i=True, sz=9.5), 28)]
        for vi, en, gt, kw, h in hang:
            nhan(r, vi, en); gtri(r, gt, h=h, **kw); r += 1
        dong_gop(r, 'Đề nghị NH quy đổi ra loại tiền/ Request for changing into: ………………………   Tỷ giá/ Ex rate: ………………………'); r += 1
        dong_gop(r, '☐ Phí trong số tiền chuyển/Deduct      ☐ Phí thu từ tiền mặt/Fee in cash      ☐ Phí thu từ tài khoản/Fee collected from A/C', sz=8.5); r += 1
        for vi, en, gt, kw, h in [('Người hưởng', 'Beneficiary:', '{{CT.TEN_NGUOI_HUONG}}', dict(b=True), 20)]:
            nhan(r, vi, en); gtri(r, gt, h=h, **kw); r += 1
        dong_gop(r, 'Số CCCD/HC/ID No: ……………………………   Ngày cấp/Date: ……………………   Nơi cấp/Place: ………………………………'); r += 1
        nhan(r, 'Địa chỉ', 'Address:'); gtri(r, '……………………………………………………………………………………………', sz=9, h=16); r += 1
        for vi, en, gt, kw, h in [('Số TK người hưởng', "Ben's A/C No:", '{{CT.SO_TAI_KHOAN}}', dict(b=True), 17), ('Tại Ngân hàng', 'At Bank:', '{{CT.NGAN_HANG}}', dict(sz=9.5), 17),
                                  ('Nội dung', 'Remarks:', '{{CT.NOI_DUNG}}', dict(sz=9.5), 26)]:
            nhan(r, vi, en); gtri(r, gt, h=h, **kw); r += 1
        # chữ ký: 3 ô
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
        for col, tx in ((1, 'KẾ TOÁN TRƯỞNG'), (2, 'CHỦ TÀI KHOẢN'), (4, 'NGÂN HÀNG')):
            c = ws.cell(r, col); c.value = tx; c.font = Font(name=F, size=9.5, bold=True); c.alignment = Alignment(horizontal='center', vertical='bottom')
        ws.row_dimensions[r].height = 18; r += 1
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
        for col, tx in ((1, '(Ký, ghi rõ họ tên)'), (2, '(Ký, ghi rõ họ tên, đóng dấu)'), (4, '(Ký, đóng dấu)')):
            c = ws.cell(r, col); c.value = tx; c.font = Font(name=F, size=8, italic=True, color='555555'); c.alignment = Alignment(horizontal='center', vertical='top')
        ws.row_dimensions[r].height = 40
        r_cuoi = r
        # khung ngoài mảnh + đường kẻ rất mảnh dưới mỗi dòng thông tin (không kẻ ô -> chữ không bị đè)
        for rr in range(r0, r_cuoi + 1):
            for cc in range(1, 5):
                c = ws.cell(rr, cc)
                c.border = Border(left=mong if cc == 1 else None, right=mong if cc == 4 else None, top=mong if rr == r0 else None, bottom=mong if rr == r_cuoi else (sợi if r0 + 2 <= rr < r_cuoi - 2 else None))
        return r_cuoi + 1
    try:
        from openpyxl.cell.rich_text import CellRichText, TextBlock
        from openpyxl.cell.text import InlineFont
        globals().update(CellRichText=CellRichText, TextBlock=TextBlock, InlineFont=InlineFont)
    except Exception:
        globals()['CellRichText'] = None
    r = khoi(1, 1)
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
    c = ws.cell(r, 1); c.value = '✂ ' + '- ' * 70; c.font = Font(name='MS Gothic', size=7, color='888888'); c.alignment = Alignment(horizontal='center', vertical='center'); ws.row_dimensions[r].height = 12
    khoi(r + 1, 2)
    ws.page_setup.orientation = 'portrait'; ws.page_setup.paperSize = 9
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True); ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 1
    ws.page_margins.left = 0.4; ws.page_margins.right = 0.4; ws.page_margins.top = 0.35; ws.page_margins.bottom = 0.35
    ws.print_options.horizontalCentered = True
    wb.properties.title = 'Ủy nhiệm chi (2 liên / A4)'
    wb.save(os.path.join(RA, 'UNC_2LIEN.xlsx'))


# ====================================================================== HĐTD (Word) — NGUYÊN BẢN, chỉ nới lề ô bảng để khung không đè chữ
def hdtd_gian_o():
    """Sao các mẫu HĐTD thật (mau_that/HDTD_*.docx) sang mau_chuan/: GIỮ NGUYÊN chữ + bố cục; chỉ (1) thêm lề trong ô cho bảng có khung (chữ không chạm/đè viền),
    (2) hàng bảng không bị cắt đôi giữa 2 trang, (3) hàng tiêu đề bảng lặp lại khi bảng sang trang."""
    goc = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mau_that')
    for f in ('HDTD_USD_1_KHOAN.docx', 'HDTD_USD_NHIEU_KHOAN.docx', 'HDTD_VND_1_KHOAN.docx', 'HDTD_VND_NHIEU_KHOAN.docx'):
        d = Document(os.path.join(goc, f))
        for t in d.tables:
            pr = t._tbl.tblPr
            if pr.find(qn('w:tblBorders')) is None: continue
            for x in pr.findall(qn('w:tblCellMar')): pr.remove(x)
            m = OxmlElement('w:tblCellMar')
            for e, v in (('top', 70), ('left', 100), ('bottom', 70), ('right', 100)):
                x = OxmlElement('w:' + e); x.set(qn('w:w'), str(v)); x.set(qn('w:type'), 'dxa'); m.append(x)
            look = pr.find(qn('w:tblLook'))
            (look.addprevious(m) if look is not None else pr.append(m))
            for i, r in enumerate(t.rows):
                trPr = r._tr.get_or_add_trPr()
                if trPr.find(qn('w:cantSplit')) is None: trPr.insert(0, OxmlElement('w:cantSplit'))
                if i == 0 and trPr.find(qn('w:tblHeader')) is None: trPr.append(OxmlElement('w:tblHeader'))
        d.save(os.path.join(RA, f))


hdmb(); hdtd_gian_o(); unc(); bang_ke('BANG_KE_VND.xlsx', False); bang_ke('BANG_KE_USD.xlsx', True)
print('đã tạo:', ', '.join(sorted(os.listdir(RA))))
