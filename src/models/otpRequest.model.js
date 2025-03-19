import mongoose, {Schema} from 'mongoose';

const otpRequestSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  requestCount: {
    type: Number,
    default: 1
  },
  firstRequestTime: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete after a long period
otpRequestSchema.index({ firstRequestTime: 1 }, { expireAfterSeconds: 86400 }); // 86400 seconds = 24 hours

export const OtpRequest = mongoose.model('OtpRequest', otpRequestSchema);
