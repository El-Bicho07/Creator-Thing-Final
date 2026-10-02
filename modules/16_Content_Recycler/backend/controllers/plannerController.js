import { PlanRepository, PostRepository } from '../db/storage.js';

export async function getPlanItems(req, res) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const items = await PlanRepository.find(filter);

    return res.json({
      success: true,
      count: items.length,
      planItems: items,
    });
  } catch (error) {
    console.error('[Planner Ctrl] getPlanItems error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve planner items.' });
  }
}

export async function createPlanItem(req, res) {
  try {
    const {
      postId,
      postSnapshot,
      recommendationType = 'REPURPOSE',
      targetFormat = 'REEL',
      plannedDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      notes = '',
      hookRevision = '',
      status = 'planned',
    } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'postId is required.' });
    }

    // If postSnapshot was not supplied, try to fetch from PostRepository
    let snapshot = postSnapshot;
    if (!snapshot) {
      const originalPost = await PostRepository.findById(postId) || await PostRepository.findByOriginalId(postId);
      if (originalPost) {
        snapshot = {
          caption: originalPost.caption,
          mediaType: originalPost.mediaType,
          postDate: originalPost.postDate,
          reach: originalPost.reach,
          likes: originalPost.likes,
          comments: originalPost.comments,
          shares: originalPost.shares,
          saves: originalPost.saves,
          hashtags: originalPost.hashtags,
        };
      }
    }

    const newItem = await PlanRepository.create({
      userId: req.user ? req.user.id : null,
      postId,
      postSnapshot: snapshot || {},
      recommendationType,
      targetFormat,
      plannedDate: new Date(plannedDate),
      notes,
      hookRevision,
      status,
    });

    return res.status(201).json({
      success: true,
      message: 'Added to Content Planner successfully.',
      planItem: newItem,
    });
  } catch (error) {
    console.error('[Planner Ctrl] createPlanItem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add item to planner.' });
  }
}

export async function updatePlanItem(req, res) {
  try {
    const { status, plannedDate, notes, hookRevision, targetFormat } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (plannedDate !== undefined) updateData.plannedDate = new Date(plannedDate);
    if (notes !== undefined) updateData.notes = notes;
    if (hookRevision !== undefined) updateData.hookRevision = hookRevision;
    if (targetFormat !== undefined) updateData.targetFormat = targetFormat;

    const updated = await PlanRepository.updateById(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Planner item not found.' });
    }

    return res.json({
      success: true,
      message: 'Planner item updated successfully.',
      planItem: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update planner item.' });
  }
}

export async function deletePlanItem(req, res) {
  try {
    const deleted = await PlanRepository.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Planner item not found.' });
    }

    return res.json({
      success: true,
      message: 'Item removed from planner successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove planner item.' });
  }
}

export async function clearAllPlanItems(req, res) {
  try {
    await PlanRepository.clearAll();
    return res.json({ success: true, message: 'Content planner cleared.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to clear planner.' });
  }
}
