import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const optionalVerifyJWT = asyncHandler( async( req, _, next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if(!token){
            req.user = null;
            return next();
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user) throw new ApiError(401,"Invalid Access Token")
    
        req.user = user;
        next();
    } catch (error) {
        if (error.message !== "Invalid Access Token" && error.message !== "jwt expired" && error.message !== "jwt must be provided") {
            throw new ApiError(401, error?.message || "Invalid Access Token");
        } else {
            req.user = null;
            next();
        }
    }
})