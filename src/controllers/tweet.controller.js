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
    const { userId } = req.params

    const user = await User.findById(userId)
    if (!user) throw new ApiError(400, "user not found")

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
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
            $sort: { createdAt: -1 }
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
        .json(new ApiResponse(200, tweets, "tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { textContent, allImage } = req.body
    let imageLocalPath = req.files

    if (imageLocalPath) {
        imageLocalPath.map((image) => {
            if (!image.mimetype.includes("image")) {
                imageLocalPath.map((image) => fs.unlinkSync(image.path))
                throw new ApiError(400, "Only image files are accepted")
            }
        })
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) throw new ApiError(400, "tweet not found !");

    if (tweet.owner.toString() !== req.user?.id) throw new ApiError(400, "You are not authorized to perform this action")

    let currentImage = []
    if (imageLocalPath) {
        for (let i = 0; i < imageLocalPath.length; i++) {
            let image = imageLocalPath[i].path
            const uploadedImage = await cloudinary.upload(image, 'videotube/tweets')
            allImage.push(uploadedImage.secure_url)
            currentImage.push(uploadedImage.secure_url)
        }
    }
    let deleteImage
    if (allImage) {
        if (allImage.length > 4) {
            for (let i = 0; i < currentImage.length; i++) {
                await cloudinary.deleteImage(currentImage[i])
            }
            throw new ApiError(400, "Only 4 files are allowed to upload");
        }

        deleteImage = tweet.content.image.filter((img) => !allImage.includes(img))
    } else {
        if (tweet.content.image) deleteImage = tweet.content.image;
    }

    if (deleteImage) {
        if (deleteImage.length > 0) {
            for (let i = 0; i < deleteImage.length; i++) {
                const image = deleteImage[i]
                await cloudinary.deleteImage(image)
            }
        }
    }

    if (!(textContent || allImage)) throw new ApiError(400, "please give some valid input")

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
        await Like.deleteMany({tweet: tweet._id})
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