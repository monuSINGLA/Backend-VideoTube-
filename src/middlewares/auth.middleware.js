import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async(req, _, next) => {
   
   
   try {
      const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "" )

      // console.log(token);
    if (!token) {
     throw new ApiError(401, "Unauthorized token")
    }
    const decodedTokenInformation = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
   //  console.log(decodedTokenInformation);
 
    const user = await User.findById(decodedTokenInformation?._id).select("-password -refreshToken")
 
    if(!user){
     throw new ApiError(401, "Invalid Access Token")
    }
    
    req.user = user;
   
    
    next()
   } catch (error) {
    throw new ApiError(401, error?.message || "Invaild Access Token")
   }
})