import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Tweet } from "../models/tweet.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query

    if (!isValidObjectId(videoId)) throw new ApiError(400, "video id is not valid")

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (pageNumber < 1 || limitNumber < 1) {
        return res
            .status(400)
            .json(new ApiResponse(400, 'Page and limit must be positive integers'));
    }

    const skip = (pageNumber - 1) * limitNumber;

    const isVideoAvl = await Video.findById(videoId)

    if (!isVideoAvl) throw new ApiError(400, "Video not found");

    if (isVideoAvl.isPublished === false) {
        if (isVideoAvl.owner.toString() !== req.user?.id) throw new ApiError(400, "Video not found")
    }

    const totalComments = await Comment.countDocuments({ video: videoId });

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        }, {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            avatar: 1,
                            username: 1,
                            verified: 1,
                            bio: 1,
                            createdAt: 1,
                        }
                    }
                ],
                as: 'ownerInfo',
            }
        },{
            $addFields: {
                ownerInfo: { $first: "$ownerInfo" },
            }
        }, {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'comment',
                as: 'likes',
            }
        }, {
            $lookup: {
                from: "subscriptions",
                localField: "ownerInfo._id",
                foreignField: "channel",
                as: "subscribers"
            }
        }, {
            $lookup: {
                from: "comment",
                localField: "_id",
                foreignField: "parentComment",
                as: "replies"
            }
        }, {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            owner: 1
                        }
                    }
                ],
                as: "videoInfo"
            }
        }, {
            $addFields: {
                likesCount: { $size: "$likes" },
                repliesCount: { $size: "$replies" },
                videoInfo: { $first: "$videoInfo" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                isVideoOwner: {
                    $cond: {
                        if: { $eq: ["$owner", { $first: "$videoInfo.owner" }] },
                        then: true,
                        else: false
                    }
                },
                isCommentOwner: {
                    $cond: {
                        if: { $eq: ["$owner", req.user?._id] },
                        then: true,
                        else: false
                    }
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }

            }
        }, {
            $project: {
                _id: 1,
                content: 1,
                isEdited: 1,
                ownerInfo: 1,
                videoInfo: 1,
                likesCount: 1,
                repliesCount: 1,
                isLiked: 1,
                isVideoOwner: 1,
                isCommentOwner: 1,
                isSubscribed: 1,
                subscribers: { $size: "$subscribers" },
                createdAt: 1
            }
        }, {
            $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 },
        }, {
            $skip: skip,
        }, {
            $limit: limitNumber,
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(200,
                {
                    totalComments,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalComments / limitNumber),
                    comments,
                },
                "comments fetched successfully")
        );

})

const getTweetComments = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query

    if (!isValidObjectId(tweetId)) throw new ApiError(400, "tweet id is not valid");

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (pageNumber < 1 || limitNumber < 1) {
        return res
            .status(400)
            .json(new ApiResponse(400, 'Page and limit must be positive integers'));
    }

    const skip = (pageNumber - 1) * limitNumber;

    const isTweetAvl = await Tweet.findById(tweetId)

    if (!isTweetAvl) throw new ApiError(400, "Tweet not found");

    const totalComments = await Comment.countDocuments({ tweet: tweetId });

    const comments = await Comment.aggregate([
        {
            $match: {
                tweet: new mongoose.Types.ObjectId(tweetId)
            }
        }, {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            avatar: 1,
                            username: 1,
                            verified: 1,
                        }
                    }
                ],
                as: 'ownerInfo',
            }
        }, {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'comment',
                as: 'likes',
            }
        }, {
            $lookup: {
                from: "comment",
                localField: "_id",
                foreignField: "parentComment",
                as: "replies"
            }
        }, {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            owner: 1
                        }
                    }
                ],
                as: "tweetInfo"
            }
        }, {
            $addFields: {
                ownerInfo: { $first: "$ownerInfo" },
                likesCount: { $size: "$likes" },
                repliesCount: { $size: "$replies" },
                tweetInfo: { $first: "$tweetInfo" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                isTweetOwner: {
                    $cond: {
                        if: { $eq: ["$owner", { $first: "$tweetInfo.owner" }] },
                        then: true,
                        else: false
                    }
                },
                isCommentOwner: {
                    $cond: {
                        if: { $eq: ["$owner", req.user?._id] },
                        then: true,
                        else: false
                    }
                }
            }
        }, {
            $project: {
                _id: 1,
                content: 1,
                isEdited: 1,
                ownerInfo: 1,
                tweetInfo: 1,
                likesCount: 1,
                repliesCount: 1,
                isLiked: 1,
                isTweetOwner: 1,
                isCommentOwner: 1,
                createdAt: 1
            }
        }, {
            $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 },
        }, {
            $skip: skip,
        }, {
            $limit: limitNumber,
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(200,
                {
                    totalComments,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalComments / limitNumber),
                    comments,
                },
                "comments fetched successfully")
        );

})

const getReplyComments = asyncHandler(async (req, res) => {
    const { parentCommentId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(parentCommentId)) throw new ApiError(400, "parent id is not valid");

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (pageNumber < 1 || limitNumber < 1) {
        return res
            .status(400)
            .json(new ApiResponse(400, 'Page and limit must be positive integers'));
    }

    const skip = (pageNumber - 1) * limitNumber;

    const isParentAvl = await Comment.findById(parentCommentId)

    if (!isParentAvl) throw new ApiError(400, "Parent Comment not found");

    const totalComments = await Comment.countDocuments({ parentComment: parentCommentId });

    const comments = await Comment.aggregate([
        {
            $match: {
                parentComment: new mongoose.Types.ObjectId(parentCommentId)
            }
        }, {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            avatar: 1,
                            username: 1,
                            verified: 1,
                        }
                    }
                ],
                as: 'ownerInfo',
            }
        }, {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'comment',
                as: 'likes',
            }
        }, {
            $lookup: {
                from: "comment",
                localField: "_id",
                foreignField: "parentComment",
                as: "replies"
            }
        }, {
            $lookup: {
                from: "comments",
                localField: "replyingTo",
                foreignField: "_id",
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        fullName: 1,
                                        username: 1,
                                    }
                                }
                            ],
                            as: 'ownerInfo'
                        }
                    }, {
                        $addFields: { owner: { $first: "$ownerInfo" } }
                    }, {
                        $project: {
                            _id: 1,
                            content: 1,
                            owner: 1
                        }
                    }
                ],
                as: "replyingToComment"
            }
        }, {
            $lookup: {
                from: "comments",
                localField: "parentComment",
                foreignField: "_id",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            owner: 1
                        }
                    }
                ],
                as: "parentCommentInfo"
            }
        }, {
            $addFields: {
                ownerInfo: { $first: "$ownerInfo" },
                likesCount: { $size: "$likes" },
                repliesCount: { $size: "$replies" },
                parentCommentInfo: { $first: "$parentCommentInfo" },
                replyingToCommentInfo: { $first: "$replyingToComment" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                isCommentOwner: {
                    $cond: {
                        if: { $eq: ["$owner", req.user?._id] },
                        then: true,
                        else: false
                    }
                }
            }
        }, {
            $project: {
                _id: 1,
                content: 1,
                isEdited: 1,
                ownerInfo: 1,
                parentCommentInfo: 1,
                replyingToCommentInfo: 1,
                likesCount: 1,
                repliesCount: 1,
                isLiked: 1,
                isCommentOwner: 1,
                createdAt: 1
            }
        }, {
            $sort: { createdAt: 1 }
        }, {
            $skip: skip,
        }, {
            $limit: limitNumber,
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(200,
                {
                    totalReplies: totalComments,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalComments / limitNumber),
                    replies: comments,
                },
                "replies fetched successfully")
        );

})

const addVideoComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if (!content?.trim()) throw new ApiError(400, "a comment is required")
    if (!isValidObjectId(videoId)) throw new ApiError(400, "video id is not valid")

    const video = await Video.findOne({ _id: videoId, isPublished: true })
    if (!video) throw new ApiError(404, "video not found")

    const comment = await Comment.create({
        content,
        video: video._id,
        owner: req.user._id
    })

    if (!comment) throw new ApiError(500, "Something went wrong while commenting")

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment added successfully"))
})

const addTweetComment = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!content?.trim()) throw new ApiError(400, "a comment is required")
    if (!isValidObjectId(tweetId)) throw new ApiError(400, "tweet id is not valid")

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) throw new ApiError(404, "tweet not found")

    const comment = await Comment.create({
        content,
        tweet: tweet._id,
        owner: req.user._id
    })

    if (!comment) throw new ApiError(500, "Something went wrong while commenting")

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment added successfully"))
})

const addReplyComment = asyncHandler(async (req, res) => {
    const { parentCommentId, replyingTo } = req.params
    const { content } = req.body

    if (!content?.trim()) throw new ApiError(400, "a comment is required")
    if (!isValidObjectId(parentCommentId) || !isValidObjectId(replyingTo)) throw new ApiError(400, "comment id is not valid")

    const isParentCommentAvl = await Comment.findById(parentCommentId)
    if (!isParentCommentAvl) throw new ApiError(404, "comment not found")

    const isReplyingCommentAvl = await Comment.findById(replyingTo)
    if (!isReplyingCommentAvl) throw new ApiError(404, "comment not found")

    const reply = await Comment.create({
        content,
        parentComment: isParentCommentAvl._id,
        replyingTo: isReplyingCommentAvl._id,
        owner: req.user._id
    })

    if (!reply) throw new ApiError(500, "Something went wrong while replying")

    return res
        .status(200)
        .json(new ApiResponse(200, reply, "Reply added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body
    if (!content?.trim()) throw new ApiError(400, "a comment is required")
    if (!isValidObjectId(commentId)) throw new ApiError(400, "comment id is not valid")

    const comment = await Comment.findOneAndUpdate({ _id: commentId, owner: req.user?._id },
        { content, isEdited: true },
        { new: true })

    if (!comment) throw new ApiError(400, "Comment not found")

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) throw new ApiError(400, "comment id is not valid")

    const comment = await Comment.findOneAndDelete({ _id: commentId, owner: req.user?._id })

    if (!comment) throw new ApiError(400, "Comment not found")

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

export {
    getVideoComments,
    getTweetComments,
    getReplyComments,
    addVideoComment,
    addTweetComment,
    addReplyComment,
    updateComment,
    deleteComment
}