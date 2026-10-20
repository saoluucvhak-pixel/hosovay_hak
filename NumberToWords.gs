/**
 * NUMBERTOWORDS.GS
 * Chuyển số tiền (VND) sang chữ tiếng Việt, theo văn phong chứng từ ngân hàng
 * (vd: 463520000 -> "Bốn trăm sáu mươi ba triệu, năm trăm hai mươi ngàn đồng chẵn").
 */

var CHU_SO_ = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function docBaChuSo_(so, coSoKhac0PhiaTruoc) {
  var tram = Math.floor(so / 100);
  var chuc = Math.floor((so % 100) / 10);
  var donvi = so % 10;
  var parts = [];

  if (tram > 0) {
    parts.push(CHU_SO_[tram], 'trăm');
  } else if (coSoKhac0PhiaTruoc) {
    parts.push('không', 'trăm');
  }

  if (chuc === 0) {
    if (donvi > 0 && (tram > 0 || coSoKhac0PhiaTruoc)) parts.push('lẻ');
  } else if (chuc === 1) {
    parts.push('mười');
  } else {
    parts.push(CHU_SO_[chuc], 'mươi');
  }

  if (donvi === 1 && chuc > 1) {
    parts.push('mốt');
  } else if (donvi === 5 && chuc > 0) {
    parts.push('lăm');
  } else if (donvi > 0) {
    parts.push(CHU_SO_[donvi]);
  }

  return parts.join(' ');
}

/**
 * Chuyển 1 số nguyên (VND) thành chữ tiếng Việt, kết thúc bằng "đồng chẵn".
 * Dùng "ngàn" (văn phong miền Trung/Nam - khớp mẫu Vietcombank Đà Nẵng) thay vì "nghìn".
 */
function soThanhChuVN(soTien) {
  var n = docTienNguyen_(soTien, 'Số tiền');
  if (n === 0) return 'Không đồng chẵn';

  var donViNhom = ['', 'ngàn', 'triệu', 'tỷ'];
  var chuoiSo = String(n);
  var nhoms = [];
  while (chuoiSo.length > 0) {
    var start = Math.max(0, chuoiSo.length - 3);
    nhoms.unshift(chuoiSo.substring(start));
    chuoiSo = chuoiSo.substring(0, start);
  }

  var soNhom = nhoms.length;
  var ketQua = [];
  for (var i = 0; i < soNhom; i++) {
    var g = parseInt(nhoms[i], 10);
    if (g === 0) continue;
    var scaleIndex = soNhom - 1 - i; // 0 = don vi, 1 = ngan, 2 = trieu, 3 = ty, 4 = ngan ty, ...
    var tenNhom;
    if (scaleIndex < 4) {
      tenNhom = donViNhom[scaleIndex];
    } else {
      // scaleIndex >= 4: nghin ty (4), trieu ty (5), ty ty (6), nghin ty ty (7), ...
      var k = scaleIndex - 3;               // >= 1
      var cycle = Math.floor(k / 3);        // so lan "ty" lap them (0-based, tru lan dau)
      var rem = k % 3;                      // 0 -> '', 1 -> 'ngan', 2 -> 'trieu'
      var remWords = ['', 'ngàn', 'triệu'];
      var prefix = rem === 0 ? '' : (remWords[rem] + ' ');
      var tyRepeat = [];
      for (var t = 0; t <= cycle; t++) tyRepeat.push('tỷ');
      tenNhom = (prefix + tyRepeat.join(' ')).trim();
    }
    var coSoKhac0 = i > 0 && g < 100;
    var chu = docBaChuSo_(g, coSoKhac0);
    ketQua.push(tenNhom ? (chu + ' ' + tenNhom) : chu);
  }

  var str = ketQua.join(', ').replace(/\s+/g, ' ').trim();
  str = str.charAt(0).toUpperCase() + str.slice(1);
  return str + ' đồng chẵn';
}

/** Giống soThanhChuVN nhưng KHÔNG gắn hậu tố "đồng chẵn" — dùng chung cho tiền USD. */
function soThanhChuVN_KhongDonVi_(n) {
  return soThanhChuVN(n).replace(/ đồng chẵn$/, '');
}

/**
 * Chuyển số tiền USD (tối đa hai chữ số thập phân) sang chữ, VD: 25000 -> "Hai mươi lăm ngàn đô la Mỹ".
 * Phần cent được đọc riêng, không làm tròn.
 */
function soTienUSDBangChu_(soTien) {
  var cent = centUSD_(soTien), n = Number(cent / BigInt(100)), le = Number(cent % BigInt(100));
  var chu = n === 0 ? 'Không' : soThanhChuVN_KhongDonVi_(n);
  return chu.charAt(0).toUpperCase() + chu.slice(1) + ' đô la Mỹ' + (le ? ' và ' + soThanhChuVN_KhongDonVi_(le).toLowerCase() + ' cent' : '');
}

/** Chỉ đổi cách viết; không thay số tiền hay loại tiền. */
function tienBangChuKhongDau_(chu) {
  return String(chu == null ? '' : chu).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
