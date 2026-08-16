import { z } from 'zod';
import { Message } from '#src/modules/drizzle/drizzle.types';

export const MessageResponse = Message;
export type MessageResponse = z.infer<typeof MessageResponse>;

export const MessageCreateBody = Message.pick({
  name: true,
  email: true,
  message: true,
});
export type MessageCreateBody = z.infer<typeof MessageCreateBody>;

export const MessageIdParam = z.object({
  id: Message.shape.id,
});
export type MessageIdParam = z.infer<typeof MessageIdParam>;

export const MessagesQuery = z.object({
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
    description: 'Cari berdasarkan nama, email, atau isi pesan',
    example: 'sharia',
  }),
  senders: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z
      .array(z.email('Format tidak valid'))
      .optional()
      .meta({
        description: 'Filter berdasarkan email pengirim',
        example: ['john@example.com'],
      }),
  ),
});
export type MessagesQuery = z.infer<typeof MessagesQuery>;
