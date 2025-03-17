import { Otp } from "../models/otp.model.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

const verifyOtp = asyncHandler(async (req, _, next) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        throw new ApiError(400, "Email and otp is required");
    }

    const otpData = await Otp.findOne({ email });

    if (!otpData) {
        throw new ApiError(404, "Otp not found");
    }

    if (otpData.expires < new Date()) {
        throw new ApiError(404, "Otp is expired");
    }

    if(req.url.split("/")[1] !== otpData.context) {
        throw new ApiError(404, "Invalid otp");
    }

    const isOtpCorrect = await otpData.isOtpCorrect(otp);

    if (!isOtpCorrect) {
        throw new ApiError(404, "Invalid otp");
    }
    
    await Otp.deleteOne({email: otpData.email});
    req.verifyOtp = true;
    
    next();
})

export default verifyOtp