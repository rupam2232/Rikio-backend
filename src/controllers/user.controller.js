import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { Social } from "../models/socials.model.js"
import cloudinary from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose, { isValidObjectId } from "mongoose"
import fs from "fs"
import { watchHistory } from "../models/watchHistory.model.js"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong")
    }
}

const extractNumber = (str) => {
    const match = str.match(/^\d+/);

    if (match) {
        return parseInt(match[0]);
    } else {
        return 0;
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { fullName, email, password, username, otp } = req.body

    if (
        [fullName, email, password, username, otp].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    if (req.verifyOtp !== true) throw new ApiError(400, "Invalid otp")

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {

        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body

    if (!(username || email)) throw new ApiError(400, "username or email is required")

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) throw new ApiError(404, "Invalid user credentials")

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) throw new ApiError(404, "Invalid user credentials")

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken -watchHistory -loggedInDevices")

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, { ...options, maxAge: extractNumber(process.env.ACCESS_TOKEN_EXPIRY) * 24 * 60 * 60 * 1000 })
        .cookie("refreshToken", refreshToken, { ...options, maxAge: extractNumber(process.env.REFRESH_TOKEN_EXPIRY) * 24 * 60 * 60 * 1000 })
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                },
                "user logged In Successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request")

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) throw new ApiError(401, "Invalid refresh token")

        if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh token is expired or used")

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    if (!(oldPassword && newPassword)) throw new ApiError(400, "old and new both passwords are required")
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    const isNewPasswordSame = await user.isPasswordCorrect(newPassword)

    if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password")
    if (isNewPasswordSame) throw new ApiError(400, "Old password and New password are same")

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) throw new ApiError(400, "All fields are required")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing")
    if (!req.file.mimetype.includes("image")) {
        fs.unlinkSync(req.file.path)
        throw new ApiError(400, "Only images are allowed to upload")
    }

    const avatar = await cloudinary.upload(avatarLocalPath, "videotube/users")

    if (!avatar.secure_url) throw new ApiError(500, "Error while uploading avatar")

    const oldUser = await User.findById(req.user?.id)
    await cloudinary.deleteImage(oldUser.avatar)

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.secure_url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar updated successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) throw new ApiError(400, "Cover file is missing")
    if (req.file.mimetype.includes("gif") || !req.file.mimetype.includes("image")) {
        fs.unlinkSync(req.file.path)
        throw new ApiError(400, "Only images are allowed to upload")
    }

    const coverImage = await cloudinary.upload(coverImageLocalPath, "videotube/users")

    if (!coverImage.secure_url) throw new ApiError(500, "Error while uploading cover image")

    const oldUser = await User.findById(req.user?.id)
    if (oldUser?.coverImage) await cloudinary.deleteImage(oldUser.coverImage)

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.secure_url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "coverImage updated successfully")
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) throw new ApiError(400, "username is missing")

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
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
            $lookup: {
                from: "socials",
                localField: "_id",
                foreignField: "user",
                as: "socials"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                socials: {
                    $first: "$socials"
                },
                isChannelOwner: {
                    $cond: {
                        if: { $eq: [req.user?._id, "$_id"] },
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
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                bio: 1,
                socials: 1,
                subscribersCount: 1,
                isSubscribed: 1,
                isChannelOwner: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                verified: 1,
                createdAt: 1

            }
        }
    ])

    if (!channel?.length) throw new ApiError(404, `Channel with username @${username} not found`)

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const historyAggregation  = await watchHistory.aggregate([
        {
            $match: { watchedBy: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videoId",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    { $match: { isPublished: true } }, // ✅ Only include published videos
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        }
                    },
                    { $unwind: "$ownerDetails" },
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "owner",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            "ownerDetails.subscribers": { $size: "$subscribers" },
                            "ownerDetails.isSubscribed": {
                                $in: [new mongoose.Types.ObjectId(userId), "$subscribers.subscriber"]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            createdAt: 1,
                            owner: {
                                _id: "$ownerDetails._id",
                                username: "$ownerDetails.username",
                                fullName: "$ownerDetails.fullName",
                                avatar: "$ownerDetails.avatar",
                                verified: "$ownerDetails.verified",
                                bio: "$ownerDetails.bio",
                                createdAt: "$ownerDetails.createdAt",
                                subscribers: "$ownerDetails.subscribers",
                                isSubscribed: "$ownerDetails.isSubscribed"
                            }
                        }
                    }
                ]
            }
        },
        { $unwind: "$video" }, // Flatten the video array
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                },
                createdAt: { $first: "$createdAt" },
                videos: { $push: "$video" }
            }
        },
        { $sort: { _id: -1 } }, // ✅ Sort by latest date
        { $skip: (page - 1) * limit },
        { $limit: Number(limit) }
    ]);

    // ✅ Correcting Total Video Count (Only Published Videos)
    const totalCount = await watchHistory.aggregate([
        {
            $lookup: {
                from: "videos",
                localField: "videoId",
                foreignField: "_id",
                as: "video",
                pipeline: [{ $match: { isPublished: true } }] // ✅ Only count published videos
            }
        },
        { $unwind: "$video" },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                }
            }
        },
        { $count: "total" }
    ]);

    const totalPages = Math.ceil((totalCount[0]?.total || 0) / limit);

    return res.status(200).json(new ApiResponse(200, {
        history: historyAggregation,
        totalVideos: totalCount[0]?.total || 0,
        currentPage: parseInt(page),
        totalPages
    }, "User's watch history fetched successfully"));

    return res.status(200).json({
        history: historyAggregation , // ✅ Keeps your previous response format
        totalPages,
        currentPage: Number(page),
        totalVideo: totalCount[0]?.total || 0 // ✅ Correct total count (excluding unpublished videos)
    });
});


const pushVideoToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId, userTimeZoneOffset } = req.body
    if (!isValidObjectId(videoId)) throw new ApiError(400, "video id is not a valid object id")

    if (!userTimeZoneOffset) throw new ApiError(400, "userTimeZoneOffset required")

    const isVideoAvl = await Video.findOne({ _id: videoId, isPublished: true })

    if (!isVideoAvl) throw new ApiError(400, "video not found")


    const nowUTC = new Date();

    // Convert UTC time to user's local date using offset (in minutes)
    const userNow = new Date(nowUTC.getTime() + userTimeZoneOffset * 60000);

    // Get user's local day boundaries
    const userStartOfDay = new Date(userNow);
    userStartOfDay.setUTCHours(0, 0, 0, 0); // Start of the user's local day in UTC context

    const userEndOfDay = new Date(userStartOfDay);
    userEndOfDay.setUTCDate(userEndOfDay.getUTCDate() + 1); // Next day start (exclusive)

    // Convert back to absolute UTC time for database query
    const utcStartOfDay = new Date(userStartOfDay.getTime() - userTimeZoneOffset * 60000);
    const utcEndOfDay = new Date(userEndOfDay.getTime() - userTimeZoneOffset * 60000);

    // Delete documents matching uniqueId and within the same local day
    await watchHistory.deleteMany({
        videoId,
        watchedBy: req.user._id,
        createdAt: { $gte: utcStartOfDay, $lt: utcEndOfDay }
    });

    // Insert a new document with the current UTC timestamp
    const addedVideo = await watchHistory.create({
        videoId,
        watchedBy: req.user._id,
    });

    if (!addedVideo) throw new ApiError(400, "Can't add video to watch history")

    return res
        .status(200)
        .json(new ApiResponse(200, addedVideo, "Video added to watchHistory successfully"))
})

const checkIfUsernameIsAvl = asyncHandler(async (req, res) => {
    const { username } = req.params

    const user = await User.findOne({ username })

    if (user) {
        return res
            .status(200)
            .json(new ApiResponse(200, false, `@${username} is unavailable`))
    } else {
        return res
            .status(200)
            .json(new ApiResponse(200, true, `@${username} is available`))
    }
})

const checkIfEmailIsAvl = asyncHandler(async (req, res) => {
    const { email } = req.params

    const user = await User.findOne({ email })

    if (user) {
        return res
            .status(200)
            .json(new ApiResponse(200, false, `${email} is already in use`))
    } else {
        return res
            .status(200)
            .json(new ApiResponse(200, true, `${email} is available`))
    }
})

const addSocials = asyncHandler(async (req, res) => {
    const { facebook, instagram, linkedin, github, website, x } = req.body

    let socials = await Social.findOne({ user: req.user._id })
    if (!socials) {
        socials = new Social({
            user: req.user._id,
            facebook: facebook ? facebook : null,
            instagram: instagram ? instagram : null,
            linkedin: linkedin ? linkedin : null,
            github: github ? github : null,
            website: website ? website : null,
            x: x ? x : null
        })
    } else {
        socials.facebook = facebook ? facebook : null
        socials.instagram = instagram ? instagram : null
        socials.linkedin = linkedin ? linkedin : null
        socials.github = github ? github : null
        socials.website = website ? website : null
        socials.x = x ? x : null
    }
    await socials.save()

    return res
        .status(201)
        .json(new ApiResponse(201, socials, "Socials added successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    pushVideoToWatchHistory,
    checkIfUsernameIsAvl,
    checkIfEmailIsAvl,
    addSocials
}