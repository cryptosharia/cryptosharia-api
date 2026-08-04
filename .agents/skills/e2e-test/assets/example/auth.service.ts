import type { Context } from './context.type';
import type { paths } from '#test/schema';

type SignUpBody = NonNullable<
  paths['/auth/signup']['post']['requestBody']
>['content']['application/json'];
type SignInBody = NonNullable<
  paths['/auth/signin']['post']['requestBody']
>['content']['application/json'];

export class AuthService {
  constructor(private readonly ctx: Context) {}

  signUp(payload: SignUpBody) {
    return this.ctx.client.POST('/auth/signup', { body: payload });
  }

  signIn(payload: SignInBody) {
    return this.ctx.client.POST('/auth/signin', { body: payload });
  }
}
