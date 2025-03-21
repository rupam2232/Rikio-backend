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

            function timeUntil24HoursLater() {
                const twentyFourHoursLater = new Date(requestRecord.firstRequestTime.getTime() + 24 * 60 * 60 * 1000);
                const timeDifferenceMs = twentyFourHoursLater.getTime() - now.getTime();
              
                if (timeDifferenceMs <= 0) {
                  return "The target time has already passed.";
                }
              
                const timeDifferenceSeconds = Math.floor(timeDifferenceMs / 1000);
                const timeDifferenceMinutes = Math.floor(timeDifferenceSeconds / 60);
                const timeDifferenceHours = Math.floor(timeDifferenceMinutes / 60);
              
                if (timeDifferenceHours > 0) {
                  return `${timeDifferenceHours} hours.`;
                } else {
                  return `${timeDifferenceMinutes} minutes.`;
                }
              }
              
            throw new ApiError(429, `You have reached the limit of ${MAX_REQUESTS_PER_DAY} OTP requests today. Try again after ${timeUntil24HoursLater()}`);
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