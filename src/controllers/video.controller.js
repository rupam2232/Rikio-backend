import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import cloudinary from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.model.js"
import fs from "fs"
import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"


const publishVideo = asyncHandler(async (req, res) => {
    const { title, description, isPublished, tags } = req.body
    const user = req.user

    let videoLocalpath;
    if (req.files && Array.isArray(req.files.video) && req.files.video.length > 0) {
        videoLocalpath = req.files.video[0].path;
        if (!req.files.video[0].mimetype.includes("mp4")) {
            fs.unlinkSync(videoLocalpath)
            if (req.files.thumbnail) fs.unlinkSync(req.files.thumbnail[0].path)
            throw new ApiError(400, "only mp4 file is allowed to upload as video")
        }
    }

    let thumbnailLocalpath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalpath = req.files.thumbnail[0].path;
        if (!req.files.thumbnail[0].mimetype.includes("image")) {
            if (videoLocalpath) fs.unlinkSync(videoLocalpath)
            fs.unlinkSync(thumbnailLocalpath)
            throw new ApiError(400, "only images are allowed to upload for thumbnail")
        }
    }


    if (!(title && videoLocalpath && thumbnailLocalpath && isPublished)) {
        if (thumbnailLocalpath) fs.unlinkSync(thumbnailLocalpath)
        if (videoLocalpath) fs.unlinkSync(videoLocalpath)
        throw new ApiError(400, "title, ispublished, video and thumbnail all fields are required")
    }

    let tagsArray = []
    if (tags) {
        if (Array.isArray(tags)) {
            tagsArray = tags
        }
    }

    const video = await cloudinary.upload(videoLocalpath, "videotube/videos/videoFiles")
    const thumbnail = await cloudinary.upload(thumbnailLocalpath, "videotube/videos/thumbnailFiles")

    if (!(video && thumbnail)) throw new ApiError(500, "Error while uploading thumbnail and video")

    const uploadedVideo = await Video.create({
        videoFile: video.secure_url,
        thumbnail: thumbnail.secure_url,
        title,
        description: description ? description : "",
        tags: tagsArray,
        duration: Math.round(video.duration),
        isPublished,
        owner: user?._id
    })

    if (!uploadedVideo) throw new ApiError(500, "Error while creating db object")

    return res.status(200).json(new ApiResponse(200, uploadedVideo, "video uploaded successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) throw new ApiError(400, "not get videoId")

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Video id is not valid")

    const isVideoAvl = await Video.findOne({ _id: videoId, isPublished: true })

    if (!isVideoAvl) throw new ApiError(400, "Video not found")

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true
            }
        }, {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            verified: 1,
                            bio: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        }, {
            $addFields: {
                owner: { "$first": "$owner" }
            }
        },
    ])

    const likes = await Like.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        }, {
            $addFields: {
                isLikedBy: {
                    $cond: {
                        if: { $eq: ["$likedBy", new mongoose.Types.ObjectId(req.user?._id)] },
                        then: true,
                        else: false
                    }
                }
            }
        }, {
            $group: {
                _id: "$video",
                totalLikes: { $sum: 1 },
                isLiked: { $max: "$isLikedBy" }
            }
        }

    ])

    return res
        .status(200)
        .json(new ApiResponse(200, { video: video[0], likes: likes[0] ? likes[0] : { totalLikes: 0, isLiked: false } }, `data of ${videoId}`))

})

const updateVideo = asyncHandler(async (req, res) => {
    const { title, description, tags } = req.body
    const thumbnailLocalpath = req.file?.path
    const { videoId } = req.params
    const user = req.user?.id

    if (!title) throw new ApiError(400, "title is required")

    const video = await Video.findById(videoId)

    if (video.owner.toString() !== user) throw new ApiError(400, "You are not authorized to perform this action")

    if (title.replace(/\s+/g, '') === "") throw new ApiError(400, "Need valid a input for title")

    let tagsArray = []
    if (tags) {
        if (Array.isArray(tags)) {
            tagsArray = tags
        }
    }

    video.title = title
    video.description = description
    video.tags = tagsArray

    if (thumbnailLocalpath) {
        if (!req.file.mimetype.includes("image") || req.file.mimetype.includes("gif")) {
            fs.unlinkSync(thumbnailLocalpath)
            throw new ApiError(400, "only images are allowed to upload for thumbnail")
        }
        if (video.thumbnail) {
            await cloudinary.deleteImage(video.thumbnail)
        }
        const thumbnail = await cloudinary.upload(thumbnailLocalpath, "videotube/videos/thumbnailFiles")

        video.thumbnail = thumbnail.secure_url
    }
    await video.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, video, "video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const user = req.user?._id

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Please enter a correct video Id")

    const video = await Video.findOne({ _id: videoId, owner: user })
    if (!video) throw new ApiError(400, "video not found")

    await cloudinary.deleteVideo(video.videoFile)
    await cloudinary.deleteImage(video.thumbnail)
    await Video.deleteOne({ _id: videoId, owner: user })
    await Like.deleteMany({ video: video._id })
    return res
        .status(200)
        .json(new ApiResponse(200, true, `${videoId} video deleted successfully`))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { isPublished } = req.body

    if (!req.body || (isPublished !== true && isPublished !== false)) throw new ApiError(400, "isPublished need to submit")
    if (!isValidObjectId(videoId)) throw new ApiError(400, "video id is not valid")
    const updatedVideo = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: req.user._id
        },
        {
            $set: {
                isPublished
            }
        },
        { new: true })

    if (!updatedVideo) throw new ApiError(400, "Video not found");


    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, channel = "", search = '', sortBy = 'createdAt', sortType = 'desc' } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, 'Page and limit must be positive integers');
    }

    const decodedSearch = search.replace(/\+/g, ' ').trim();

    let userSearchResults = [];
    let videoSearchResults = [];

    if (channel) {
        const channelSearch = channel.replace(/\+/g, ' ').trim();
        const searchingChannel = await User.findOne({ username: channelSearch })
        if (!searchingChannel) throw new ApiError(400, "Channel not found");

        const countChannelsVideo = await Video.countDocuments({ owner: searchingChannel._id, isPublished: true })

        const channelsAllVideo = await Video.aggregate([
            {
                $match: {
                    owner: searchingChannel._id,
                    isPublished: true
                }
            }, {
                $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 }
            }, {
                $skip: (pageNumber - 1) * limitNumber
            }, {
                $limit: limitNumber
            }, {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                verified: 1,
                                fullName: 1,
                                avatar: 1,
                                bio: 1,
                                createdAt: 1
                            }
                        }
                    ],
                    as: "owner"
                }
            }, {
                $addFields: {
                    owner: { $first: "$owner" }
                }
            }, {
                $project: {
                    _id: 1,
                    owner: 1,
                    isPublished: 1,
                    title: 1,
                    thumbnail: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                }
            }
        ])

        return res
            .status(200)
            .json(new ApiResponse(200, {
                channelsAllVideo: channelsAllVideo,
                totalVideo: countChannelsVideo,
                currentPage: pageNumber,
                totalPages: Math.ceil(countChannelsVideo / limitNumber)
            }))

    }

    let totalContent = 0;
    if (decodedSearch) {

        userSearchResults = await User.aggregate([
            {
                $match: {
                    $or: [
                        { username: { $regex: decodedSearch, $options: 'i' } },
                        { fullName: { $regex: decodedSearch, $options: 'i' } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                    verified: 1,
                    isSubscribed: 1,
                    bio: 1,
                    createdAt: 1,
                    subscribers: { $size: "$subscribers" }
                }
            }
        ]);

        totalContent += await Video.countDocuments({
            isPublished: true,
            $or: [
                { title: { $regex: decodedSearch, $options: 'i' } },
                { description: { $regex: decodedSearch, $options: 'i' } },
                { tags: { $regex: decodedSearch, $options: 'i' } },
            ]
        })

        videoSearchResults = await Video.aggregate([
            {
                $match: {
                    isPublished: true,
                    $or: [
                        { title: { $regex: decodedSearch, $options: 'i' } },
                        { description: { $regex: decodedSearch, $options: 'i' } },
                        { tags: { $regex: decodedSearch, $options: 'i' } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails"
                }
            },
            {
                $unwind: "$ownerDetails"
            }, {
                $lookup: {
                    from: "subscriptions",
                    localField: "owner",
                    foreignField: "channel",
                    as: "subscribers"
                }
            }, {
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    duration: 1,
                    uploadDate: 1,
                    views: 1,
                    thumbnail: 1,
                    tags: 1,
                    createdAt: 1,
                    owner: {
                        _id: "$ownerDetails._id",
                        username: "$ownerDetails.username",
                        fullName: "$ownerDetails.fullName",
                        avatar: "$ownerDetails.avatar",
                        verified: "$ownerDetails.verified",
                        bio: "$ownerDetails.bio",
                        createdAt: "$ownerDetails.createdAt",
                        isSubscribed: "$isSubscribed",
                        subscribers: { $size: "$subscribers" }
                    }
                }
            },
            { $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 } },
            { $skip: (pageNumber - 1) * limitNumber },
            { $limit: limitNumber }
        ]);
    } else {

        videoSearchResults = await Video.aggregate([
            { $match: { isPublished: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails"
                }
            },
            {
                $unwind: "$ownerDetails"
            }, {
                $lookup: {
                    from: "subscriptions",
                    localField: "owner",
                    foreignField: "channel",
                    as: "subscribers"
                }
            }, {
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    duration: 1,
                    thumbnail: 1,
                    createdAt: 1,
                    views: 1,
                    isSubscribed: 1,
                    tags: 1,
                    owner: {
                        _id: "$ownerDetails._id",
                        username: "$ownerDetails.username",
                        fullName: "$ownerDetails.fullName",
                        avatar: "$ownerDetails.avatar",
                        verified: "$ownerDetails.verified",
                        bio: "$ownerDetails.bio",
                        subscribers: { $size: "$subscribers" },
                        createdAt: "$ownerDetails.createdAt"
                    }
                }
            }
        ]);

        totalContent += parseInt(videoSearchResults.length)
    }

    // Fetch videos uploaded by found channels
    const channelVideos = [];
    for (const user of userSearchResults) {
        const videos = await Video.aggregate([
            { $match: { owner: user._id, isPublished: true } },
            { $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 } },
            { $limit: 1 },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails"
                }
            },
            {
                $unwind: "$ownerDetails"
            }, {
                $lookup: {
                    from: "subscriptions",
                    localField: "owner",
                    foreignField: "channel",
                    as: "subscribers"
                }
            }, {
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    duration: 1,
                    thumbnail: 1,
                    createdAt: 1,
                    views: 1,
                    tags: 1,
                    owner: {
                        _id: "$ownerDetails._id",
                        username: "$ownerDetails.username",
                        fullName: "$ownerDetails.fullName",
                        avatar: "$ownerDetails.avatar",
                        verified: "$ownerDetails.verified",
                        bio: "$ownerDetails.bio",
                        subscribers: { $size: "$subscribers" },
                        isSubscribed: "$isSubscribed",
                        createdAt: "$ownerDetails.createdAt"
                    }
                }
            }
        ]);

        channelVideos.push({
            channel: user,
            video: videos[0]
        });
    }

    if (decodedSearch && userSearchResults.length === 0 && videoSearchResults.length === 0) {
        return res.status(200).json(
            new ApiResponse(200,
                {
                    users: [],
                    videos: [],
                    totalVideo: 0,
                    currentPage: pageNumber,
                    totalPages: 0
                }, `No results found for "${decodedSearch}"`)
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users: channelVideos,
                videos: videoSearchResults,
                totalVideo: totalContent,
                currentPage: pageNumber,
                totalPages: Math.ceil((totalContent) / limitNumber)
            },
            decodedSearch ? `Search results for "${decodedSearch}"` : "Homepage videos"
        )
    );
});




export {
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getAllVideos
}