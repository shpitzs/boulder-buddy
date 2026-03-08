import { Skia, ColorType, AlphaType } from '@shopify/react-native-skia';

export interface PixelData {
  pixels: Uint8Array;
  width: number;
  height: number;
}

/**
 * Decode a base64-encoded image (PNG/JPEG) into raw RGBA pixel data
 * using Skia's native image decoder.
 */
export function decodeImageToPixels(base64: string): PixelData | null {
  try {
    const skData = Skia.Data.fromBase64(base64);
    const image = Skia.Image.MakeImageFromEncoded(skData);

    if (!image) {
      console.warn('Skia: failed to decode image from base64');
      return null;
    }

    const width = image.width();
    const height = image.height();

    const pixelData = image.readPixels(0, 0, {
      width,
      height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });

    if (!pixelData || !(pixelData instanceof Uint8Array)) {
      console.warn('Skia: readPixels returned null or unexpected type');
      return null;
    }

    return { pixels: pixelData, width, height };
  } catch (e) {
    console.warn('Skia pixel decode error:', e);
    return null;
  }
}
