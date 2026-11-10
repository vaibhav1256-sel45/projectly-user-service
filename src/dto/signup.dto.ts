import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address (must be unique)' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password@123', minLength: 8, description: 'Password, minimum 8 characters' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'profiles/john.png', description: 'Storage key of the profile image' })
  @IsOptional()
  @IsString()
  profileKey?: string;
}
