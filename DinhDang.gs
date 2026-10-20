/** Pure display/input rules. Keep identical to the browser factory; parity tested. */
function taoBoDinhDang_() {
  var defaults = {nghin:'.', le:',', soLe:0, ngay:'dd/MM/yyyy'};
  function config(v) {
    var c = Object.assign({}, defaults, v || {});
    if (['.', ',', ' ', "'", ''].indexOf(c.nghin)<0 || ['.', ','].indexOf(c.le)<0 || c.nghin===c.le) throw new Error('Dấu hàng nghìn và dấu thập phân phải khác nhau.');
    if (!Number.isInteger(c.soLe) || c.soLe<0 || c.soLe>6) throw new Error('Số lẻ hiển thị phải từ 0 đến 6.');
    if (['dd/MM/yyyy','dd-MM-yyyy','dd.MM.yyyy','yyyy-MM-dd','yyyy/MM/dd','MM/dd/yyyy'].indexOf(c.ngay)<0) throw new Error('Định dạng ngày không hợp lệ.');
    return c;
  }
  function plain(n) {
    var s=String(n); if(!/e/i.test(s)) return s;
    var sign=n<0?'-':'', a=Math.abs(n).toString().toLowerCase().split('e'), p=a[0].split('.'), digits=p.join(''), pos=p[0].length+Number(a[1]);
    return sign+(pos<=0?'0.'+'0'.repeat(-pos)+digits:pos>=digits.length?digits+'0'.repeat(pos-digits.length):digits.slice(0,pos)+'.'+digits.slice(pos));
  }
  function number(n,c) {
    c=config(c); n=Number(n); if(!Number.isFinite(n)) return '';
    var p=plain(n).split('.'), frac=p[1]||'';
    // Padding only: never round off actual cents or exchange-rate precision.
    while(frac.length<c.soLe) frac+='0';
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g,c.nghin)+(frac?c.le+frac:'');
  }
  function parse(v,c,max,ten) {
    c=config(c); ten=ten||'Số tiền';
    if(v==null||String(v).trim()==='') return 0;
    var s=typeof v==='number'?plain(v):String(v).trim().replace(/\u00a0/g,' ');
    if(typeof v!=='number') {
      var p=s.split(c.le); if(p.length>2) throw new Error(ten+': nhiều dấu thập phân.');
      var integer=p[0];
      if(c.nghin&&integer.indexOf(c.nghin)>=0) {
        var groups=integer.split(c.nghin);
        if(!/^\d{1,3}$/.test(groups[0])||groups.slice(1).some(function(x){return !/^\d{3}$/.test(x);})) throw new Error(ten+': phân nhóm hàng nghìn không hợp lệ.');
        integer=groups.join('');
      }
      if(!/^\d+$/.test(integer)||(p.length===2&&!/^\d+$/.test(p[1]))) throw new Error(ten+': dùng đúng dấu đã chọn trong Cài đặt.');
      s=integer+(p.length===2?'.'+p[1]:'');
    }
    if(!/^\d+(\.\d+)?$/.test(s)||(s.split('.')[1]||'').replace(/0+$/, '').length>max) throw new Error(ten+': chỉ nhận tối đa '+max+' chữ số thập phân.');
    var n=Number(s); if(!Number.isFinite(n)||n<0||n*Math.pow(10,max===2?2:(s.split('.')[1]||'').replace(/0+$/, '').length)>Number.MAX_SAFE_INTEGER) throw new Error(ten+': số quá lớn hoặc không hợp lệ.');
    return n;
  }
  // Input remains ISO, API legacy dates remain dd/MM/yyyy. Never infer MM/dd from a stored string.
  function day(v,c) {
    if(!v) return '';c=config(c);var s=String(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/),y,mo,d,tail='';
    if(m){y=m[1];mo=m[2];d=m[3];tail=/^\s/.test(m[4])?m[4]:'';}
    else {m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/);if(!m)return s;d=m[1];mo=m[2];y=m[3];tail=m[4];}
    return c.ngay.replace('yyyy',y).replace('MM',mo).replace('dd',d)+tail;
  }
  return {config:config,number:number,parse:parse,day:day};
}

function layDinhDang_() {
  var raw=PropertiesService.getScriptProperties().getProperty('CH_DINH_DANG');
  try {return taoBoDinhDang_().config(raw?JSON.parse(raw):null);} catch(e){return taoBoDinhDang_().config();}
}
function soDinhDang_(n) {return taoBoDinhDang_().number(n,layDinhDang_());}
function ngayDinhDang_(v) {return taoBoDinhDang_().day(chuanNgay_(v),layDinhDang_());}
function luuDinhDangHienThi(payload) {
  yeuCauDangNhap_();yeuCauQuanTri_('lưu định dạng số và ngày');
  var c=taoBoDinhDang_().config(payload);
  PropertiesService.getScriptProperties().setProperty('CH_DINH_DANG',JSON.stringify(c));
  ghiNhatKy_('','CAU_HINH_DINH_DANG','Cập nhật định dạng hiển thị số và ngày');
  return c;
}
