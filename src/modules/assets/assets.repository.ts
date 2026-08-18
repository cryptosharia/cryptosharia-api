import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import {
  assets,
  cryptoassets,
  imgbbImages,
  posts,
  users,
} from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type { Asset, ImgbbImage } from '#src/modules/drizzle/drizzle.types';

@Injectable()
export class AssetsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async insertAsset(
    data: Pick<
      Asset,
      | 'pathname'
      | 'filename'
      | 'size'
      | 'mimeType'
      | 'width'
      | 'height'
      | 'provider'
      | 'createdBy'
    >,
  ): Promise<Asset> {
    const [asset] = await this.drizzleService.db
      .insert(assets)
      .values(data)
      .returning();

    return asset;
  }

  async upsertImgbbImage(
    data: Pick<
      ImgbbImage,
      | 'imgbbId'
      | 'title'
      | 'url'
      | 'width'
      | 'height'
      | 'size'
      | 'fileName'
      | 'mimeType'
      | 'deleteUrl'
      | 'createdBy'
    >,
  ): Promise<ImgbbImage> {
    const [image] = await this.drizzleService.db
      .insert(imgbbImages)
      .values(data)
      // ImgBB may return an existing identifier; keep metadata persistence idempotent.
      .onConflictDoUpdate({
        target: imgbbImages.imgbbId,
        set: data,
      })
      .returning();

    return image;
  }

  selectCleanupCandidates(input: { cutoff: Date; limit: number }) {
    // A left join keeps only assets with no remaining user, post, or cryptoasset reference.
    return this.drizzleService.db
      .select({ id: assets.id, pathname: assets.pathname })
      .from(assets)
      .leftJoin(posts, eq(posts.coverImageId, assets.id))
      .leftJoin(cryptoassets, eq(cryptoassets.logoId, assets.id))
      .leftJoin(users, eq(users.avatarId, assets.id))
      .where(
        and(
          eq(assets.provider, 'vercel_blob'),
          lte(assets.createdAt, input.cutoff),
          isNull(posts.id),
          isNull(cryptoassets.id),
          isNull(users.id),
        ),
      )
      .orderBy(asc(assets.createdAt), asc(assets.id))
      .limit(input.limit);
  }

  async deleteAsset(id: Asset['id']): Promise<void> {
    await this.drizzleService.db.delete(assets).where(eq(assets.id, id));
  }
}
