import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { getClientIp } from '#src/common/get-client-ip';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import { CurrentUser } from '#src/modules/security/current-user.decorator';
import { AuthenticationGuard } from '#src/modules/security/authentication.guard';
import { ExcludeSensitiveFieldsInterceptor } from '#src/modules/users/exclude-sensitive-fields.interceptor';
import { AuthExceptionFilter } from './auth.exception-filter';
import {
  ForgotPasswordBody,
  RefreshBody,
  ResetPasswordBody,
  SigninBody,
  SignoutBody,
  SignupBody,
  VerifyBody,
} from './auth.schemas';
import { AuthService } from './auth.service';

@Controller('auth')
@UseFilters(AuthExceptionFilter)
@UseInterceptors(ExcludeSensitiveFieldsInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(
    @Body(new ParseZodPipe(SignupBody)) body: SignupBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.signup({
      ...body,
      ipAddress: getClientIp(request),
    });
  }

  @Post('verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  verify(
    @Body(new ParseZodPipe(VerifyBody)) body: VerifyBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.verify({
      ...body,
      ipAddress: getClientIp(request),
    });
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  signin(
    @Body(new ParseZodPipe(SigninBody)) body: SigninBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.signin({
      ...body,
      ipAddress: getClientIp(request),
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body(new ParseZodPipe(RefreshBody)) body: RefreshBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.refresh({
      ...body,
      ipAddress: getClientIp(request),
    });
  }

  @Post('signout')
  @HttpCode(HttpStatus.NO_CONTENT)
  signout(
    @Body(new ParseZodPipe(SignoutBody)) body: SignoutBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.signout({
      ...body,
      ipAddress: getClientIp(request),
    });
  }

  @Get('me')
  @UseGuards(AuthenticationGuard)
  me(@CurrentUser() currentUser: CurrentUser) {
    return this.authService.me(currentUser.id);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(
    @Body(new ParseZodPipe(ForgotPasswordBody)) body: ForgotPasswordBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.forgotPassword({
      ...body,
      ipAddress: getClientIp(request),
    });
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(
    @Body(new ParseZodPipe(ResetPasswordBody)) body: ResetPasswordBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.resetPassword({
      ...body,
      ipAddress: getClientIp(request),
    });
  }
}
