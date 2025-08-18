import { JsonWebTokenError } from "jsonwebtoken";
import ApiError from "../utils/ApiError";
import asyncHandler from "../utils/asynchandler";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models";

export const verifyJWT = asyncHandler(async(req, res , next) => {

    try {

        const token  = req.cookies?.accessToken || req.headers("authorization")?.replace("Bearer ","")

        if(!token ){
            throw new ApiError(400, "unauthorized Request")
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