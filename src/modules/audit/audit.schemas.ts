import { z } from 'zod';
import { User } from '#src/modules/drizzle/drizzle.types';

export const AuditMetadata = z.object({
  createdBy: User.pick({ id: true, name: true, email: true }).nullable().meta({
    description: 'User pembuat',
  }),
  updatedBy: User.pick({ id: true, name: true, email: true }).nullable().meta({
    description: 'User pengubah terakhir',
  }),
});
export type AuditMetadata = z.infer<typeof AuditMetadata>;
