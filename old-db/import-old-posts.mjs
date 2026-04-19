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

function looksLikeSession(text) {
	return /(webinar|kajian|workshop|meetup|diskusi|ama|seminar)/i.test(text);
}

function inferArticleSection(text) {
	const t = text.toLowerCase();
	if (
		/(analisis|analysis|outlook|renaissance|paradoks|strategis|strategi|riset|research)/.test(t)
	) {
		return 'research';
	}
	if (/(update|breaking|rilis|release)/.test(t)) {
		return 'news';
	}
	return 'education';
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
		// Fallback: treat as comma-separated values.
		return trimmed
			.replace(/^\[|\]$/g, '')
			.split(',')
			.map((v) => v.replace(/^\s*"|"\s*$/g, '').trim())
			.filter(Boolean);
	}
}

function parseCsvText(text) {
	// Minimal RFC4180-style parser: commas, quotes, newlines, escaped quotes.
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
		if (ch === '\r') {
			continue;
		}
		field += ch;
	}

	// Flush last row if needed.
	if (inQuotes) {
		throw new Error('CSV parse error: unterminated quote');
	}
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

async function main() {
	const args = parseArgs(process.argv.slice(2));

	const databaseUrl = process.env.DATABASE_URL;
	const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
	if (!databaseUrl) throw new Error('DATABASE_URL is required');
	if (!blobToken) throw new Error('BLOB_READ_WRITE_TOKEN is required');

	const csvPath = String(args.csv ?? 'old-db/posts_rows.csv');
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
			const title = String(row.title ?? '').trim();
			const category = String(row.category ?? '').trim();
			const description = String(row.description ?? '').trim();
			const thumbnailUrl = String(row.thumbnail_url ?? '').trim();
			const contentUrl = String(row.content_url ?? '').trim();
			const dateStr = String(row.date ?? '').trim();
			const createdAtStr = String(row.created_at ?? '').trim();
			const rawTags = String(row.tags ?? '').trim();

			try {
				if (!slug) throw new Error('Missing slug');
				if (!title) throw new Error('Missing title');
				if (!thumbnailUrl) throw new Error('Missing thumbnail_url');
				if (!contentUrl) throw new Error('Missing content_url');
				if (!dateStr) throw new Error('Missing date');

				const publishedAt = new Date(`${dateStr}T00:00:00.000Z`);
				if (Number.isNaN(publishedAt.getTime())) {
					throw new Error(`Invalid date: ${dateStr}`);
				}

				const createdAt = createdAtStr ? new Date(createdAtStr) : null;
				if (createdAt && Number.isNaN(createdAt.getTime())) {
					throw new Error(`Invalid created_at: ${createdAtStr}`);
				}

				const haystack = `${title} ${slug} ${rawTags}`;
				let section;
				let type;
				let eventDate = null;

				if (category === 'activity') {
					section = 'activity';
					type = looksLikeSession(haystack) ? 'webinar' : 'headline';
					// Only session-like activity posts are treated as events.
					eventDate = type === 'webinar' ? publishedAt : null;
				} else {
					type = 'article';
					section = inferArticleSection(`${title} ${slug}`);
				}

				const existing = await sql`
					SELECT id, cover_image_id
					FROM posts
					WHERE slug = ${slug}
					LIMIT 1
				`;
				if (existing.length > 0 && mode === 'skip') {
					okCount += 1;
					processed += 1;
					return;
				}

				// Fetch markdown and thumbnail bytes (parallel).
				const [mdRes, imgRes] = await Promise.all([
					fetchWithRetry(contentUrl, { timeoutMs: 45000, retries: 3 }),
					reuploadImages || existing.length === 0
						? fetchWithRetry(thumbnailUrl, { timeoutMs: 60000, retries: 3 })
						: Promise.resolve(null)
				]);

				const markdown = mdRes ? await mdRes.text() : '';
				if (!markdown.trim()) {
					throw new Error(`Empty markdown from ${contentUrl}`);
				}

				let coverImageId = existing.length > 0 ? existing[0].cover_image_id : null;
				let uploadedBlob = null;
				let assetPathname = null;
				let assetFilename = null;
				let assetSize = null;
				let assetMimeType = null;
				let assetWidth = null;
				let assetHeight = null;

				if (imgRes) {
					const contentType = imgRes.headers.get('content-type') || '';
					const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
					if (imgBytes.length === 0) {
						throw new Error(`Empty image from ${thumbnailUrl}`);
					}

					let width = null;
					let height = null;
					if (contentType.toLowerCase().startsWith('image/')) {
						try {
							const dim = imageSize(imgBytes);
							width = dim.width ?? null;
							height = dim.height ?? null;
						} catch {
							// Best-effort only.
						}
					}

					const srcName = filenameFromUrl(thumbnailUrl);
					const inferredExt = extFromMime(contentType) || path.extname(stripQuery(srcName)) || '';
					const safeName = `${slug}${inferredExt && inferredExt.length <= 10 ? inferredExt : ''}`;
					const blobKey = toBlobKey(safeName, {
						isProduction,
						prefixOverride: blobPrefixOverride
					});

					if (!dryRun) {
						uploadedBlob = await put(blobKey, imgBytes, {
							access: 'public',
							addRandomSuffix: false,
							contentType: contentType || undefined,
							token: blobToken
						});

						const storedPathname =
							uploadedBlob.pathname ?? new URL(uploadedBlob.url).pathname.replace(/^\//, '');
						assetPathname = storedPathname;
						assetFilename = path.posix.basename(storedPathname);
						assetSize = imgBytes.length;
						assetMimeType = contentType || null;
						assetWidth = width;
						assetHeight = height;
					}
				}

				if (!dryRun) {
					// Use a transaction for DB writes so tags + joins are consistent.
					// If anything fails after a blob upload, try to clean up the blob.
					try {
						await sql.begin(async (tx) => {
							let finalCoverImageId = coverImageId;
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
									${createdAt ?? publishedAt},
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
								finalCoverImageId = assetRows[0]?.id ?? finalCoverImageId;
							}

							if (!finalCoverImageId) {
								throw new Error('Unable to resolve coverImageId');
							}

							const postRows = await tx`
							INSERT INTO posts (
								title,
								slug,
								excerpt,
								content,
								cover_image_id,
								section,
								type,
								status,
								is_featured,
								event_date,
								external_link,
								published_at,
								created_at,
								updated_at,
								created_by,
								updated_by
							)
							VALUES (
								${title},
								${slug},
								${description},
								${markdown},
								${finalCoverImageId},
								${section}::post_section,
								${type}::post_type,
								'published'::content_status,
								false,
								${eventDate},
								NULL,
								${publishedAt},
								${createdAt ?? publishedAt},
								now(),
								NULL,
								NULL
							)
							ON CONFLICT (slug) DO UPDATE
							SET
								title = EXCLUDED.title,
								excerpt = EXCLUDED.excerpt,
								content = EXCLUDED.content,
								cover_image_id = EXCLUDED.cover_image_id,
								section = EXCLUDED.section,
								type = EXCLUDED.type,
								status = EXCLUDED.status,
								is_featured = EXCLUDED.is_featured,
								event_date = EXCLUDED.event_date,
								external_link = EXCLUDED.external_link,
								published_at = EXCLUDED.published_at,
								updated_at = now()
							RETURNING id
						`;

							const postId = postRows[0].id;

							// Replace tag relations to keep reruns deterministic.
							await tx`DELETE FROM post_tags WHERE post_id = ${postId}`;

							const tagNames = bestEffortParseTags(rawTags);
							/** @type {string[]} */
							const tagIds = [];
							for (const rawName of tagNames) {
								const name = clampTagName(String(rawName));
								const tagSlug = slugifyTag(name);
								if (!tagSlug) continue;

								let inserted;
								try {
									inserted = await tx`
									INSERT INTO tags (name, slug, description, created_at, updated_at, created_by, updated_by)
									VALUES (${name}, ${tagSlug}, NULL, now(), NULL, NULL, NULL)
									ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
									RETURNING id
								`;
								} catch {
									// Handle unique(name) conflicts by selecting existing.
									const existingTag = await tx`SELECT id FROM tags WHERE name = ${name} LIMIT 1`;
									inserted = existingTag;
								}
								if (inserted?.[0]?.id) tagIds.push(inserted[0].id);
							}

							if (tagIds.length > 0) {
								// Insert join rows one-by-one to avoid Postgres unnest(unknown) ambiguity.
								const uniqueTagIds = Array.from(new Set(tagIds));
								for (const tagId of uniqueTagIds) {
									await tx`
									INSERT INTO post_tags (post_id, tag_id, display_order)
									VALUES (${postId}, ${tagId}::uuid, NULL)
									ON CONFLICT DO NOTHING
								`;
								}
							}
						});
					} catch (txErr) {
						if (uploadedBlob?.url) {
							try {
								await del(uploadedBlob.url, { token: blobToken });
							} catch {
								// Best-effort cleanup only.
							}
						}
						throw txErr;
					}
				}

				okCount += 1;
				processed += 1;
				if (processed % 10 === 0) {
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
