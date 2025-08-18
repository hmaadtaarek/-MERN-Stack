
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asynchandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async(req, res , next) => {

    try {
        

        const token  = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")

        if(!token ){
            throw new ApiError(400, "Unauthorized request. No token provided.")
        }
        const decoded  = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        if(!decoded){
            throw new ApiError(401, "Invalid Token")
        }

        const user = await User.findById(decoded._id).select("-password -refreshToken")

        req.user = user
        next()
        
        
    } catch (error) {

        throw new ApiError(400, error?.message || "invalid token ")
    }
})