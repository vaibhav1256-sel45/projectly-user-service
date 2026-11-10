import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email the OTP was sent to' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP received by email' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp!: string;
}
