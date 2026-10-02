import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  creatorProfile: {
    handle: { type: String, default: '@creator_hq' },
    niche: { type: String, default: 'Tech & Creator Growth' },
    followers: { type: Number, default: 24500 },
    bio: { type: String, default: 'Building digital products & breaking down algorithmic strategies' },
  },
  baselineWeights: {
    engagementWeight: { type: Number, default: 1.0 },
    reachWeight: { type: Number, default: 0.8 },
    savesMultiplier: { type: Number, default: 2.0 },
    sharesMultiplier: { type: Number, default: 1.5 },
    dormantDaysThreshold: { type: Number, default: 60 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.model('User', userSchema);
export default User;
