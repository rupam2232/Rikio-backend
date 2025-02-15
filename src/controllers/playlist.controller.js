import mongoose from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {playlistName, description, isPublic} = req.body
    if(! playlistName, isPublic) throw new ApiError(400, "a name and isPublic is required for playlist")

    const createdPlaylist = await Playlist.create({
        playlistName,
        isPublic,
        description : description? description: null,
        owner: req.user?._id
    })

    return res
    .status(201)
    .json( new ApiResponse(201, createdPlaylist, "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {

    const userPlaylists = await Playlist.find({owner: req.user?._id})

    return res
    .status(200)
    .json(new ApiResponse(200, userPlaylists, "User playlists retrieved successfully"))
})

const getChannelPlaylists = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(! channelId) throw new ApiError(400, "please give a userId to procced")

    const channelPlaylists = await Playlist.find({owner: channelId, isPublic: true}).sort({createdAt: 1})

    const playlist = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId),
                isPublic: true
            }
        },
    
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                pipeline: [
                    {
                        $project: { 
                            _id: 1, 
                            fullName: 1, 
                            username: 1, 
                            avatar: 1 
                        }
                    }
                ],
                as: "owner"
            }
        },
    
        // Lookup videos with nested lookup for their owner
        {
            $lookup: {
                from: "videos",
                let: { videoIds: "$videos" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $in: ["$_id", "$$videoIds"] },
                                    { $eq: ["$isPublished", true] }
                                ]
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ],
                            as: "owner"
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" } // Flatten the nested owner array
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1,
                            owner: 1 // Include nested owner details
                        }
                    }
                ],
                as: "videos"
            }
        },
    
        // Flatten owner array since it’s always a single owner
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
    
        // Reshape the final result
        {
            $project: {
                _id: 1,
                owner: 1,
                videos: 1
            }
        }
    ]);  

    return res
    .status(200)
    .json(new ApiResponse(200, channelPlaylists, "Channel playlists retrieved successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(! playlistId) throw new ApiError(400, "please give a playlistId")

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
    
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                pipeline: [
                    {
                        $project: { 
                            _id: 1, 
                            fullName: 1, 
                            username: 1, 
                            avatar: 1,
                            verified: 1, 
                        }
                    }
                ],
                as: "owner"
            }
        },
    
        // Lookup videos with nested lookup for their owner
        {
            $lookup: {
                from: "videos",
                let: { videoIds: "$videos" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $in: ["$_id", "$$videoIds"] },
                                    { $eq: ["$isPublished", true] }
                                ]
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ],
                            as: "owner"
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" } // Flatten the nested owner array
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1,
                            owner: 1 // Include nested owner details
                        }
                    }
                ],
                as: "videos"
            }
        },
    
        // Flatten owner array since it’s always a single owner
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
    
        // Reshape the final result
        {
            $project: {
                _id: 1,
                owner: 1,
                videos: 1
            }
        }
    ]);    

    if(playlist.length > 0)return res.status(200).json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"))

    throw new ApiError(400, "playlist not found")

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(! playlistId) throw new ApiError(400, "please give a playlistId")
    if(! videoId) throw new ApiError(400, "please give a videoId")

    const playlist = await Playlist.findById(playlistId)
    if(! playlist) throw new ApiError(404, "playlist not found")
    if( playlist.owner.toString() !== req.user?.id ) throw new ApiError(400, "You are not allowed to perform this action")

    const video = await Video.findById(videoId)
    if(! video) throw new ApiError(404, "video not found")
    if(! video.isPublished) throw new ApiError(404, "Video is not published")

    const isVideoExists = playlist.videos.filter((video)=> video._id.toString() === videoId )

    if(isVideoExists.length > 0) throw new ApiError(400, "video is already in the playlist")

    playlist.videos.push(videoId)
    
    const updatedPlaylist = await playlist.save()

    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Added video to the playlist"))
            
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(! playlistId) throw new ApiError(400, "please give a playlistId")
    if(! videoId) throw new ApiError(400, "please give a videoId")

    const playlist = await Playlist.findById(playlistId)
    if(! playlist) throw new ApiError(404, "playlist not found")
    if( playlist.owner.toString() !== req.user?.id ) throw new ApiError(400, "You are not allowed to perform this action")
    
    let isVideoExists = playlist.videos.filter((video)=> video._id.toString() === videoId)
    if(isVideoExists.length > 0){
        isVideoExists = playlist.videos.filter((video)=> video._id.toString() !== videoId)
        playlist.videos = isVideoExists
        const updatedPlaylist = await playlist.save()
        return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated"))
    } else {
        throw new ApiError(400, "Video is not in the playlist")
    }

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(! playlistId) throw new ApiError(400, "please give a playlistId")
    const deletedPlaylist = await Playlist.findOneAndDelete({_id: playlistId, owner: req.user?._id})
    if( deletedPlaylist ){
        return res
        .status(200)
        .json( new ApiResponse(200, {}, "Playlist deleted successfully"))
    } else{
        throw new ApiError(404, "Playlist not found")
    }
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {playlistName, description} = req.body
    if(! playlistId) throw new ApiError(400, "please give a playlistId")
    if(! playlistName) throw new ApiError(400, "please give a playlistName")

    let updatedPlaylist = await Playlist.findOneAndUpdate({_id: playlistId, owner: req.user?._id},{
        playlistName,
        description: description? description : null
    })

    if(updatedPlaylist){
        updatedPlaylist = await Playlist.findById(playlistId)
        return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated"))
    }
    throw new ApiError(404, "playlist not found")
})

export {
    createPlaylist,
    getUserPlaylists,
    getChannelPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}