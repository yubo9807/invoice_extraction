
const config = {
  width: 1644,
  height: 1095,
};

(async function () {

  const base64 = await resetImageSize('./test1.png');

  // 分片读取内容
  const { invoiceCode, invoiceNumber, makeDate } = await getInvoiceCode(base64);
  const { tax, money } = await getMoney(base64);
  const { taxRate } = await getTaxRate(base64);

  console.log({
    invoiceCode, invoiceNumber, makeDate,
    tax, money,
    taxRate,
  })
}());

/**
 * 重置图片大小，方便统一处理（保证图片清晰）
 * @returns 
 */
function resetImageSize(src) {
  return new Promise((reslove, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = src;
    img.onload = async () => {
      ctx.drawImage(img, 0, 0, config.width, config.height);
      const base64 = canvas.toDataURL(`image/png`);
      reslove(base64);
    }
  })
}

/**
 * 获取税率
 * @param {*} base64 
 * @returns 
 */
async function getTaxRate(base64) {
  const newBase64 = await splitImage(base64, 1300, 445, config.width, 480);
  const text = await readText(newBase64);
  const collect = {};
  const reg = /[+-]?\d+(\.\d{1,2})?/g;
  const matched = text.match(reg);
  collect.taxRate = matched[0];
  return collect;
}

/**
 * 获取发票税额/总金额
 * @param {*} base64 
 * @returns 
 */
async function getMoney(base64) {
  const newBase64 = await splitImage(base64, 1100, 700, config.width, 800);
  const text = await readText(newBase64);
  const [ tax, money ] = text.split('\n');
  const reg = /[+-]?\d+(\.\d{1,2})?/g;
  const collect = {}
  {  // 税额
    const matched = tax.match(reg);
    collect.tax = matched[matched.length - 1];
  }
  {  // 总金额
    const matched = money.match(reg);
    collect.money = matched[matched.length - 1];
  }
  return collect;
}

/**
 * 获取发票代码/号码/日期
 * @param {*} base64 
 * @returns 
 */
async function getInvoiceCode(base64) {
  const newBase64 = await splitImage(base64, 1150, 60, config.width, 226);
  const text = await readText(newBase64);
  const [ invoiceCode, invoiceNumber ] = text.split('\n');
  const collect = {}
  {  // 发票代码
    const matched = invoiceCode.match(/\d+/g);
    collect.invoiceCode = matched[matched.length - 1];
  }
  {  // 发票号码
    const matched = invoiceNumber.match(/\d+/g);
    collect.invoiceNumber = matched[matched.length - 1];
  }
  {  // 发票日期（英文解析日期无法修正）
    const text = await readText(newBase64, 'chi_sim');
    const arr = text.split('\n');
    const matched = arr[arr.length - 3].match(/\d+/g);
    collect.makeDate = matched.join('/');
  }
  return collect;
}

/**
 * 截取图片的一部分
 * @param {*} base64 
 * @param {*} startX 
 * @param {*} startY 
 * @param {*} endX 
 * @param {*} endY 
 */
function splitImage(base64, startX, startY, endX, endY) {
  return new Promise((reslove, reject) => {
    if (startX >= endX || startY >= endY) {
      return 
    }
    const canvas = document.createElement('canvas');
    canvas.width = endX - startX;
    canvas.height = endY - startY;
    const ctx = canvas.getContext('2d');
  
    const img = new Image();
    img.src = base64;
    img.onload = async () => {
      ctx.drawImage(img, startX, startY, endX, endY, 0, 0, endX, endY);
      const base64 = canvas.toDataURL(`image/png`);
      document.body.appendChild(canvas);
      reslove(base64);
    }
  })
}

/**
 * 读取图片文字
 * @param {*} base64 
 * @param {*} language 
 * @returns 
 */
async function readText(base64, language = 'eng') {
  const res = await Tesseract.recognize(base64, language);
  return res.data.text.replace(/\n+/g, '\n');
}
