import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import cloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs"
import { Like } from "../models/like.model.js";

const createTweet = asyncHandler(async (req, res) => {
    const { textContent } = req.body
    let imageLocalPath = req.files
    const owner = req.user?._id

    if (imageLocalPath) {
        imageLocalPath.map((image) => {
            if (!image.mimetype.includes("image")) {
                imageLocalPath.map((image) => fs.unlinkSync(image.path))
                throw new ApiError(400, "Only image files are accepted")
            }
            if (image.size > 1024 * 1024) {
                imageLocalPath.map((image) => fs.unlinkSync(image.path))
                throw new ApiError(400, `File "${image.originalname}" exceeds 1MB.`);
            }
        })
    }

    if (!owner) throw new ApiError(400, "You are not authorized to perform this action")

    let imageUrl = []

    if (imageLocalPath) {
        for (let i = 0; i < req.files.length; i++) {
            let image = req.files[i].path
            const uploadedImage = await cloudinary.upload(image, 'videotube/tweets')
            imageUrl.push(uploadedImage.secure_url)
        }
    }

    if (!(textContent || imageUrl)) throw new ApiError(400, "please give some valid input")

    const tweet = await Tweet.create({
        owner,
        content: {
            textContent: textContent ? textContent : null,
            image: imageUrl ? imageUrl : []
        }
    })

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet posted successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, 'Page and limit must be positive integers');
    }

    const user = await User.findById(userId)
    if (!user) throw new ApiError(400, "user not found")

    const totalTweets = await Tweet.countDocuments({ owner: new mongoose.Types.ObjectId(userId) })

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
                as: "ownerDetails",
            }
        }, {
            $unwind: "$ownerDetails"
        }, {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'tweet',
                as: 'likes',
            }
        }, {
            $lookup: {
                from: 'comments',
                localField: '_id',
                foreignField: 'tweet',
                as: 'comments',
            }
        }, {
            $addFields: {
                totalLikes: { $size: "$likes" },
                totalComments: { $size: "$comments" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                isTweetOwner: {
                    $cond: {
                        if: { $eq: ["$owner", req.user?._id] },
                        then: true,
                        else: false
                    }
                },
            }
        }, {
            $project: {
                _id: 1,
                content: 1,
                totalLikes: 1,
                totalComments: 1,
                isLiked: 1,
                isTweetOwner: 1,
                createdAt: 1,
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, {
            tweets,
            totalTweets,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalTweets / limitNumber)
        }, "tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { textContent } = req.body
    let { allImage } = req.body
    let imageLocalPath = req.files

    if (allImage) {
        if (typeof allImage === 'string') {
            allImage = [allImage];
        } else if (!Array.isArray(allImage)) {
            allImage = [];
        }
    } else {
        allImage = [];
    }

    if (!textContent && !allImage) {
        if (imageLocalPath) {
            imageLocalPath.map((image) => fs.unlinkSync(image.path))
        }
        throw new ApiError(400, "please give some valid input")
    }

    if (allImage?.length > 4) {
        if (imageLocalPath) {
            imageLocalPath.map((image) => fs.unlinkSync(image.path))
        }
        throw new ApiError(400, "Only 4 image file are allowed to upload")
    }

    if (imageLocalPath) {
        imageLocalPath.map((image) => {
            if (!image.mimetype.includes("image")) {
                imageLocalPath.map((image) => fs.unlinkSync(image.path))
                throw new ApiError(400, "Only image files are accepted")
            }
        })
        if ((allImage?.length + imageLocalPath.length) > 4) {
            imageLocalPath.map((image) => fs.unlinkSync(image.path))
            throw new ApiError(400, "Only 4 image file are allowed to upload")
        }
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) throw new ApiError(400, "tweet not found !");

    if (tweet.owner.toString() !== req.user?.id) throw new ApiError(400, "You are not authorized to perform this action")


    if (imageLocalPath) {
        for (let i = 0; i < imageLocalPath.length; i++) {
            let image = imageLocalPath[i].path
            const uploadedImage = await cloudinary.upload(image, 'videotube/tweets')
            allImage.push(uploadedImage.secure_url)
        }
    }

    if (tweet.content.image.length > 0) {
        const imagesToDlt = tweet.content.image.filter((img) => !allImage.includes(img))

        for (const image of imagesToDlt) {
            await cloudinary.deleteImage(image)
        }
    }

    tweet.content.textContent = textContent ? textContent : null;
    tweet.content.image = allImage ? allImage : [];

    const result = await tweet.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Tweet updated Successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    const tweet = await Tweet.findOne({ _id: tweetId, owner: req.user._id })
    if (tweet) {
        if (tweet.content.image.length > 0) {
            for (let i = 0; i < tweet.content.image.length; i++) {
                const image = tweet.content.image[i]
                await cloudinary.deleteImage(image)
            }
        }
        await Tweet.findByIdAndDelete(tweet._id)
        await Like.deleteMany({ tweet: tweet._id })
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Tweet deleted Successfully"))
    }
    if (!tweet) throw new ApiError(400, "tweet doesn't exists")
})


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}