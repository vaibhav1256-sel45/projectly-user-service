import { ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { type ClientProxy } from "@nestjs/microservices";
import { AuthClient } from "./auth/auth-client.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { SignupDto } from "./dto/signup.dto.js";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "./schemas/user.schema.js";
import { Model } from "mongoose";
import bcrypt from 'bcrypt'
import { RedisService } from './redis/redis.service.js';
import { randomInt } from 'crypto';
import { lastValueFrom } from 'rxjs';
import { ListUsersQueryDto } from "./dto/list.users.query.dto.js";

const OTP_TTL_SECONDS = 5 * 60;
@Injectable()
export class UserService{
  private commonService:any;
  constructor(private readonly authClient:AuthClient,
              @InjectModel(User.name) private readonly userModel:Model<User>,
              @Inject('MAIL') private readonly mailClient:ClientProxy,
              private readonly redisService:RedisService){}
   private async deleteUploadedImage(key?:string){
     if(!key) return
     try{
       await lastValueFrom(this.commonService.deleteObject({key}))
     }catch{
       // best effort: never hide the original signup error
     }
   }

   async register(body:SignupDto){
     let user
     try{
       const existing=await this.userModel.exists({email:body.email.toLowerCase()})
       if(existing){
         throw new ConflictException('Email already registered')
       }
       user=await this.userModel.create({...body})
     }catch(error){
       // signup failed, so the image uploaded for it is orphaned
       await this.deleteUploadedImage(body.profileKey)
       throw error
     }
     return {message:'User Registered SuccessFully',userId:user._id}
   }

   async login(body:LoginDto){
   const user= await this.userModel.findOne({email:body.email}).select('+password')
   if(!user){
    throw new UnauthorizedException('Invalid Email or Password')
           }
 const validPassword = await bcrypt.compare(body.password,user.password)
 if(!validPassword){
    throw new UnauthorizedException('Invalid Email or Password')
           }
     await this.sendOtp(user.email,user.name)

     return {message:'Otp Sended SuccessFully'}
    }

   async sendOtp(email:string,name:string){
     const otp=randomInt(100000,1000000).toString()
     await this.redisService.set(`otp:${email}`,otp,OTP_TTL_SECONDS)
     // common-service sends the email when it receives this event
     try{
       await lastValueFrom(this.mailClient.emit('mail.otp',{email,name,otp,expiresInMinutes:OTP_TTL_SECONDS/60}),{defaultValue:undefined})
     }catch{
       throw new ServiceUnavailableException('Could not send the verification code, please try again')
     }
   }

   async logout(userId:string){
     return this.authClient.logout(userId)
   }

   async verifyOtp(email:string,otp:string){
     const stored=await this.redisService.get(`otp:${email}`)
     if(!stored || stored!==otp){
       throw new UnauthorizedException('Invalid or expired OTP')
     }
     await this.redisService.del(`otp:${email}`)
     const user=await this.userModel.findOne({email})
     if(!user){
       throw new NotFoundException('User not found')
     }
     const {access_token,refresh_token}=await this.authClient.generateToken({_id:user._id.toString(),name:user.name})
     return {message:'Otp Verified SuccessFully',data:{
        access_token:access_token,refresh_token:refresh_token
     }}
   }

 async getMe(userId: string) {
  const user = await this.userModel.findById(userId).select('_id name email profileKey');
  return { message: 'User fetched successfully', data: user };
}

 async getUsers(query: ListUsersQueryDto, userId: string) {
  const { searchKey, pageNo, limit } = query;

  // the logged-in user is never part of the list
  const filters: any = { _id: { $ne: userId } };

  if (searchKey) {
    const pattern = new RegExp(
      searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );

    filters.$or = [
      { name: pattern },
      { email: pattern },
    ];
  }

  const page = Math.max(Number(pageNo) || 1, 1);
  const lmt = Math.max(Number(limit) || 10, 1);
  const skip = (page - 1) * lmt;

  const [users, total] = await Promise.all([
    this.userModel
      .find(filters)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lmt)
      .exec(),

    this.userModel.countDocuments(filters).exec(),
  ]);

  return {
    message: 'Users fetched successfully',
    data: users,
    meta: {
      pageNo: page,
      limit: lmt,
      totalDocuments: total,
      totalPages: Math.ceil(total / lmt),
    },
  };
}


async getUsersByIds(ids: string[]) {
  if (!ids?.length) {
    return [];
  }

 const users= await this.userModel
    .find({
      _id: { $in: ids },
    })
    .select('_id name email profileKey')
    .lean()
    .exec();

  return {users:users}
}
}