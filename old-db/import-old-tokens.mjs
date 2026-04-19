import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

import postgres from 'postgres';
import { del, put } from '@vercel/blob';
import { imageSize } from 'image-size';

function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i += 1) {
		const raw = argv[i];
		if (!raw.startsWith('--')) continue;
		const key = raw.slice(2);
		const next = argv[i + 1];
		if (next && !next.startsWith('--')) {
			out[key] = next;
			i += 1;
		} else {
			out[key] = true;
		}
	}
	return out;
}

function createLimiter(concurrency) {
	let active = 0;
	/** @type {Array<() => void>} */
	const queue = [];

	const next = () => {
		active -= 1;
		const run = queue.shift();
		if (run) run();
	};

	return async (fn) => {
		if (active >= concurrency) {
			await new Promise((resolve) => queue.push(resolve));
		}
		active += 1;
		try {
			return await fn();
		} finally {
			next();
		}
	};
}

async function fetchWithRetry(url, options) {
	const { retries = 3, timeoutMs = 30000, backoffMs = 600, expectOk = true } = options ?? {};

	let lastErr;
	for (let attempt = 0; attempt <= retries; attempt += 1) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const res = await fetch(url, { signal: controller.signal });
			if (expectOk && !res.ok) {
				throw new Error(`Fetch failed (${res.status}) ${url}`);
			}
			return res;
		} catch (err) {
			lastErr = err;
			if (attempt >= retries) break;
			const jitter = Math.floor(Math.random() * 200);
			const wait = backoffMs * Math.pow(2, attempt) + jitter;
			await new Promise((r) => setTimeout(r, wait));
		} finally {
			clearTimeout(timer);
		}
	}

	throw lastErr instanceof Error ? lastErr : new Error('Fetch failed');
}

function stripQuery(input) {
	const q = input.indexOf('?');
	return q >= 0 ? input.slice(0, q) : input;
}

function filenameFromUrl(url) {
	try {
		const u = new URL(url);
		const base = path.posix.basename(u.pathname);
		return base || 'file';
	} catch {
		return path.posix.basename(stripQuery(url)) || 'file';
	}
}

function extFromMime(mime) {
	const m = (mime || '').toLowerCase();
	if (m === 'image/jpeg') return '.jpg';
	if (m === 'image/png') return '.png';
	if (m === 'image/webp') return '.webp';
	if (m === 'image/gif') return '.gif';
	if (m === 'image/svg+xml') return '.svg';
	return '';
}

function toBlobKey(filename, opts) {
	const { isProduction, prefixOverride } = opts ?? {};
	const dotIndex = filename.lastIndexOf('.');
	const hasExt = dotIndex > 0 && dotIndex < filename.length - 1;
	const base = hasExt ? filename.slice(0, dotIndex) : filename;
	const ext = hasExt
		? filename
				.slice(dotIndex + 1)
				.toLowerCase()
				.replace(/[^a-z0-9]/g, '')
		: '';
	const slugBase =
		base
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'file';

	const extension = ext.length > 0 ? `.${ext}` : '';
	const prefix = (
		prefixOverride && String(prefixOverride).length > 0
			? String(prefixOverride)
			: isProduction
				? 'assets'
				: 'temp/assets'
	).replace(/\/+$/, '');

	return `${prefix}/${crypto.randomUUID()}-${slugBase}${extension}`;
}

function slugifyTag(input) {
	const base = input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (!base) return '';
	if (base.length <= 50) return base;

	const hash = crypto.createHash('sha1').update(base).digest('hex').slice(0, 6);
	return `${base.slice(0, 43)}-${hash}`;
}

function clampTagName(input) {
	const name = input.trim();
	if (name.length <= 50) return name;
	const hash = crypto.createHash('sha1').update(name).digest('hex').slice(0, 6);
	return `${name.slice(0, 40)}-${hash}`;
}

function bestEffortParseTags(raw) {
	if (!raw) return [];
	const trimmed = raw.trim();
	if (!trimmed) return [];
	try {
		const parsed = JSON.parse(trimmed);
		if (Array.isArray(parsed)) {
			return parsed.map((v) => String(v));
		}
		return [];
	} catch {
		return trimmed
			.replace(/^\[|\]$/g, '')
			.split(',')
			.map((v) => v.replace(/^\s*"|"\s*$/g, '').trim())
			.filter(Boolean);
	}
}

function stripFrontmatter(md) {
	const text = md.replace(/\r\n/g, '\n');
	if (!text.startsWith('---\n')) return md;
	const end = text.indexOf('\n---\n', 4);
	if (end === -1) return md;
	return text.slice(end + '\n---\n'.length);
}

function firstParagraphExcerpt(md, maxLen) {
	const normalized = md.replace(/\r\n/g, '\n');
	const lines = normalized.split('\n');
	let buf = '';
	for (const line of lines) {
		const t = line.trim();
		if (!t) {
			if (buf.trim()) break;
			continue;
		}
		if (t.startsWith('#')) continue;
		if (t.startsWith('>')) continue;
		if (t.startsWith('```')) continue;
		buf += (buf ? ' ' : '') + t;
		if (buf.length >= maxLen) break;
	}
	const excerpt = buf.trim();
	if (excerpt.length <= maxLen) return excerpt;
	return excerpt.slice(0, maxLen - 3).trimEnd() + '...';
}

function markdownToPlainText(md) {
	let s = md;

	// Drop fenced code blocks entirely.
	s = s.replace(/```[\s\S]*?```/g, ' ');
	// Inline code.
	s = s.replace(/`([^`]+)`/g, '$1');

	// Images: ![alt](url) -> alt
	s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1');
	// Links: [text](url) -> text
	s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

	// Headings/blockquote markers.
	s = s.replace(/^\s{0,3}#{1,6}\s+/gm, '');
	s = s.replace(/^\s*>\s?/gm, '');

	// Common emphasis markers.
	s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
	s = s.replace(/__([^_]+)__/g, '$1');
	s = s.replace(/\*([^*]+)\*/g, '$1');
	s = s.replace(/_([^_]+)_/g, '$1');
	s = s.replace(/~~([^~]+)~~/g, '$1');

	// Remove any remaining markdown list markers at line start.
	s = s.replace(/^\s*[-*+]\s+/gm, '');
	s = s.replace(/^\s*\d+\.\s+/gm, '');

	// Collapse whitespace.
	s = s.replace(/\s+/g, ' ').trim();
	return s;
}

function truncatePlainText(s, maxLen) {
	if (s.length <= maxLen) return s;
	return s.slice(0, maxLen - 3).trimEnd() + '...';
}

function parseCsvText(text) {
	/** @type {string[][]} */
	const rows = [];
	/** @type {string[]} */
	let row = [];
	let field = '';
	let inQuotes = false;

	const pushField = () => {
		row.push(field);
		field = '';
	};
	const pushRow = () => {
		rows.push(row);
		row = [];
	};

	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				const next = text[i + 1];
				if (next === '"') {
					field += '"';
					i += 1;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
			continue;
		}

		if (ch === '"') {
			inQuotes = true;
			continue;
		}
		if (ch === ',') {
			pushField();
			continue;
		}
		if (ch === '\n') {
			pushField();
			pushRow();
			continue;
		}
		if (ch === '\r') continue;
		field += ch;
	}

	if (inQuotes) throw new Error('CSV parse error: unterminated quote');
	if (field.length > 0 || row.length > 0) {
		pushField();
		pushRow();
	}

	return rows;
}

async function readCsvFile(filePath) {
	const raw = await fs.readFile(filePath, 'utf8');
	const rows = parseCsvText(raw);
	if (rows.length < 2) return [];
	const headers = rows[0].map((h) => h.trim());

	return rows
		.slice(1)
		.filter((r) => r.some((v) => (v ?? '').trim() !== ''))
		.map((r) => {
			/** @type {Record<string, string>} */
			const obj = {};
			for (let i = 0; i < headers.length; i += 1) {
				obj[headers[i]] = r[i] ?? '';
			}
			return obj;
		});
}

function isDeadlockError(err) {
	const msg = err instanceof Error ? err.message : String(err);
	return msg.toLowerCase().includes('deadlock detected');
}

async function withDeadlockRetry(fn, opts) {
	const { attempts = 3, baseDelayMs = 150 } = opts ?? {};
	let last;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fn();
		} catch (err) {
			last = err;
			if (!isDeadlockError(err) || i === attempts - 1) throw err;
			const jitter = Math.floor(Math.random() * 100);
			await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1) + jitter));
		}
	}
	throw last;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	const databaseUrl = process.env.DATABASE_URL;
	const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
	if (!databaseUrl) throw new Error('DATABASE_URL is required');
	if (!blobToken) throw new Error('BLOB_READ_WRITE_TOKEN is required');

	const csvPath = String(args.csv ?? 'old-db/tokens_rows.csv');
	const blobPrefixOverride = args['blob-prefix'] ? String(args['blob-prefix']) : undefined;
	const mode = String(args.mode ?? 'upsert'); // upsert | skip
	const dryRun = Boolean(args['dry-run'] ?? false);
	const limit = args.limit ? Number(args.limit) : undefined;
	const concurrency = args.concurrency ? Math.max(1, Number(args.concurrency)) : 3;
	const reuploadImages = Boolean(args['reupload-images'] ?? false);
	const isProduction = process.env.VERCEL_ENV === 'production';

	if (!['upsert', 'skip'].includes(mode)) {
		throw new Error(`Invalid --mode ${mode} (expected upsert|skip)`);
	}

	const limiter = createLimiter(concurrency);
	const sql = postgres(databaseUrl, {
		max: Math.max(2, concurrency + 1),
		idle_timeout: 20,
		connect_timeout: 30
	});

	const rows = await readCsvFile(csvPath);
	const input = limit ? rows.slice(0, limit) : rows;

	let okCount = 0;
	let failCount = 0;
	let processed = 0;

	const tasks = input.map((row) =>
		limiter(async () => {
			const slug = String(row.slug ?? '').trim();
			const name = String(row.name ?? '').trim();
			const ticker = String(row.symbol ?? '').trim();
			const cmcRankRaw = String(row.cmc_rank ?? '').trim();
			const sharia = String(row.status ?? '').trim();
			const tvPair = String(row.tv_pair ?? '').trim();
			const website = String(row.website ?? '').trim();
			const logoUrl = String(row.logo_url ?? '').trim();
			const overviewUrl = String(row.overview_url ?? '').trim();
			const conclusionUrl = String(row.conclusion_url ?? '').trim();
			const createdAtStr = String(row.created_at ?? '').trim();
			const rawTags = String(row.tags ?? '').trim();

			try {
				if (!slug) throw new Error('Missing slug');
				if (!name) throw new Error('Missing name');
				if (!ticker) throw new Error('Missing symbol');
				if (!cmcRankRaw) throw new Error('Missing cmc_rank');
				if (!sharia) throw new Error('Missing status (shariaStatus)');
				if (!website) throw new Error('Missing website');
				if (!logoUrl) throw new Error('Missing logo_url');
				if (!overviewUrl) throw new Error('Missing overview_url');
				if (!conclusionUrl) throw new Error('Missing conclusion_url');
				if (!createdAtStr) throw new Error('Missing created_at');

				const rank = Number(cmcRankRaw);
				if (!Number.isFinite(rank)) throw new Error(`Invalid cmc_rank: ${cmcRankRaw}`);

				const createdAt = new Date(createdAtStr);
				if (Number.isNaN(createdAt.getTime())) {
					throw new Error(`Invalid created_at: ${createdAtStr}`);
				}
				const publishedAt = createdAt;

				const existing = await sql`
					SELECT id, logo_id
					FROM tokens
					WHERE slug = ${slug}
					LIMIT 1
				`;
				if (existing.length > 0 && mode === 'skip') {
					okCount += 1;
					processed += 1;
					return;
				}

				const [overviewRes, conclusionRes, logoRes] = await Promise.all([
					fetchWithRetry(overviewUrl, { timeoutMs: 60000, retries: 3 }),
					fetchWithRetry(conclusionUrl, { timeoutMs: 60000, retries: 3 }),
					reuploadImages || existing.length === 0
						? fetchWithRetry(logoUrl, { timeoutMs: 60000, retries: 3 })
						: Promise.resolve(null)
				]);

				let overviewMd = overviewRes ? await overviewRes.text() : '';
				let conclusionMd = conclusionRes ? await conclusionRes.text() : '';
				overviewMd = stripFrontmatter(overviewMd).trim();
				conclusionMd = stripFrontmatter(conclusionMd).trim();
				if (!overviewMd) throw new Error(`Empty overview markdown from ${overviewUrl}`);
				if (!conclusionMd) throw new Error(`Empty conclusion markdown from ${conclusionUrl}`);

				const content = `${overviewMd}\n\n## Kesimpulan\n\n${conclusionMd}\n`;
				const excerptCandidate = firstParagraphExcerpt(overviewMd, 800) || `${name} (${ticker})`;
				const excerpt = truncatePlainText(markdownToPlainText(excerptCandidate), 240);

				let logoId = existing.length > 0 ? existing[0].logo_id : null;
				let uploadedBlob = null;
				let assetPathname = null;
				let assetFilename = null;
				let assetSize = null;
				let assetMimeType = null;
				let assetWidth = null;
				let assetHeight = null;

				if (logoRes) {
					const contentType = logoRes.headers.get('content-type') || '';
					const bytes = new Uint8Array(await logoRes.arrayBuffer());
					if (bytes.length === 0) throw new Error(`Empty logo image from ${logoUrl}`);

					let width = null;
					let height = null;
					if (contentType.toLowerCase().startsWith('image/')) {
						try {
							const dim = imageSize(bytes);
							width = dim.width ?? null;
							height = dim.height ?? null;
						} catch {
							// best-effort
						}
					}

					const srcName = filenameFromUrl(logoUrl);
					const inferredExt = extFromMime(contentType) || path.extname(stripQuery(srcName)) || '';
					const safeName = `${slug}${inferredExt && inferredExt.length <= 10 ? inferredExt : ''}`;
					const blobKey = toBlobKey(safeName, {
						isProduction,
						prefixOverride: blobPrefixOverride
					});

					if (!dryRun) {
						uploadedBlob = await put(blobKey, bytes, {
							access: 'public',
							addRandomSuffix: false,
							contentType: contentType || undefined,
							token: blobToken
						});

						const storedPathname =
							uploadedBlob.pathname ?? new URL(uploadedBlob.url).pathname.replace(/^\//, '');
						assetPathname = storedPathname;
						assetFilename = path.posix.basename(storedPathname);
						assetSize = bytes.length;
						assetMimeType = contentType || null;
						assetWidth = width;
						assetHeight = height;
					}
				}

				if (!dryRun) {
					try {
						await withDeadlockRetry(
							() =>
								sql.begin(async (tx) => {
									let finalLogoId = logoId;
									if (assetPathname) {
										const assetRows = await tx`
											INSERT INTO assets (
												pathname,
												filename,
												size,
												mime_type,
												width,
												height,
												provider,
												created_at,
												created_by
											)
											VALUES (
												${assetPathname},
												${assetFilename ?? path.posix.basename(assetPathname)},
												${assetSize ?? 0},
												${assetMimeType ?? null},
												${assetWidth},
												${assetHeight},
												'vercel_blob'::asset_provider,
												${createdAt},
												NULL
											)
											ON CONFLICT (pathname) DO UPDATE
											SET
												filename = EXCLUDED.filename,
												size = EXCLUDED.size,
												mime_type = EXCLUDED.mime_type,
												width = EXCLUDED.width,
												height = EXCLUDED.height,
												provider = EXCLUDED.provider
											RETURNING id
										`;
										finalLogoId = assetRows[0]?.id ?? finalLogoId;
									}

									if (!finalLogoId) throw new Error('Unable to resolve logoId');

									const tokenRows = await tx`
										INSERT INTO tokens (
											slug,
											rank,
											name,
											ticker,
											sharia_status,
											status,
											excerpt,
											tradingview_symbol,
											website,
											logo_id,
											content,
											published_at,
											created_at,
											updated_at,
											created_by,
											updated_by
										)
										VALUES (
											${slug},
											${rank},
											${name},
											${ticker},
											${sharia}::sharia_status,
											'published'::content_status,
											${excerpt},
											${tvPair || null},
											${website},
											${finalLogoId},
											${content},
											${publishedAt},
											${createdAt},
											now(),
											NULL,
											NULL
										)
										ON CONFLICT (slug) DO UPDATE
										SET
											rank = EXCLUDED.rank,
											name = EXCLUDED.name,
											ticker = EXCLUDED.ticker,
											sharia_status = EXCLUDED.sharia_status,
											status = EXCLUDED.status,
											excerpt = EXCLUDED.excerpt,
											tradingview_symbol = EXCLUDED.tradingview_symbol,
											website = EXCLUDED.website,
											logo_id = EXCLUDED.logo_id,
											content = EXCLUDED.content,
											published_at = EXCLUDED.published_at,
											updated_at = now()
										RETURNING id
									`;

									const tokenId = tokenRows[0].id;
									await tx`DELETE FROM token_tags WHERE token_id = ${tokenId}`;

									const tagNames = bestEffortParseTags(rawTags);
									/** @type {string[]} */
									const tagIds = [];
									for (const rawName of tagNames) {
										const tagName = clampTagName(String(rawName));
										const tagSlug = slugifyTag(tagName);
										if (!tagSlug) continue;

										let inserted;
										try {
											inserted = await tx`
												INSERT INTO tags (name, slug, description, created_at, updated_at, created_by, updated_by)
												VALUES (${tagName}, ${tagSlug}, NULL, now(), NULL, NULL, NULL)
												ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
												RETURNING id
											`;
										} catch {
											const existingTag =
												await tx`SELECT id FROM tags WHERE name = ${tagName} LIMIT 1`;
											inserted = existingTag;
										}
										if (inserted?.[0]?.id) tagIds.push(inserted[0].id);
									}

									const uniqueTagIds = Array.from(new Set(tagIds));
									for (const tagId of uniqueTagIds) {
										await tx`
											INSERT INTO token_tags (token_id, tag_id, display_order)
											VALUES (${tokenId}, ${tagId}::uuid, NULL)
											ON CONFLICT DO NOTHING
										`;
									}
								}),
							{ attempts: 3 }
						);
					} catch (txErr) {
						if (uploadedBlob?.url) {
							try {
								await del(uploadedBlob.url, { token: blobToken });
							} catch {
								// best-effort cleanup
							}
						}
						throw txErr;
					}
				}

				okCount += 1;
				processed += 1;
				if (processed % 25 === 0) {
					console.log(`Processed ${processed}/${input.length}`);
				}
			} catch (err) {
				failCount += 1;
				processed += 1;
				console.error(`Failed ${slug}:`, err instanceof Error ? err.message : String(err));
			}
		})
	);

	await Promise.all(tasks);
	await sql.end({ timeout: 5 });
	console.log(`Done. ok=${okCount} failed=${failCount}`);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
