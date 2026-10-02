import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { PlanItem } from '../models/PlanItem.js';
import { memoryStore, isMemoryFallback } from './connection.js';

// Helper to generate IDs for memory storage
let idCounter = 1000;
const genId = () => `mem_${Date.now()}_${++idCounter}`;

export const UserRepository = {
  async findByEmail(email) {
    if (!isMemoryFallback) {
      return await User.findOne({ email: email.toLowerCase() });
    }
    for (const user of memoryStore.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  },

  async findById(id) {
    if (!isMemoryFallback) {
      return await User.findById(id);
    }
    return memoryStore.users.get(id) || null;
  },

  async create(userData) {
    if (!isMemoryFallback) {
      const user = new User(userData);
      return await user.save();
    }
    const id = genId();
    const newUser = {
      _id: id,
      ...userData,
      email: userData.email.toLowerCase(),
      creatorProfile: userData.creatorProfile || {
        handle: '@creator_hq',
        niche: 'Tech & Creator Growth',
        followers: 24500,
        bio: 'Building digital products & breaking down algorithmic strategies',
      },
      baselineWeights: userData.baselineWeights || {
        engagementWeight: 1.0,
        reachWeight: 0.8,
        savesMultiplier: 2.0,
        sharesMultiplier: 1.5,
        dormantDaysThreshold: 60,
      },
      createdAt: new Date(),
    };
    memoryStore.users.set(id, newUser);
    return newUser;
  },

  async updateById(id, updateData) {
    if (!isMemoryFallback) {
      return await User.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    }
    const user = memoryStore.users.get(id);
    if (!user) return null;
    const updated = {
      ...user,
      ...updateData,
      creatorProfile: {
        ...(user.creatorProfile || {}),
        ...(updateData.creatorProfile || {}),
      },
      baselineWeights: {
        ...(user.baselineWeights || {}),
        ...(updateData.baselineWeights || {}),
      },
    };
    memoryStore.users.set(id, updated);
    return updated;
  }
};

export const PostRepository = {
  async find(filter = {}, sort = { postDate: -1 }) {
    if (!isMemoryFallback) {
      return await Post.find(filter).sort(sort);
    }
    let list = Array.from(memoryStore.posts.values());
    
    // Apply filters
    if (filter.mediaType && filter.mediaType !== 'ALL') {
      list = list.filter(p => p.mediaType === filter.mediaType);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(p => 
        (p.caption && p.caption.toLowerCase().includes(q)) ||
        (p.hashtags && p.hashtags.some(tag => tag.toLowerCase().includes(q)))
      );
    }
    if (filter.userId) {
      list = list.filter(p => p.userId === filter.userId || !p.userId);
    }

    // Apply sort
    const [sortKey, sortDir] = Object.entries(sort)[0] || ['postDate', -1];
    list.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();
      if (sortDir === -1) return (valB || 0) > (valA || 0) ? 1 : -1;
      return (valA || 0) > (valB || 0) ? 1 : -1;
    });

    return list;
  },

  async findById(id) {
    if (!isMemoryFallback) {
      return await Post.findById(id);
    }
    return memoryStore.posts.get(id) || null;
  },

  async findByOriginalId(originalId) {
    if (!isMemoryFallback) {
      return await Post.findOne({ originalId });
    }
    for (const post of memoryStore.posts.values()) {
      if (post.originalId === originalId) return post;
    }
    return null;
  },

  async insertMany(postsArray) {
    if (!isMemoryFallback) {
      return await Post.insertMany(postsArray);
    }
    const inserted = [];
    for (const p of postsArray) {
      const id = p._id || genId();
      const newPost = {
        _id: id,
        ...p,
        postDate: new Date(p.postDate),
        createdAt: new Date(),
      };
      memoryStore.posts.set(id, newPost);
      inserted.push(newPost);
    }
    return inserted;
  },

  async deleteById(id) {
    if (!isMemoryFallback) {
      return await Post.findByIdAndDelete(id);
    }
    const exists = memoryStore.posts.get(id);
    memoryStore.posts.delete(id);
    return exists;
  },

  async count(filter = {}) {
    if (!isMemoryFallback) {
      return await Post.countDocuments(filter);
    }
    return memoryStore.posts.size;
  },

  async clearAll() {
    if (!isMemoryFallback) {
      return await Post.deleteMany({});
    }
    memoryStore.posts.clear();
    return true;
  }
};

export const PlanRepository = {
  async find(filter = {}) {
    if (!isMemoryFallback) {
      return await PlanItem.find(filter).sort({ plannedDate: 1 });
    }
    let list = Array.from(memoryStore.planItems.values());
    if (filter.status && filter.status !== 'all') {
      list = list.filter(item => item.status === filter.status);
    }
    list.sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate));
    return list;
  },

  async findById(id) {
    if (!isMemoryFallback) {
      return await PlanItem.findById(id);
    }
    return memoryStore.planItems.get(id) || null;
  },

  async create(planData) {
    if (!isMemoryFallback) {
      const item = new PlanItem(planData);
      return await item.save();
    }
    const id = genId();
    const newItem = {
      _id: id,
      ...planData,
      status: planData.status || 'planned',
      plannedDate: new Date(planData.plannedDate || Date.now()),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.planItems.set(id, newItem);
    return newItem;
  },

  async updateById(id, updateData) {
    if (!isMemoryFallback) {
      return await PlanItem.findByIdAndUpdate(id, { $set: updateData, updatedAt: new Date() }, { new: true });
    }
    const item = memoryStore.planItems.get(id);
    if (!item) return null;
    const updated = {
      ...item,
      ...updateData,
      updatedAt: new Date(),
    };
    memoryStore.planItems.set(id, updated);
    return updated;
  },

  async deleteById(id) {
    if (!isMemoryFallback) {
      return await PlanItem.findByIdAndDelete(id);
    }
    const exists = memoryStore.planItems.get(id);
    memoryStore.planItems.delete(id);
    return exists;
  },

  async clearAll() {
    if (!isMemoryFallback) {
      return await PlanItem.deleteMany({});
    }
    memoryStore.planItems.clear();
    return true;
  }
};
