import type { InferInsertModel } from 'drizzle-orm';
import * as schema from '$lib/db/tables';

// Seed Data Types
export type SeedPost = Omit<InferInsertModel<typeof schema.posts>, 'coverImageId'> & {
	tags: string[];
	coverImage: InferInsertModel<typeof schema.assets>;
};

export type SeedToken = Omit<InferInsertModel<typeof schema.tokens>, 'logoId'> & {
	tags: string[];
	logo: InferInsertModel<typeof schema.assets>;
};

export type SeedMessage = InferInsertModel<typeof schema.messages>;

import { type Role } from '$lib/auth/rbac';

// ... (previous types)

// User seed type - password will be hashed during seeding
export type SeedUser = {
	name: string;
	email: string;
	password: string; // Plain text, hashed during seeding
	role: Role; // Role literal
	status?: 'active' | 'inactive' | 'suspended' | 'banned';
	isEmailVerified: boolean;
};

// Dev password for all sample users (easy to remember for testing)
export const DEV_PASSWORD = 'password12345';

// Sample Users (Demo)
export const USERS: SeedUser[] = [
	{
		name: 'Super Admin',
		email: 'superadmin@cryptosharia.id',
		password: DEV_PASSWORD,
		role: 'super_admin',
		status: 'active',
		isEmailVerified: true
	},
	{
		name: 'Admin User',
		email: 'admin@cryptosharia.id',
		password: DEV_PASSWORD,
		role: 'admin',
		status: 'active',
		isEmailVerified: true
	},
	{
		name: 'Post Manager',
		email: 'posts@cryptosharia.id',
		password: DEV_PASSWORD,
		role: 'posts_manager',
		status: 'active',
		isEmailVerified: true
	},
	{
		name: 'Token Manager',
		email: 'tokens@cryptosharia.id',
		password: DEV_PASSWORD,
		role: 'tokens_manager',
		status: 'active',
		isEmailVerified: true
	},
	{
		name: 'Regular User',
		email: 'user@example.com',
		password: DEV_PASSWORD,
		role: 'member',
		status: 'active',
		isEmailVerified: true
	}
];

export const POSTS: SeedPost[] = [
	{
		slug: 'understanding-halal-cryptocurrency-basics',
		section: 'education',
		title: 'Understanding Halal Cryptocurrency: The Basics',
		excerpt:
			'A comprehensive guide to understanding cryptocurrency from an Islamic perspective, covering fundamental concepts and sharia compliance.',
		content: `# Understanding Halal Cryptocurrency
		
		Cryptocurrency has emerged as a revolutionary financial technology, but for Muslims, the question of its permissibility under Islamic law is paramount.
		
		## What Makes Cryptocurrency Halal?
		
		For a cryptocurrency to be considered halal, it must meet several criteria:
		
		1. **No Riba (Interest)**: The system must not involve interest-based transactions
		2. **No Gharar (Uncertainty)**: Excessive uncertainty and speculation should be avoided
		3. **Real Value**: The asset should have intrinsic value or utility
		4. **Transparency**: The technology and operations must be transparent`,
		type: 'article',
		status: 'published',
		publishedAt: new Date('2024-01-01T00:00:00Z'),
		isFeatured: true,
		eventDate: null,
		externalLink: null,
		tags: ['Education', 'Cryptocurrency', 'Halal', 'Sharia', 'Blockchain'],
		coverImage: {
			pathname: 'seed/halal-crypto-basics/800/600',
			filename: 'halal-crypto-basics.jpg',
			size: 150000,
			mimeType: 'image/jpeg',
			provider: 'picsum',
			width: 800,
			height: 600
		}
	},
	{
		slug: 'bitcoin-halal-analysis-2024',
		section: 'research',
		title: 'Bitcoin: A Comprehensive Halal Analysis',
		excerpt:
			'An in-depth research paper examining Bitcoin through the lens of Islamic jurisprudence and modern financial principles.',
		content: `# Bitcoin Halal Analysis
		
		This research examines Bitcoin's compliance with Islamic financial principles.
		
		## Methodology
		
		Our analysis is based on classical Islamic jurisprudence combined with modern financial understanding.`,
		type: 'article',
		status: 'published',
		publishedAt: new Date('2024-01-01T00:00:00Z'),
		isFeatured: false,
		eventDate: null,
		externalLink: null,
		tags: ['Bitcoin', 'Research', 'Halal Analysis', 'Cryptocurrency'],
		coverImage: {
			pathname: 'seed/bitcoin-analysis/800/600',
			filename: 'bitcoin-analysis.jpg',
			size: 175000,
			mimeType: 'image/jpeg',
			provider: 'picsum',
			width: 800,
			height: 600
		}
	},
	{
		slug: 'crypto-sharia-webinar-march-2024',
		section: 'activity',
		title: 'Crypto Sharia Webinar: Islamic Finance Meets Blockchain',
		excerpt:
			'Join us for an exclusive webinar discussing the intersection of Islamic finance and blockchain technology.',
		content: `# Upcoming Webinar
		
		**Date**: March 15, 2024  
		**Time**: 7:00 PM GMT+8
		
		## Topics Covered
		
		- Introduction to Islamic Finance Principles
		- Blockchain Technology Overview
		- Halal Cryptocurrency Projects
		- Q&A Session with Scholars`,
		type: 'webinar',
		status: 'published',
		publishedAt: new Date('2024-03-15T00:00:00Z'),
		isFeatured: true,
		eventDate: new Date('2024-03-15T19:00:00Z'),
		externalLink: 'https://example.com/webinar',
		tags: ['Webinar', 'Event', 'Islamic Finance', 'Blockchain', 'Education'],
		coverImage: {
			pathname: 'seed/webinar-march/800/600',
			filename: 'webinar-march.jpg',
			size: 160000,
			mimeType: 'image/jpeg',
			provider: 'picsum',
			width: 800,
			height: 600
		}
	},
	{
		slug: 'ethereum-pos-sharia-compliance',
		section: 'news',
		title: 'Ethereum Proof-of-Stake: Sharia Compliance Update',
		excerpt:
			"Breaking news on how Ethereum's transition to Proof-of-Stake affects its status under Islamic law.",
		content: `# Ethereum PoS Update
		
		Ethereum's successful transition to Proof-of-Stake has significant implications for its sharia compliance status.`,
		type: 'headline',
		status: 'published',
		publishedAt: new Date('2024-03-01T00:00:00Z'),
		isFeatured: false,
		eventDate: null,
		externalLink: null,
		tags: ['Ethereum', 'News', 'Proof of Stake', 'Sharia Compliance'],
		coverImage: {
			pathname: 'seed/ethereum-pos/800/600',
			filename: 'ethereum-pos.jpg',
			size: 155000,
			mimeType: 'image/jpeg',
			provider: 'picsum',
			width: 800,
			height: 600
		}
	},
	{
		slug: 'draft-post-unreleased',
		section: 'news',
		title: '[DRAFT] Upcoming Platform Features',
		excerpt: 'A glimpse into the future of CryptoSharia.',
		content: 'This post is under construction...',
		type: 'article',
		status: 'draft',
		isFeatured: false,
		eventDate: null,
		externalLink: null,
		tags: ['Internal', 'Draft'],
		coverImage: {
			pathname: 'seed/draft-post/800/600',
			filename: 'draft-post.jpg',
			size: 50000,
			mimeType: 'image/jpeg',
			provider: 'picsum',
			width: 800,
			height: 600
		}
	},
	{
		slug: 'archived-token-review',
		section: 'research',
		title: '[ARCHIVED] Legacy Token Review 2022',
		excerpt: 'Old research archive.',
		content: 'This research is now outdated.',
		type: 'article',
		status: 'archived',
		isFeatured: false,
		eventDate: null,
		externalLink: null,
		tags: ['Archive', 'History'],
		coverImage: {
			pathname: 'seed/archive/800/600',
			filename: 'archive.jpg',
			size: 100000,
			mimeType: 'image/jpeg',
			provider: 'picsum',
			width: 800,
			height: 600
		}
	}
];

export const TOKENS: SeedToken[] = [
	{
		slug: 'bitcoin',
		rank: 1,
		name: 'Bitcoin',
		ticker: 'BTC',
		shariaStatus: 'halal',
		excerpt: 'The first and most well-known cryptocurrency, often referred to as digital gold.',
		tradingviewSymbol: 'INDEX:BTCUSD',
		website: 'https://bitcoin.org',
		content: `# Bitcoin (BTC)
		
		Bitcoin is the first and most well-known cryptocurrency, created by Satoshi Nakamoto in 2009.
		
		## Sharia Analysis
		
		Bitcoin is generally considered halal by many Islamic scholars due to its decentralized nature and absence of interest-bearing mechanisms.`,
		status: 'published',
		publishedAt: new Date('2024-01-01T00:00:00Z'),
		tags: ['Currency', 'Proof of Work', 'Store of Value', 'Decentralized'],
		logo: {
			pathname: 'seed/btc-logo/128/128',
			filename: 'btc-logo.png',
			size: 8000,
			mimeType: 'image/png',
			provider: 'picsum',
			width: 128,
			height: 128
		}
	},
	{
		slug: 'ethereum',
		rank: 2,
		name: 'Ethereum',
		ticker: 'ETH',
		shariaStatus: 'halal',
		excerpt:
			'A decentralized platform that enables smart contracts and decentralized applications.',
		tradingviewSymbol: 'INDEX:ETHUSD',
		website: 'https://ethereum.org',
		content: `# Ethereum (ETH)
		
		Ethereum is a decentralized platform that enables smart contracts and decentralized applications.`,
		status: 'published',
		publishedAt: new Date('2024-01-01T00:02:00Z'),
		tags: ['Platform', 'Smart Contracts', 'Proof of Stake', 'DeFi'],
		logo: {
			pathname: 'seed/eth-logo/128/128',
			filename: 'eth-logo.png',
			size: 7500,
			mimeType: 'image/png',
			provider: 'picsum',
			width: 128,
			height: 128
		}
	},
	{
		slug: 'usdc',
		rank: 3,
		name: 'USD Coin',
		ticker: 'USDC',
		shariaStatus: 'halal',
		excerpt: 'A fully-backed stablecoin pegged to the US Dollar.',
		tradingviewSymbol: 'CRYPTO:USDCUSD',
		website: 'https://www.circle.com/en/usdc',
		content: `# USD Coin (USDC)
		
		USDC is a fully-backed stablecoin pegged to the US Dollar.`,
		status: 'published',
		publishedAt: new Date('2024-01-01T00:03:00Z'),
		tags: ['Stablecoin', 'Fiat-Backed', 'USD', 'Payments'],
		logo: {
			pathname: 'seed/usdc-logo/128/128',
			filename: 'usdc-logo.png',
			size: 6500,
			mimeType: 'image/png',
			provider: 'picsum',
			width: 128,
			height: 128
		}
	},
	{
		slug: 'bnb',
		rank: 4,
		name: 'BNB',
		ticker: 'BNB',
		shariaStatus: 'syubhat',
		excerpt: 'The native cryptocurrency of the BNB Chain ecosystem.',
		tradingviewSymbol: 'BINANCE:BNBUSDT',
		website: 'https://www.bnbchain.org',
		content: `# BNB
		
		BNB is the native cryptocurrency of the BNB Chain ecosystem.`,
		status: 'published',
		publishedAt: new Date('2024-01-01T00:04:00Z'),
		tags: ['Exchange Token', 'BNB Chain', 'Utility Token'],
		logo: {
			pathname: 'seed/bnb-logo/128/128',
			filename: 'bnb-logo.png',
			size: 7000,
			mimeType: 'image/png',
			provider: 'picsum',
			width: 128,
			height: 128
		}
	},
	{
		slug: 'solana',
		rank: 5,
		name: 'Solana',
		ticker: 'SOL',
		shariaStatus: 'halal',
		excerpt: 'A high-performance blockchain designed for decentralized applications.',
		tradingviewSymbol: 'BINANCE:SOLUSDT',
		website: 'https://solana.com',
		content: `# Solana (SOL)
		
		Solana is a high-performance blockchain designed for decentralized applications.`,
		status: 'published',
		publishedAt: new Date('2024-01-01T00:05:00Z'),
		tags: ['Platform', 'Proof of Stake', 'High Performance', 'DeFi'],
		logo: {
			pathname: 'seed/sol-logo/128/128',
			filename: 'sol-logo.png',
			size: 7200,
			mimeType: 'image/png',
			provider: 'picsum',
			width: 128,
			height: 128
		}
	},
	{
		slug: 'draft-coin',
		rank: 1000,
		name: 'Draft Coin',
		ticker: 'DRAFT',
		shariaStatus: 'syubhat',
		excerpt: 'Summary of draft coin.',
		tradingviewSymbol: null,
		website: 'https://example.com/draft',
		content: 'Coming soon...',
		status: 'draft',
		tags: ['Test'],
		logo: {
			pathname: 'seed/draft-logo/128/128',
			filename: 'draft-logo.png',
			size: 1000,
			mimeType: 'image/png',
			provider: 'picsum',
			width: 128,
			height: 128
		}
	},
	{
		slug: 'old-coin',
		rank: 9999,
		name: 'Old Coin',
		ticker: 'OLD',
		shariaStatus: 'haram',
		excerpt: 'Old research summary.',
		tradingviewSymbol: null,
		website: 'https://example.com/old',
		content: 'Delisted.',
		status: 'archived',
		tags: ['Archive'],
		logo: {
			pathname: 'seed/old-logo/128/128',
			filename: 'old-logo.png',
			size: 1000,
			mimeType: 'image/png',
			provider: 'picsum',
			width: 128,
			height: 128
		}
	}
];

export const MESSAGES: SeedMessage[] = [
	{
		name: 'Ahmad Fauzi',
		email: 'ahmad.fauzi@example.com',
		message:
			'Assalamualaykum, I read your analysis on Bitcoin and I have a question regarding the mining process. Is the energy consumption considered in the sharia compliance analysis?'
	},
	{
		name: 'Siti Aminah',
		email: 'siti.aminah@example.com',
		message:
			'Hello, we are a Sharia-compliant fintech startup and we are interested in collaborating with CryptoSharia for educational content.'
	},
	{
		name: 'John Doe',
		email: 'john.doe@example.com',
		message:
			'I really like the platform and the transparency it brings to the crypto space for the Muslim community. Keep up the good work!'
	}
];
