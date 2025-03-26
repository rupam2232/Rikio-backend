import { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const isVideoAvl = await Video.findById(videoId)
    if (!isVideoAvl || isVideoAvl.isPublished !== true) throw new ApiError(400, "Video not found")

    const isLiked = await Like.findOne({ likedBy: req.user?._id, video: videoId })
    if (isLiked) {
        await Like.findOneAndDelete({ _id: isLiked._id, video: videoId, likedBy: req.user?._id })
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "like removed"))
    } else {
        const like = await Like.create({ video: videoId, likedBy: req.user?._id })
        return res
            .status(200)
            .json(new ApiResponse(200, like, "liked"))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const isCommentAvl = await Comment.findById(commentId)
    if (!isCommentAvl) throw new ApiError(400, "Comment not found")

    const isLiked = await Like.findOne({ likedBy: req.user?._id, comment: commentId })
    if (isLiked) {
        await Like.findOneAndDelete({ _id: isLiked._id, comment: commentId, likedBy: req.user?._id })
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "like removed"))
    } else {
        const like = await Like.create({ comment: commentId, likedBy: req.user?._id })
        return res
            .status(200)
            .json(new ApiResponse(200, like, "liked"))
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const isTweetAvl = await Tweet.findById(tweetId)
    if (!isTweetAvl) throw new ApiError(400, "Tweet not found")

    const isLiked = await Like.findOne({ likedBy: req.user?._id, tweet: tweetId })
    if (isLiked) {
        await Like.findOneAndDelete({ _id: isLiked._id, tweet: tweetId, likedBy: req.user?._id })
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "like removed"))
    } else {
        const like = await Like.create({ tweet: tweetId, likedBy: req.user?._id })
        return res
            .status(200)
            .json(new ApiResponse(200, like, "liked"))
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, 'Page and limit must be positive integers');
    }

    const totalContent = await Like.countDocuments({ likedBy: req.user?._id, video: { $exists: true, $ne: null } })
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: req.user?._id,
                video: { $exists: true, $ne: null }
            }
        }, {
            $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            pipeline: [
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
                                        subscribers: {
                                            $size: "$subscribers"
                                        },
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
                                        bio: 1,
                                        subscribers: 1,
                                        isSubscribed: 1,
                                        verified: 1,
                                        createdAt: 1
                                    }
                                }
                            ],
                            as: 'owner'
                        }
                    }, {
                        $addFields: {
                            owner: { $first: '$owner' }
                        }
                    }, {
                        $project: {
                            _id: 1,
                            title: 1,
                            isPublished: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1,
                            owner: 1
                        }
                    }
                ],
                as: 'video'
            }
        }, {
            $unwind: "$video"
        },
        // $sort: {
        //     "createdAt": -1
        // },
        { $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 } },
        { $skip: (pageNumber - 1) * limitNumber },
        { $limit: limitNumber }
        , {
            $group: {
                _id: "$likedBy",
                videos: { $push: "$video" }
            }
        }, {
            $project: {
                _id: 0,
                videos: 1
            }
        }
    ])

    if (likedVideos.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200,
                {
                    likedVideos: [],
                    currentPage: pageNumber,
                    totalPages: 0
                }, "liked videos"))
    }
    return res
        .status(200)
        .json(new ApiResponse(200, {
            likedVideos: likedVideos[0].videos,
            currentPage: pageNumber,
            totalPages: Math.ceil((totalContent) / limitNumber)
        }, "liked videos"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}