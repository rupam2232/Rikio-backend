import { Router } from 'express';
import {
    getVideoComments,
    getTweetComments,
    getReplyComments,
    addVideoComment,
    addTweetComment,
    addReplyComment,
    updateComment,
    deleteComment
} from "../controllers/comment.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { optionalVerifyJWT } from '../middlewares/optionalAuth.middleware.js';

const router = Router();

router.route("/v/:videoId").get(optionalVerifyJWT, getVideoComments).post(verifyJWT, addVideoComment);
router.route("/t/:tweetId").get(optionalVerifyJWT, getTweetComments).post(verifyJWT, addTweetComment);
router.route("/r/:parentCommentId").get(optionalVerifyJWT, getReplyComments)
router.route("/r/:parentCommentId/:replyingTo").post(verifyJWT, addReplyComment);
router.route("/c/:commentId").delete(verifyJWT, deleteComment).patch(verifyJWT, updateComment);

export default router