import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { optionalVerifyJWT } from "../middlewares/optionalAuth.middleware.js";
import { createTweet, getUserTweets, getTweetById, deleteTweet, updateTweet } from "../controllers/tweet.controller.js";

const router = Router()

router.route("/").post(verifyJWT, upload.array("images",4), createTweet)
router.route("/:userId").get(optionalVerifyJWT, getUserTweets)
router.route("/t/:tweetId").get(optionalVerifyJWT, getTweetById)
router.route("/:tweetId").delete(verifyJWT, deleteTweet).patch(verifyJWT,upload.array("images",4), updateTweet)

export default router