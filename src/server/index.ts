import express, { RequestHandler } from 'express';
import { InitResponse } from '../shared/types/api';
import { redis, createServer, context, reddit } from '@devvit/web/server';
import { createPost } from './core/post';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

// --- INIT ---
router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required but missing from context' });
      return;
    }

    try {
      const count = await redis.get('count');
      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({ status: 'error', message: 'Initialization failed' });
    }
  }
);

// --- LEADERBOARD ---

// submit score
type LeaderboardType = 'points' | 'time' | 'combo_time' | 'objects_cut';
const submitScore: RequestHandler = async (req, res) => {
  const username = await reddit.getCurrentUsername();
  const userId = context.userId;

  if (!username || !userId) {
    res.status(401).json({ status: 'error', message: 'Not logged in' });
    return;
  }

  // el cliente manda { points, time, combo_time, objects_cut }
  const { points, time, combo_time, objects_cut } = req.body as {
    points: number;
    time: number;
    combo_time: number;
    objects_cut: number;
  };

  const metrics: Record<LeaderboardType, number> = {
    points: Number(points),
    time: Number(time),
    combo_time: Number(combo_time),
    objects_cut: Number(objects_cut),
  };

  try {
    // guardar todas las métricas en sus respectivos leaderboards
    for (const [key, score] of Object.entries(metrics)) {
      if (!isNaN(score)) {
        await redis.zAdd(getLeaderboardKey(key), { member: userId, score });
      }
    }

    // asegurar mapping userId -> username
    await redis.hSet('game:usernames', { [userId]: username });

    res.json({ status: 'success', saved: metrics });
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ status: 'error', message: 'Failed to save score' });
  }
};

router.post('/api/leaderboard/submit', submitScore);


// get top 10
router.get('/api/leaderboard/top', async (_req: any, res: any) => {
  const today = new Date().getDay();
  const dayKeys = ['sun','mon','tue','wed','thu','fri','sat'] as const;

  const challenges: Record<typeof dayKeys[number], { id: string }> = {
    sun: { id: 'points' },
    mon: { id: 'points' },
    tue: { id: 'time' },
    wed: { id: 'combo_time' },
    thu: { id: 'combo_time' },
    fri: { id: 'objects_cut' },
    sat: { id: 'time' },
  };

  const dayKey = dayKeys[today];
  if (!dayKey) return res.status(500).json({ status: 'error', message: 'Invalid day key' });

  const challengeType = challenges[dayKey].id;

  const leaderboardKey = getLeaderboardKey(challengeType);

  try {
      const zRangeResult: any = await redis.zRange(leaderboardKey, 0, -1);

      const topWithScores = await Promise.all(
        zRangeResult.map(async (entry: { score: number, member: string }) => {
          const userId = entry.member
          const score = entry.score ?? 0
          const username = await redis.hGet('game:usernames', userId)
          return { userId, username, score }
        })
      );

    const sorted = topWithScores.sort((a, b) => b.score - a.score);

    const top = sorted.slice(0, 10);

    const userId = context?.userId;
    let me: { userId: string; score: number; rank: number; username: string | undefined } | null = null;
    if (userId) {
      const index = sorted.findIndex(e => e.userId === userId);
      const score = (await redis.zScore(leaderboardKey, userId)) ?? 0;
      const username = await reddit.getCurrentUsername();
      me = { userId, score, rank: index >= 0 ? index + 1 : sorted.length + 1, username };
    }

    res.json({ top, me, challengeType });
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get leaderboard' });
  }
});

function getLeaderboardKey(type: string) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `leaderboard:${type}:${today}`;
}


// --- POST CREATION INTERNAL ---
router.post('/internal/on-app-install', async (_req, res) => {
  try {
    const post = await createPost();
    res.json({ status: 'success', message: `Post created in subreddit ${context.subredditName} with id ${post.id}` });
  } catch (error) {
    console.error(error);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

router.post('/internal/menu/post-create', async (_req, res) => {
  try {
    const post = await createPost();
    res.json({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}` });
  } catch (error) {
    console.error(error);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

app.use(router);

const port = process.env.WEBBIT_PORT || 3000;
const server = createServer(app);
server.on('error', (err) => console.error(err));
server.listen(port, () => console.log(`http://localhost:${port}`));