import { imageSize } from 'image-size';

export function createAssetPathname(filename: string, isProduction: boolean) {
  const dotIndex = filename.lastIndexOf('.');
  const hasExtension = dotIndex > 0 && dotIndex < filename.length - 1;
  const base = hasExtension ? filename.slice(0, dotIndex) : filename;
  const extension = hasExtension
    ? filename
        .slice(dotIndex + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    : '';
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'file';
  const prefix = isProduction ? 'assets' : 'temp/assets';

  return `${prefix}/${crypto.randomUUID()}-${slug}${extension ? `.${extension}` : ''}`;
}

export function getImageDimensions(
  file: Uint8Array,
  contentType: string,
): { width: number | null; height: number | null } {
  if (!contentType.startsWith('image/')) return { width: null, height: null };

  try {
    const dimensions = imageSize(file);
    return {
      width: dimensions.width ?? null,
      height: dimensions.height ?? null,
    };
  } catch {
    return { width: null, height: null };
  }
}
