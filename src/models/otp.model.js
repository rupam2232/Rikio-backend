import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"

const otpSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    context: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    expires: {
        type: Date,
        required: true,
        index: { expires: 0 }, //  // TTL Index: Deletes document after `expiresAt` 
    }
},{
    timestamps: true
});

otpSchema.pre("save", async function(next){
    if(!this.isModified("otp")) return next();

    this.otp = await bcrypt.hash(this.otp, 10)
})

otpSchema.methods.isOtpCorrect = async function(otp){
    return await bcrypt.compare(otp, this.otp)
}

export const Otp = mongoose.model("Otp", otpSchema)