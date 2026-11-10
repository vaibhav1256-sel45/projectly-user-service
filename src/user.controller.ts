import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "./guards/auth.guard.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import { UserService } from "./user.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { SignupDto } from "./dto/signup.dto.js";
import { VerifyOtpDto } from "./dto/verify-otp.dto.js";
import { ListUsersQueryDto } from "./dto/list.users.query.dto.js";
import { GrpcMethod } from "@nestjs/microservices";

@ApiTags('User')
@Controller('user')
export class UserController{
    constructor(private readonly userService:UserService){}

    @Post('register')
    @ApiOperation({ summary: 'Register user', description: 'Creates a new user account with a hashed password.' })
    @ApiResponse({ status: 201, description: 'User registered successfully', schema: { example: { message: 'User Registered SuccessFully', userId: '665f1c2e8a1b2c3d4e5f6a7b' } } })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    async register(@Body() body:SignupDto){
    return this.userService.register(body)
    }

    @Post('login')
    @HttpCode(200)
    @ApiOperation({ summary: 'Login user', description: 'Checks the credentials and emails a 6-digit OTP (valid for 5 minutes).' })
    @ApiResponse({ status: 200, description: 'OTP sent successfully', schema: { example: { message: 'Otp Sended SuccessFully' } } })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    @ApiResponse({ status: 401, description: 'Invalid email or password' })
    async login(@Body() body:LoginDto){
    const result=await this.userService.login(body)
    return result
    }

    @Post('verify-otp')
    @HttpCode(200)
    @ApiOperation({ summary: 'Verify OTP', description: 'Verifies the OTP sent to the user\'s email. The OTP can be used only once.' })
    @ApiResponse({ status: 200, description: 'OTP verified successfully', schema: { example: { message: 'Otp Verified SuccessFully' } } })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
    async verify(@Body() body:VerifyOtpDto){
    const result=await this.userService.verifyOtp(body.email,body.otp)
    return result
    }
    @Post('logout')
    @HttpCode(200)
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Logout', description: 'Ends the current session of the logged-in user.' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    @ApiResponse({ status: 401, description: 'Missing, invalid or revoked token' })
    async logout(@CurrentUser('id') userId:string){
    return this.userService.logout(userId)
    }

    @Get('me')
    @HttpCode(200)
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Get me', description: 'Details of the logged-in user: name, email and profile image key.' })
    @ApiResponse({ status: 200, description: 'User fetched successfully' })
    @ApiResponse({ status: 401, description: 'Missing, invalid or revoked token' })
    async getMe(@CurrentUser('id') userId:string){
    return this.userService.getMe(userId)
    }

    @Get('')
    @HttpCode(200)
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Get Users', description: 'Get all users except the logged-in one. Supports searchKey (name or email) and pagination.' })
    @ApiResponse({ status: 401, description: 'Missing, invalid or revoked token' })
    @ApiResponse({ status: 200, description: 'Users fetched successfully', schema: { example: { message: 'Users fetched successfully' } } })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    async getUser(@Query() query:ListUsersQueryDto,@CurrentUser('id') userId:string){
    const result=await this.userService.getUsers(query,userId)
    return result
    }
    @GrpcMethod('UserService','GetUsersByIds')
    async getUserByIds(data:{ids:string[]}){
     return await this.userService.getUsersByIds(data.ids)
    }
}
