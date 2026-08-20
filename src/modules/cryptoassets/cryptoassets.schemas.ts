import { z } from 'zod';
import { AssetMetadata } from '#src/modules/assets/assets.schemas';
import { AuditMetadata } from '#src/modules/audit/audit.schemas';
import { Cryptoasset, Tag } from '#src/modules/drizzle/drizzle.types';

export const CryptoassetTagItem = Tag.pick({
  id: true,
  name: true,
  slug: true,
});
export type CryptoassetTagItem = z.infer<typeof CryptoassetTagItem>;

export const CryptoassetTagDetail = Tag.pick({
  id: true,
  name: true,
  slug: true,
  description: true,
});
export type CryptoassetTagDetail = z.infer<typeof CryptoassetTagDetail>;

export const CryptoassetQuote = z.object({
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
export type CryptoassetQuote = z.infer<typeof CryptoassetQuote>;

export const CryptoassetListItem = Cryptoasset.omit({
  content: true,
  logoId: true,
  createdBy: true,
  updatedBy: true,
})
  .extend({
    logo: AssetMetadata.nullable(),
    tags: z.array(CryptoassetTagItem),
    quote: CryptoassetQuote.nullable().optional(),
  })
  .extend(AuditMetadata.shape);
export type CryptoassetListItem = z.infer<typeof CryptoassetListItem>;

export const CryptoassetDetail = Cryptoasset.omit({
  logoId: true,
  createdBy: true,
  updatedBy: true,
})
  .extend({
    logo: AssetMetadata.nullable(),
    tags: z.array(CryptoassetTagDetail),
    quote: CryptoassetQuote.nullable().optional(),
  })
  .extend(AuditMetadata.shape);
export type CryptoassetDetail = z.infer<typeof CryptoassetDetail>;

export const CryptoassetIdentifier = z
  .union([Cryptoasset.shape.id, Cryptoasset.shape.slug])
  .meta({ description: 'ID atau slug cryptoasset', example: 'bitcoin' });

export const CryptoassetParam = z.object({ identifier: CryptoassetIdentifier });
export type CryptoassetParam = z.infer<typeof CryptoassetParam>;

export const CryptoassetIdParam = z.object({
  id: Cryptoasset.shape.id.meta({ description: 'ID cryptoasset' }),
});
export type CryptoassetIdParam = z.infer<typeof CryptoassetIdParam>;

export const quoteFlag = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean().default(false).meta({
    description: 'Sertakan data pasar',
  }),
);

export const CryptoassetQuoteQuery = z.object({ quote: quoteFlag });
export type CryptoassetQuoteQuery = z.infer<typeof CryptoassetQuoteQuery>;

export const CryptoassetsQuery = z.object({
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
    z.array(Cryptoasset.shape.status).optional().meta({
      description: 'Filter berdasarkan status publikasi',
    }),
  ),
  shariaStatuses: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Cryptoasset.shape.shariaStatus).optional().meta({
      description: 'Filter berdasarkan status syariah',
    }),
  ),
  slugs: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Cryptoasset.shape.slug).optional().meta({
      description: 'Filter berdasarkan slug cryptoasset',
    }),
  ),
  exclude: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Cryptoasset.shape.slug).optional().meta({
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
export type CryptoassetsQuery = z.infer<typeof CryptoassetsQuery>;

export const CryptoassetWriteTags = z
  .array(z.union([Tag.shape.id, Tag.shape.slug]))
  .max(50, 'Maksimal 50 tag');

export const CryptoassetCreateBody = Cryptoasset.pick({
  slug: true,
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
  tags: CryptoassetWriteTags,
});
export type CryptoassetCreateBody = z.infer<typeof CryptoassetCreateBody>;

export const CryptoassetUpdateBody = CryptoassetCreateBody.partial().refine(
  (value) => Object.keys(value).length > 0,
  { error: 'Minimal satu field wajib diisi' },
);
export type CryptoassetUpdateBody = z.infer<typeof CryptoassetUpdateBody>;
