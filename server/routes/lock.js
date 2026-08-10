import express from 'express';
import { query, run } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─── POST /api/locks/acquire ─── Acquire editing lock on a farmer profile
router.post('/acquire', authenticateToken, async (req, res) => {
  const { farmer_id } = req.body;
  if (!farmer_id) {
    return res.status(400).json({ success: false, message: 'farmer_id is required' });
  }

  try {
    // Check for existing active lock
    const existing = await query(
      `SELECT es.*, u.name as locked_by_name
       FROM editing_sessions es
       JOIN users u ON u.id = es.locked_by_user_id
       WHERE es.farmer_id = ? AND es.expires_at > NOW()`,
      [farmer_id]
    );

    if (existing.length > 0) {
      const lock = existing[0];
      // Same user: refresh the lock
      if (lock.locked_by_user_id === req.user.id) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await run(
          'UPDATE editing_sessions SET expires_at = ? WHERE farmer_id = ?',
          [expiresAt, farmer_id]
        );
        return res.json({ success: true, message: 'Lock refreshed', data: { locked: true, yours: true } });
      }

      // Different user — return who holds the lock
      return res.status(409).json({
        success: false,
        message: `Currently being edited by ${lock.locked_by_name}. Please wait.`,
        error: { code: 'LOCK_CONFLICT', lockedBy: lock.locked_by_name, expiresAt: lock.expires_at },
      });
    }

    // No active lock — delete expired rows and acquire new lock
    await run('DELETE FROM editing_sessions WHERE farmer_id = ?', [farmer_id]);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL
    await run(
      'INSERT INTO editing_sessions (farmer_id, locked_by_user_id, locked_by_name, expires_at) VALUES (?, ?, ?, ?)',
      [farmer_id, req.user.id, req.user.name, expiresAt]
    );

    return res.json({ success: true, message: 'Lock acquired', data: { locked: true, yours: true, expiresAt } });
  } catch (err) {
    console.error('Acquire lock error:', err);
    res.status(500).json({ success: false, message: 'Failed to acquire lock' });
  }
});

// ─── DELETE /api/locks/release ─── Release editing lock
router.delete('/release', authenticateToken, async (req, res) => {
  const { farmer_id } = req.body;
  if (!farmer_id) {
    return res.status(400).json({ success: false, message: 'farmer_id is required' });
  }

  try {
    await run(
      'DELETE FROM editing_sessions WHERE farmer_id = ? AND locked_by_user_id = ?',
      [farmer_id, req.user.id]
    );
    return res.json({ success: true, message: 'Lock released' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to release lock' });
  }
});

// ─── GET /api/locks/status/:farmer_id ─── Check lock status
router.get('/status/:farmer_id', authenticateToken, async (req, res) => {
  const { farmer_id } = req.params;
  try {
    const locks = await query(
      `SELECT es.*, u.name as locked_by_name
       FROM editing_sessions es
       JOIN users u ON u.id = es.locked_by_user_id
       WHERE es.farmer_id = ? AND es.expires_at > NOW()`,
      [farmer_id]
    );

    if (locks.length === 0) {
      return res.json({ success: true, data: { isLocked: false } });
    }

    const lock = locks[0];
    return res.json({
      success: true,
      data: {
        isLocked: true,
        lockedByYou: lock.locked_by_user_id === req.user.id,
        lockedBy: lock.locked_by_name,
        expiresAt: lock.expires_at,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to check lock status' });
  }
});

export default router;
