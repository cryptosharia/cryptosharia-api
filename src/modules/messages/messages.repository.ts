import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from 'drizzle-orm';
import { escapeLikePattern } from '#src/common/escape-like-pattern';
import { messages } from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type { Message } from '#src/modules/drizzle/drizzle.types';
import { MessagesError } from './messages.error';

@Injectable()
export class MessagesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async selectAll(input: {
    page: number;
    limit: number;
    search?: string;
    senders?: string[];
  }): Promise<Message[]> {
    const filters: SQL[] = [];
    if (input.senders?.length)
      filters.push(inArray(messages.email, input.senders));
    if (input.search) {
      const pattern = `%${escapeLikePattern(input.search)}%`;
      filters.push(
        or(
          ilike(messages.name, pattern),
          ilike(messages.email, pattern),
          ilike(messages.message, pattern),
        )!,
      );
    }
    const where = filters.length ? and(...filters) : undefined;
    return this.drizzleService.db
      .select()
      .from(messages)
      .where(where)
      .orderBy(desc(messages.createdAt))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
  }

  async count(input: {
    search?: string;
    senders?: Message['email'][];
  }): Promise<number> {
    const filters: SQL[] = [];
    if (input.senders?.length)
      filters.push(inArray(messages.email, input.senders));
    if (input.search) {
      const pattern = `%${escapeLikePattern(input.search)}%`;
      filters.push(
        or(
          ilike(messages.name, pattern),
          ilike(messages.email, pattern),
          ilike(messages.message, pattern),
        )!,
      );
    }
    const where = filters.length ? and(...filters) : undefined;
    const [result] = await this.drizzleService.db
      .select({ value: count() })
      .from(messages)
      .where(where);
    return result.value;
  }

  async selectById(id: Message['id']): Promise<Message> {
    const [message] = await this.drizzleService.db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    if (!message) throw new MessagesError('MESSAGE_NOT_FOUND');
    return message;
  }

  async insert(
    data: Pick<Message, 'name' | 'email' | 'message'>,
  ): Promise<Message> {
    const [message] = await this.drizzleService.db
      .insert(messages)
      .values(data)
      .returning();
    return message;
  }
}
