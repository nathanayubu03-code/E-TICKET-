import zxing from '@zxing/library';

const { BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } = zxing;
import sharp from 'sharp';

/** Décode un QR dans une image (PNG ou JPEG) avec ZXing. Renvoie null si illisible. */
export async function decoderQR(image: Buffer): Promise<string | null> {
  const { data, info } = await sharp(image).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  const lum = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const source = new RGBLuminanceSource(lum, info.width, info.height);
  const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);
  try {
    return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source)), hints).getText();
  } catch {
    return null;
  }
}
