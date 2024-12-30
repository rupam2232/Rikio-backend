import { upload } from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { optionalVerifyJWT } from "../middlewares/optionalAuth.middleware.js"
import { Router } from "express"
import { getAllVideos, getVideoById, publishVideo, updateVideo, deleteVideo, togglePublishStatus } from "../controllers/video.controller.js"

const router = Router()

router
.route("/")
.get(optionalVerifyJWT, getAllVideos)
.post(verifyJWT, upload.fields([
    {
        name: "video",
        maxCount: 1
    },{
        name: "thumbnail",
        maxCount: 1
    }
]) ,publishVideo)

router.route("/:videoId")
.get(optionalVerifyJWT, getVideoById)
.patch(verifyJWT, upload.single("thumbnail"), updateVideo)
.delete(verifyJWT, deleteVideo)

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);

export default router