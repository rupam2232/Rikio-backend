import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { OtpRequest } from "../models/otpRequest.model.js"

const trackOtpRequest = asyncHandler(async (req, _, next) => {
    const { email, fullName } = req.body
    const { context } = req.params
    const MAX_REQUESTS_PER_DAY = 5;
    const now = new Date();

    if (!email || !fullName) {
        throw new ApiError(400, "Email and Fullname is required!");
    }
    if (!context) {
        throw new ApiError(400, "Context is required");
    }

    let requestRecord = await OtpRequest.findOne({ email });

    if (requestRecord) {
        if (requestRecord.requestCount >= MAX_REQUESTS_PER_DAY) {
            throw new ApiError(429, `You have reached the limit of ${MAX_REQUESTS_PER_DAY} OTP requests today. Try again after 24 hours.`)
        } else {
            requestRecord.requestCount += 1;
            await requestRecord.save();
            next();
        }
    } else {
        // First request of the day
        await OtpRequest.create({
            email,
            requestCount: 1,
            firstRequestTime: now
        });
        next();
    }
})

export default trackOtpRequest;