import { Router } from 'express';
import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    getChannelPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
} from "../controllers/playlist.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { optionalVerifyJWT } from "../middlewares/optionalAuth.middleware.js"

const router = Router();

router.route("/").post(verifyJWT, createPlaylist)

router.route("/user").get(verifyJWT, getUserPlaylists);

router
    .route("/:playlistId")
    .get(optionalVerifyJWT, getPlaylistById)
    .patch(verifyJWT, updatePlaylist)
    .delete(verifyJWT, deletePlaylist);

router.route("/add/:videoId/:playlistId").patch(verifyJWT, addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(verifyJWT, removeVideoFromPlaylist);

router.route("/channel/:channelId").get(getChannelPlaylists);

export default router