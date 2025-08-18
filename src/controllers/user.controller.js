import asyncHandler from '../utils/asynchandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { User } from '../models/user.models.js';
import uploadOnCloudinary from '../utils/claudinary.js';
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})
        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while generating tokens")
    }
}

const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
const registerUser = asyncHandler(async (req, res) => {
  /* 
   1.get user details from frontend
   2.check if any feilds empty.
   3.check for email validation.
   4.check if the user already exists based on username & email.
   5.check for the images in data. 
   6.check for the required avatar.
   7.upload them to cloudinary.
   8.generate a user object in the database.
   9.remove the password and refresh token from the database response.
   10. return the response with proper handling.
   */

  //  get user details from frontend
  console.log(req.body);
  const { fullName, email, password, username } = req.body;

  //  check if any feilds empty.
  if (
    [fullName, email, password, username].some(
      (feild) => !feild || feild.trim() === ''
    )
  ) {
    throw new ApiError(400, 'Feilds are missing! Dont submit empty feilds .');
  }
  // check for email validation.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Email format is not correct!');
  }

  // check if the user already exists based on username & email.
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, 'User Already Registered! Try to login instead :)');
  }
  

  // check for the images in data
     let avatarLocalFile;
     if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0 ){
      avatarLocalFile = req.files.avatar[0].path
     }
     

     let coverImageLocalFile;
     if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
      coverImageLocalFile = req.files.coverImage[0].path
     }
  // check for the required avatar.
  if (!avatarLocalFile) {
    throw new ApiError(400, 'Avatar in required!');
  }
  // upload them to cloudinary.
  const avatarCloudinary = await uploadOnCloudinary(avatarLocalFile);
  const coverImageCloudinary = await uploadOnCloudinary(coverImageLocalFile);

  if (!avatarCloudinary) {
    throw new ApiError(
      400,
      'Avatar is not availble from cloudinary! It is required!'
    );
  }
  // generate a user object in the database

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    avatar: avatarCloudinary.url,
    coverImage: coverImageCloudinary?.url || '',
    password,
  });

  // remove the password and refresh token from the database response.
  const createdUser = await User.findById(user._id).select('-password -refreshToken');

  if (!createdUser) {
    throw new ApiError(500, 'OOPS! Error Occured while registering user.');
  }
  // return the response with proper handling.

  res
    .status(200)
    .json(new ApiResponse(200, createdUser, 'User created Successfully'));
});

const loginUser = asyncHandler(async(req , res) =>{
    /*
    get username or email from frontend req.body
    check  if the username or email exists in database
    if matched decrpt the password and check if it maches the passord in database
    generate refresh & access token 
    send the token through cookies
    return the user object
    */

// get username or email from frontend req.body

    const {username , email , password} = req.body

    if (!(username || email)){
        throw new ApiError(400, "Username or email is required.")
    }

// check  if the username or email exists in database
    const user =  await User.findOne({
        $or: [{username} , {email}]
    })
    if(!user){
        throw new ApiError(404, "Username or Email is not registered.")
    }
// if matched decrpt the password and check if it maches the passord in database
    const validPassword = await user.isPasswordCorrect(password)
    if(!validPassword){
        throw new ApiError( 401, "invalid Password.")
    }
//  generate refresh & access token 

    const {accessToken, refreshToken}= await generateAccessAndRefreshToken(user._id)

    const LoggedInUser = await User.findById(user._id).select("-password -refreshToken")

    

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
        200,
        {user:LoggedInUser},
        "user logged In seccessfully."

    ))


})

const logoutUser = asyncHandler(async(req , res) =>{
    // get user by id from the middle ware using req.user
    // remove the refresh token from the database
    // remove the refresh token from the cookies
    // return the response

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200 , {}, "User Logout Successfully")
    )


})

const refreshAccessToken = asyncHandler(async(req, res) => {
    /*
    get the referesh token from cookie , 
    verify this with jwt verify
    find user by this ,if user found
    match the decoded token with original referes token 
    if matched , then regerate this using the method 
    then send response.
    */

    const incomingToken =  req.cookies?.refreshToken || req.body?.refreshToken

    if(!incomingToken){
        throw new ApiError( 400, "unauthrized request")
    }

    const decodedToken =  jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET)

    if(!decodedToken){
        throw new ApiError(400, "invalid token")
    }

    const user = await User.findById(decodedToken?._id)

    if(!user){
        throw new ApiError(401, "invalid referesh token")
    }
    if(incomingToken !== user.refreshToken){
        throw new ApiError(401, "Refresh token is either expired or used.")
    }

    const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id)

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access Token Refreshed!"))

})

export { registerUser, loginUser, logoutUser, refreshAccessToken };
