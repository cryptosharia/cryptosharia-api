import type { InferInsertModel } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';

import { dev } from '$app/environment';

export async function GET() {
	// 1. Strict Environment Safety Check
	// This ensures the route ONLY works in development mode.
	// In production, Vite will bake 'dev' as 'false', and this code becomes unreachable/error.
	if (!dev) {
		throw error(403, 'Forbidden: Seeding is only allowed in development mode.');
	}

	try {
		console.log('--- Seeding started via API ---');

		// Clear existing data
		await db.delete(schema.posts);
		await db.delete(schema.tokens);

		// Seed Posts
		await db.insert(schema.posts).values(POSTS);

		// Seed Tokens
		await db.insert(schema.tokens).values(TOKENS);

		return Response.json({
			success: true,
			message: 'Database seeded successfully'
		} satisfies ApiResponse<undefined>);
	} catch (err) {
		console.error('Seeding failed:', err);
		throw error(500, 'Internal Server Error during seeding.');
	}
}

const POSTS: InferInsertModel<typeof schema.posts>[] = [
	{
		slug: 'ustadz-ali-hasan-bawazier-resmi-jadi-pembina-cryptosharia-sinergi-dakwah-edukasi-dan-teknologi-syariah',
		category: 'activity',
		tags: [
			'Collaboration',
			'Ustadz',
			'Dakwah',
			'Sharia Crypto',
			'Sharia Finance',
			'Halal Crypto',
			'Sharia Economy',
			'Technology',
			'Ustadz Ali Hasan Bawazier'
		],
		title:
			'Ustadz Ali Hasan Bawazier Resmi Jadi Pembina CryptoSharia: Sinergi Dakwah, Edukasi, dan Teknologi Syariah',
		description:
			'Sebuah langkah penting dalam penguatan ekosistem kripto syariah di Indonesia terjadi pada Jumat, 15 Agustus 2025, ketika Ketua Crypto Sharia Sholahuddin Al Ayyuubi bersama Pembina Ustadz Devin Halim Wijaya melakukan kunjungan silaturahmi ke kediaman Ustadz Ali Hasan Bawazier.',
		thumbnailUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/posts/activities/ustadz-ali-hasan-bawazier-resmi-jadi-pembina-cryptosharia-sinergi-dakwah-edukasi-dan-teknologi-syariah/thumbnail.jpg',
		contentUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/posts/activities/ustadz-ali-hasan-bawazier-resmi-jadi-pembina-cryptosharia-sinergi-dakwah-edukasi-dan-teknologi-syariah/content.md'
	},
	{
		slug: 'cryptosharia-dan-halal-kulture-market-berkolaborasi-edukasi-kripto-syariah-untuk-kemajuan-umat',
		category: 'activity',
		tags: [
			'Halal Kulture',
			'Education',
			'Collaboration',
			'Innovation',
			'Sharia Crypto',
			'Sharia Finance',
			'Halal Crypto',
			'Blockchain',
			'Digital Economy',
			'Dakwah',
			'Halal Kulture Market'
		],
		title:
			'CryptoSharia dan Halal Kulture Market Berkolaborasi: Edukasi Kripto Syariah untuk Kemajuan Umat',
		description:
			'Dalam upaya memperluas literasi dan pemahaman masyarakat Muslim terhadap dunia aset digital, Crypto Sharia resmi berkolaborasi with Halal Kulture Market untuk menghadirkan sesi edukasi bertema “Crypto Syariah dan Blockchain untuk Umat”.',
		thumbnailUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/posts/activities/cryptosharia-dan-halal-kulture-market-berkolaborasi-edukasi-kripto-syariah-untuk-kemajuan-umat/thumbnail.jpg',
		contentUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/posts/activities/cryptosharia-dan-halal-kulture-market-berkolaborasi-edukasi-kripto-syariah-untuk-kemajuan-umat/content.md'
	},
	{
		slug: 'sejarah-bitcoin-dari-krisis-finansial-ke-era-blockchain',
		category: 'article',
		tags: ['bitcoin', 'history', 'blockchain', 'decentralization', 'digital finance'],
		title: 'Sejarah Bitcoin: Dari Krisis Finansial ke Era Blockchain',
		description:
			'Bitcoin telah menjadi fenomena global dalam dunia keuangan digital. Namun, bagaimana sejarah kemunculannya? Materi ini akan menjelaskan latar belakang and perjalanan Bitcoin sejak diciptakan tahun 2008 hingga perannya saat ini, with bahasa yang sederhana untuk masyarakat umum.',
		thumbnailUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/posts/articles/sejarah-bitcoin-dari-krisis-finansial-ke-era-blockchain/thumbnail.png',
		contentUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/posts/articles/sejarah-bitcoin-dari-krisis-finansial-ke-era-blockchain/content.md'
	},
	{
		slug: 'sejarah-penggunaan-emas-uang-logam-dan-uang-kertas-hingga-era-digital',
		category: 'article',
		tags: ['Sejarah', 'Uang', 'Emas', 'Uang Logam', 'Uang Kertas', 'Ekonomi'],
		title: 'Sejarah Penggunaan Emas, Uang Logam, dan Uang Kertas hingga Era Digital',
		description:
			'Uang merupakan elemen penting dalam kehidupan manusia, namun bentuk and konsep uang telah berevolusi selama ribuan tahun.',
		thumbnailUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/posts/articles/sejarah-penggunaan-emas-uang-logam-dan-uang-kertas-hingga-era-digital/thumbnail.jpg',
		contentUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/posts/articles/sejarah-penggunaan-emas-uang-logam-dan-uang-kertas-hingga-era-digital/content.md'
	}
];

const TOKENS: InferInsertModel<typeof schema.tokens>[] = [
	{
		slug: 'bitcoin',
		rank: 1,
		name: 'Bitcoin',
		ticker: 'BTC',
		status: 'halal',
		color: '#F7931A',
		tags: ['currency', 'pow'],
		tvPair: 'INDEX:BTCUSD',
		website: 'https://bitcoin.org',
		logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1.png',
		overviewUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/tokens/bitcoin/overview.md',
		conclusionUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/tokens/bitcoin/conclusion.md'
	},
	{
		slug: 'ethereum',
		rank: 2,
		name: 'Ethereum',
		ticker: 'ETH',
		status: 'halal',
		color: '#627EEA',
		tags: ['platform', 'pos'],
		tvPair: 'INDEX:ETHUSD',
		website: 'https://ethereum.org',
		logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1027.png',
		overviewUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/tokens/ethereum/overview.md',
		conclusionUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/tokens/ethereum/conclusion.md'
	},
	{
		slug: 'tether',
		rank: 3,
		name: 'Tether',
		ticker: 'USDT',
		status: 'halal',
		color: '#009393',
		tags: ['stablecoin', 'fiat-backed'],
		tvPair: 'CRYPTO:USDTUSD',
		website: 'https://tether.to',
		logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/128x128/825.png',
		overviewUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/tokens/tether/overview.md',
		conclusionUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/tokens/tether/conclusion.md'
	},
	{
		slug: 'bnb',
		rank: 5,
		name: 'BNB',
		ticker: 'BNB',
		status: 'syubhat',
		color: '#F3BA2F',
		tags: ['currency', 'pow', 'cz'],
		tvPair: 'BINANCE:BNBUSDT',
		website: 'https://www.bnbchain.org',
		logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1839.png',
		overviewUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/tokens/bnb/overview.md',
		conclusionUrl:
			'https://juyarisxwydpyrzujhsd.supabase.co/storage/v1/object/public/main/tokens/bnb/conclusion.md'
	}
];
