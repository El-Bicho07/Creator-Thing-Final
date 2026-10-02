import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for guest/demo session
  },
  originalId: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    enum: ['IMAGE', 'CAROUSEL', 'REEL', 'VIDEO'],
    default: 'IMAGE',
  },
  postDate: {
    type: Date,
    required: true,
  },
  permalink: {
    type: String,
    default: '',
  },
  reach: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  comments: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  saves: {
    type: Number,
    default: 0,
  },
  hashtags: [{
    type: String,
  }],
  isSynthetic: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

postSchema.index({ originalId: 1, userId: 1 });

export const Post = mongoose.model('Post', postSchema);
export default Post;
