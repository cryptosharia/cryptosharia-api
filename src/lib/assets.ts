import type { Asset } from './db/types';

/**
 * Shape of a database asset record for URL generation.
 */
type AssetRecord = Pick<Asset, 'pathname' | 'provider' | 'width' | 'height'>;

/**
 * Generates an absolute URL for a given asset based on its provider.
 * @param asset - The database asset record
 * @returns The final absolute URL
 */
export function getAssetUrl(asset: AssetRecord): string {
	const { pathname, provider } = asset;

	switch (provider) {
		case 'picsum':
			// Format: https://picsum.photos/${pathname}
			return `https://picsum.photos/${pathname}`;

		case 'vercel_blob':
			// TODO: implement vercel blob url generation
      return pathname;

		default:
			// Fallback if pathname is already a URL
			if (pathname.startsWith('http')) {
				return pathname;
			}
			return pathname;
	}
}
