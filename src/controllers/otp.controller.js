import { Otp } from "../models/otp.model.js";
import generateOtp from "../utils/generateOtp.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import sendEmail from "../utils/sendEmail.js"
import {
    PASSWORD_RESET_REQUEST_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE,
} from "../utils/emailTemplates.js";

const sendOtp = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;
    const { context } = req.params;

    if (!email || !fullName) {
        throw new ApiError(400, "Email and Fullname is required");
    }
    if (!context) {
        throw new ApiError(400, "Context is required");
    }
    const otp = generateOtp();
    const expires = new Date(Date.now() + 300000);

    let otpDoc = await Otp.findOne({ email });
    if (!otpDoc) {
        otpDoc = new Otp({ email, otp, context, expires });
    } else {
        otpDoc.otp = otp;
        otpDoc.expires = expires;
        otpDoc.context = context;
    }

    await otpDoc.save();

    if (!otpDoc) {
        throw new ApiError(500, "Otp not created");
    }

    if (context === "register") {
        const mailOptions = {
            to: email,
            subject: "Otp for email verification",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", otp).replace("{name}", fullName),
            headers: { 'X-Email-Category': 'Email Verification' }
        }

        const emailResponse = await sendEmail.send(mailOptions);

        if (!emailResponse) {
            throw new ApiError(500, "Otp not sent");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, true, "Otp sent successfully"));
    } else if (context === "change-password") {
        const mailOptions = {
            to: email,
            subject: "Otp for password reset",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{verificationCode}", otp).replace("{name}", fullName),
            headers: { 'X-Email-Category': 'Password Reset' }
        }

        const emailResponse = await sendEmail.send(mailOptions);

        if (!emailResponse) {
            throw new ApiError(500, "Otp not sent");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, true, "Otp sent successfully"))
    } else {
        throw new ApiError(400, "Invalid template");
    }

})

const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp, context } = req.body;
    if (!email || !otp) {
        throw new ApiError(400, "Email and otp is required");
    }

    const otpData = await Otp.findOne({ email });

    if (!otpData) {
        throw new ApiError(404, "Otp not found");
    }

    if (otpData.expires < new Date()) {
        throw new ApiError(400, "Otp is expired");
    }

    if(otpData.context !== context){
        throw new ApiError(400, "Invalid Otp")
    }

    const isOtpCorrect = await otpData.isOtpCorrect(otp);

    if (!isOtpCorrect) {
        throw new ApiError(400, "Otp is incorrect");
    }

    await Otp.deleteOne({email: otpData.email});

    return res
        .status(200)
        .json(new ApiResponse(200, true, "Otp verified successfully"));
})

export { sendOtp, verifyOtp }