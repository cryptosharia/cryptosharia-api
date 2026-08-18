import { z } from 'zod';
import { AssetMetadata } from '#src/modules/assets/assets.schemas';
import { AuditMetadata } from '#src/modules/audit/audit.schemas';
import { Tag, Token } from '#src/modules/drizzle/drizzle.types';

export const TokenTagItem = Tag.pick({ id: true, name: true, slug: true });
export type TokenTagItem = z.infer<typeof TokenTagItem>;

export const TokenTagDetail = Tag.pick({
  id: true,
  name: true,
  slug: true,
  description: true,
});
export type TokenTagDetail = z.infer<typeof TokenTagDetail>;

export const TokenQuote = z.object({
  slug: z.string(),
  rank: z.number().int(),
  infiniteSupply: z.boolean(),
  maxSupply: z.number().nullable(),
  circulatingSupply: z.number(),
  priceUsd: z.number(),
  marketCapUsd: z.number(),
  marketCapDominance: z.number(),
  percentChange24h: z.number(),
});
export type TokenQuote = z.infer<typeof TokenQuote>;

export const TokenListItem = Token.omit({
  content: true,
  logoId: true,
  createdBy: true,
  updatedBy: true,
})
  .extend({
    logo: AssetMetadata.nullable(),
    tags: z.array(TokenTagItem),
    quote: TokenQuote.nullable().optional(),
  })
  .extend(AuditMetadata.shape);
export type TokenListItem = z.infer<typeof TokenListItem>;

export const TokenDetail = Token.omit({
  logoId: true,
  createdBy: true,
  updatedBy: true,
})
  .extend({
    logo: AssetMetadata.nullable(),
    tags: z.array(TokenTagDetail),
    quote: TokenQuote.nullable().optional(),
  })
  .extend(AuditMetadata.shape);
export type TokenDetail = z.infer<typeof TokenDetail>;

export const TokenIdentifier = z
  .union([Token.shape.id, Token.shape.slug])
  .meta({ description: 'ID atau slug cryptoasset', example: 'bitcoin' });

export const TokenParam = z.object({ identifier: TokenIdentifier });
export type TokenParam = z.infer<typeof TokenParam>;

export const TokenIdParam = z.object({
  id: Token.shape.id.meta({ description: 'ID cryptoasset' }),
});
export type TokenIdParam = z.infer<typeof TokenIdParam>;

export const quoteFlag = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean().default(false).meta({
    description: 'Sertakan data pasar',
  }),
);

export const TokenQuoteQuery = z.object({ quote: quoteFlag });
export type TokenQuoteQuery = z.infer<typeof TokenQuoteQuery>;

export const TokensQuery = z.object({
  page: z.coerce
    .number()
    .int('Harus berupa bilangan bulat')
    .min(1, 'Minimal 1')
    .default(1)
    .meta({ description: 'Halaman' }),
  limit: z.coerce
    .number()
    .int('Harus berupa bilangan bulat')
    .min(1, 'Minimal 1')
    .max(100, 'Maksimal 100')
    .default(20)
    .meta({ description: 'Item per halaman' }),
  search: z.string().trim().max(255, 'Maksimal 255 karakter').optional().meta({
    description: 'Cari berdasarkan nama, ticker, slug, ringkasan, atau konten',
    example: 'bitcoin',
  }),
  quote: quoteFlag,
  statuses: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Token.shape.status).optional().meta({
      description: 'Filter berdasarkan status publikasi',
    }),
  ),
  shariaStatuses: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Token.shape.shariaStatus).optional().meta({
      description: 'Filter berdasarkan status syariah',
    }),
  ),
  slugs: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Token.shape.slug).optional().meta({
      description: 'Filter berdasarkan slug token',
    }),
  ),
  exclude: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Token.shape.slug).optional().meta({
      description: 'Kecualikan slug tertentu',
    }),
  ),
  tags: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(z.string().trim().min(1, 'Tidak boleh kosong')).optional().meta({
      description: 'Filter berdasarkan slug tag',
    }),
  ),
});
export type TokensQuery = z.infer<typeof TokensQuery>;

export const TokenWriteTags = z
  .array(z.union([Tag.shape.id, Tag.shape.slug]))
  .max(50, 'Maksimal 50 tag');

export const TokenCreateBody = Token.pick({
  slug: true,
  rank: true,
  name: true,
  ticker: true,
  shariaStatus: true,
  status: true,
  excerpt: true,
  tradingviewSymbol: true,
  website: true,
  logoId: true,
  content: true,
}).extend({
  tags: TokenWriteTags,
});
export type TokenCreateBody = z.infer<typeof TokenCreateBody>;

export const TokenUpdateBody = TokenCreateBody.partial().refine(
  (value) => Object.keys(value).length > 0,
  { error: 'Minimal satu field wajib diisi' },
);
export type TokenUpdateBody = z.infer<typeof TokenUpdateBody>;
