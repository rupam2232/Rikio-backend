import mongoose from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    const isSubscribed = await Subscription.findOne({subscriber: req.user.id, channel: channelId})
    if(! isSubscribed){
        const newSubscription = await Subscription.create({subscriber: req.user.id, channel: channelId})
        return res
        .status(200)
        .json(new ApiResponse(200, newSubscription, "Subscribed"))
    }else{
        const deletedSubscription = await Subscription.deleteOne({_id: isSubscribed._id, subscriber: req.user.id})
        return res
        .status(200)
        .json(new ApiResponse(200, deletedSubscription, "Unsubscribed"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    const channel = await User.findById(channelId)
    if(!channel) throw new ApiError(400,"Channel not found")
    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channel._id)
            }
        },{
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        },{
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberInfo",
                pipeline: [
                    {
                        $project: {
                            _id: 1, 
                            username: 1, 
                            avatar: 1, 
                            fullName: 1
                        }
                    }
                ]
            }
        },{
            $unwind: "$subscriberInfo"
        },{
            $unwind: "$channelDetails"
        },{
            $group: {
                _id: "$channel",
                channel: {"$first":{
                    _id: "$channelDetails._id",
                    fullName: "$channelDetails.fullName",
                    username: "$channelDetails.username"
                }},
                subscribers: { $push: "$subscriberInfo" }
            }
        }
    ])

    if(subscribers.length > 0){ 
        return res
        .status(200)
        .json(new ApiResponse(200, subscribers[0], "Subscribers"))
        } else{
            return res
            .status(200)
            .json(new ApiResponse(200, {subscribers: []}, "Subscriber not found"))
        }

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(req.user?._id)
            }
        },{
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },{
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannelInfo",
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
                            subscribers: { $size: "$subscribers" }
                        }
                    },
                    {
                        $project: {
                            _id: 1, 
                            username: 1, 
                            avatar: 1, 
                            fullName: 1,
                            bio: 1,
                            verified: 1,
                            subscribers: 1,
                            createdAt: 1

                        }
                    }
                ]
            }
        },{
            $unwind: "$subscribedChannelInfo"
        },{
            $unwind: "$subscriberDetails"
        },{
            $group: {
                _id: "$subscriber",
                user: {"$first":{
                    _id: "$subscriberDetails._id",
                    name: "$subscriberDetails.fullName",
                    username: "$subscriberDetails.username",
                    // bio: "$subscriberDetails.bio",
                    // createdAt: "$subscriberDetails.createdAt",
                    // avatar: "$subscriberDetails.avatar",
                }},
                subscribed: { $push: "$subscribedChannelInfo" }
            }
        }
    ])

    if(subscribedChannels.length > 0){ 
        return res
        .status(200)
        .json(new ApiResponse(200, subscribedChannels[0], "Subscribers"))
        } else{
            return res
            .status(200)
            .json(new ApiResponse(100, {subscribed: []}, "SubscribedChannels not found"))
        }
})

const isSubscribed = asyncHandler(async(req, res)=>{
    const {channelId } = req.params
    const user = req.user
    if(!user) return res.status(200).json(new ApiResponse(200, false, "Not logged in"))
    
    const isSubscriber = await Subscription.findOne({
        subscriber: user.id,
        channel: channelId
    })
    if(isSubscriber){ 
        return res.status(200).json(new ApiResponse(200, true, "subscribed"))
    }else{
        return res.status(200).json(new ApiResponse(200, false, "not subscribed"))
    }
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
    isSubscribed
}