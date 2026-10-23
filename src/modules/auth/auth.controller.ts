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
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { getClientIp } from '#src/common/get-client-ip';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import { AuthenticationGuard } from '#src/modules/security/authentication.guard';
import { CurrentUser } from '#src/modules/security/current-user.decorator';
import { AuthExceptionFilter } from './auth.exception-filter';
import {
  PasswordLoginBody,
  PasswordResetBody,
  PasswordResetRequestBody,
  PasswordSetBody,
  OtpRequestBody,
  OtpVerifyBody,
  RefreshBody,
  SignoutBody,
} from './auth.schemas';
import { AuthService } from './auth.service';

@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.NO_CONTENT)
  requestOtp(
    @Body(new ParseZodPipe(OtpRequestBody)) body: OtpRequestBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.requestOtp({
      email: body.email,
      ipAddress: getClientIp(request),
    });
  }

  @Post('password/login')
  @HttpCode(HttpStatus.OK)
  loginWithPassword(
    @Body(new ParseZodPipe(PasswordLoginBody)) body: PasswordLoginBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.loginWithPassword({
      email: body.email,
      password: body.password,
      ipAddress: getClientIp(request),
    });
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  requestPasswordReset(
    @Body(new ParseZodPipe(PasswordResetRequestBody))
    body: PasswordResetRequestBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.requestPasswordReset({
      email: body.email,
      application: body.application,
      ipAddress: getClientIp(request),
    });
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(
    @Body(new ParseZodPipe(PasswordResetBody)) body: PasswordResetBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.resetPassword({
      token: body.token,
      newPassword: body.newPassword,
      ipAddress: getClientIp(request),
    });
  }

  @Post('password/set')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthenticationGuard)
  setPassword(
    @CurrentUser() currentUser: CurrentUser,
    @Body(new ParseZodPipe(PasswordSetBody)) body: PasswordSetBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.setPassword({
      userId: currentUser.id,
      otpCode: body.otpCode,
      newPassword: body.newPassword,
      ipAddress: getClientIp(request),
    });
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyOtp(
    @Body(new ParseZodPipe(OtpVerifyBody)) body: OtpVerifyBody,
    @Req() request: FastifyRequest,
  ) {
    return this.authService.verifyOtp({
      email: body.email,
      code: body.code,
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
      refreshToken: body.refreshToken,
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
      refreshToken: body.refreshToken,
      ipAddress: getClientIp(request),
    });
  }

  @Post('signout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthenticationGuard)
  signoutAll(@CurrentUser() currentUser: CurrentUser) {
    return this.authService.signoutAll(currentUser.id);
  }

  @Get('me')
  @UseGuards(AuthenticationGuard)
  me(@CurrentUser() currentUser: CurrentUser) {
    return this.authService.me(currentUser.id);
  }
}
