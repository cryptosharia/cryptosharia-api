import { PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';

export class ParseZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}
  transform(value: unknown) {
    return this.schema.parse(value);
  }
}
