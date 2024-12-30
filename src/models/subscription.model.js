import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: { 
        type: Schema.Types.ObjectId, //who is subscribing
        ref: "User" 
    },
    channel: {
        type: Schema.Types.ObjectId, // to whom subscriber is subscribing || channel name
        ref: "User"
    }
}, {
    timestamps: true
})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)