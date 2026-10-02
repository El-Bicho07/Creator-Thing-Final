import mongoose from 'mongoose';

const planItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  postId: {
    type: String, // Can store originalId or ObjectId string
    required: true,
  },
  postSnapshot: {
    caption: String,
    mediaType: String,
    postDate: Date,
    reach: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    saves: Number,
    hashtags: [String],
    calculatedER: Number,
  },
  recommendationType: {
    type: String,
    enum: ['REPOST', 'REWORK', 'REPURPOSE', 'ARCHIVE'],
    required: true,
  },
  targetFormat: {
    type: String,
    enum: ['REEL', 'CAROUSEL', 'IMAGE', 'STORY_SERIES', 'THREAD'],
    default: 'REEL',
  },
  status: {
    type: String,
    enum: ['draft', 'planned', 'published'],
    default: 'planned',
  },
  plannedDate: {
    type: Date,
    required: true,
  },
  hookRevision: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const PlanItem = mongoose.model('PlanItem', planItemSchema);
export default PlanItem;
