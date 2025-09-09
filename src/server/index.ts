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
const submitScore: RequestHandler = async (req, res) => {
  const username = await reddit.getCurrentUsername();
  const userId = context.userId;

  console.log('username:', username);
  console.log('userId:', userId);
  console.log('req.body:', req.body);

  if (!username || !userId) {
    console.log('Not logged in');
    res.status(401).json({ status: 'error', message: 'Not logged in' });
    return;
  }

  const score = Number(req.body.score);
  console.log('Parsed score:', score);

  if (isNaN(score)) {
    console.log('Score is NaN');
    res.status(400).json({ status: 'error', message: 'Score must be a number' });
    return;
  }

  try {
    console.log('Saving to leaderboard...');
    await redis.zAdd('game:leaderboard', { member: userId, score });
    console.log('Saving username...');
    await redis.hSet('game:usernames', { [userId]: username });

    console.log('Score saved successfully');
    res.json({ status: 'success' });
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ status: 'error', message: 'Failed to save score' });
  }
};
router.post('/api/leaderboard/submit', submitScore);

// get top 10
router.get('/api/leaderboard/top', async (req, res) => {
  try {
    const entries = await redis.zRange('game:leaderboard', 0, -1);
    const sorted = entries.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const top = await Promise.all(
      sorted.slice(0, 10).map(async (e) => {
        const username = await redis.hGet('game:usernames', e.member);
        return { userId: e.member, score: e.score ?? 0, username };
      })
    );

    const userId = context?.userId;
    console.log('userId from context (me):', userId);
    let me: { userId: string; score: number; rank: number; username: string | undefined } | null = null;
    if (userId) {
      const index = sorted.findIndex(e => e.member === userId);
      if (index >= 0) {
        const e = sorted[index];
        const username = await reddit.getCurrentUsername();
        if (e) {
          me = { userId: e.member, score: e.score ?? 0, rank: index + 1, username };
        }
      } else {
        const score = await redis.zScore('game:leaderboard', userId);
        const username = await reddit.getCurrentUsername();
        me = { userId, score: score ?? 0, rank: sorted.length + 1, username };
      }
    }

    console.log('me to send:', me);

    res.json({ top, me });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to get leaderboard' });
  }
});

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