// PIX EMV QR Code Generator
// Based on the Brazilian PIX standard (EMV QR Code Merchant Presented Mode)

interface PixData {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  transactionId: string;
  description?: string;
}

function crc16(str: string): string {
  const polynomial = 0x1021;
  let crc = 0xFFFF;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }

  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

export function generatePixPayload(data: PixData): string {
  // Payload Format Indicator
  let payload = formatField('00', '01');

  // Merchant Account Information (PIX)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', data.pixKey);
  const description = data.description ? formatField('02', data.description.slice(0, 25)) : '';
  const merchantAccount = gui + key + description;
  payload += formatField('26', merchantAccount);

  // Merchant Category Code
  payload += formatField('52', '0000');

  // Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // Transaction Amount
  if (data.amount > 0) {
    payload += formatField('54', data.amount.toFixed(2));
  }

  // Country Code
  payload += formatField('58', 'BR');

  // Merchant Name
  payload += formatField('59', data.merchantName.slice(0, 25));

  // Merchant City
  payload += formatField('60', data.merchantCity.slice(0, 15));

  // Additional Data Field Template
  const txid = formatField('05', data.transactionId.slice(0, 25));
  payload += formatField('62', txid);

  // CRC16 placeholder
  payload += '6304';

  // Calculate and append CRC16
  const crc = crc16(payload);
  payload += crc;

  return payload;
}

export function generatePixQRCodeUrl(payload: string): string {
  // Using a free QR code API
  return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(payload)}`;
}
