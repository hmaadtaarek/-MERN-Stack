import asyncHandler from "../utils/asynchandler.js";

const registerUser = asyncHandler( async(req, res)=>{
    res.status(600).json({success: true, message: "User Registered Successfully"})
})

export {registerUser}