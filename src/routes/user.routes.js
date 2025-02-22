import { Router } from "express";
import {
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    pushVideoToWatchHistory, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage,
    checkIfUsernameIsAvl,
    checkIfEmailIsAvl,
    addSocials
} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { optionalVerifyJWT } from "../middlewares/optionalAuth.middleware.js";
import  verifyOtp  from "../middlewares/verifyOtp.middleware.js";

const router = Router()

router.route("/register").post(verifyOtp, registerUser)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/update-account").patch(verifyJWT, updateAccountDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/c/:username").get(optionalVerifyJWT , getUserChannelProfile)

router.route("/history").get(verifyJWT, getWatchHistory)

router.route("/add-history").post(verifyJWT, pushVideoToWatchHistory)

router.route("/check-username/:username").get(optionalVerifyJWT, checkIfUsernameIsAvl)

router.route("/check-email/:email").get(optionalVerifyJWT, checkIfEmailIsAvl)

router.route("/add-socials").post(verifyJWT, addSocials)

export default router