import express from 'express';
import cors from 'cors';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from './middleware/auth';
import { generateAIInsights } from './services/insightEngine';
import { generateAIPredictions } from './services/predictionEngine';
import path from 'path';

import { startNotificationScheduler, checkAndSendNotifications } from './services/notificationScheduler';
import { getPublicKey } from './services/pushService';
import { updateDailyProgress, getLocalMidnight } from './services/progressService';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'lifeos-ai-super-secret-token-key-2035';

// Allow all origins (required for Render cross-service calls)
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

// Serve static files from the React frontend app
app.use(express.static(path.join(process.cwd(), 'frontend', 'dist')));

// Health check endpoint (keep Render free tier awake)
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'LifeOS AI Backend', ts: Date.now() }));

// Helper to track user logins, counts, and calculate daily streak
async function trackUserLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const today = new Date();
  const tz = user.timezone || 'UTC';
  
  // Calculate local date (midnight) for today and last login
  let localToday;
  try {
    localToday = new Date(today.toLocaleDateString('en-US', { timeZone: tz }));
  } catch (e) {
    localToday = new Date(today.toLocaleDateString('en-US', { timeZone: 'UTC' }));
  }
  localToday.setHours(0, 0, 0, 0);

  let newStreak = user.streak;
  if (user.lastLogin) {
    let localLastLogin;
    try {
      localLastLogin = new Date(user.lastLogin.toLocaleDateString('en-US', { timeZone: tz }));
    } catch (e) {
      localLastLogin = new Date(user.lastLogin.toLocaleDateString('en-US', { timeZone: 'UTC' }));
    }
    localLastLogin.setHours(0, 0, 0, 0);

    const diffDays = Math.round((localToday.getTime() - localLastLogin.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1; // streak reset
    }
  } else {
    newStreak = 1; // first login
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      loginCount: { increment: 1 },
      lastLogin: today,
      streak: newStreak,
    },
  });
}

// Public Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, age, occupation, timezone } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        age: age ? parseInt(age) : null,
        occupation,
        timezone,
        authProvider: 'EMAIL',
        profileSetup: {
          create: {
            preferredWorkingHoursStart: '09:00',
            preferredWorkingHoursEnd: '17:00',
          },
        },
      },
    });

    await trackUserLogin(user.id);
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        streak: updatedUser!.streak,
        notificationEnabled: updatedUser!.notificationEnabled,
        reminderTimes: updatedUser!.reminderTimes,
        authProvider: updatedUser!.authProvider,
        profilePicture: updatedUser!.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server registration error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Google-only accounts shouldn't log in with password
    if (user.authProvider === 'GOOGLE' && !user.passwordHash) {
      return res.status(400).json({ error: 'This account uses Google Sign-In. Please click "Continue with Google".' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    await trackUserLogin(user.id);
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        streak: updatedUser!.streak,
        notificationEnabled: updatedUser!.notificationEnabled,
        reminderTimes: updatedUser!.reminderTimes,
        authProvider: updatedUser!.authProvider,
        profilePicture: updatedUser!.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server login error' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  const { credential, name: customName, email: customEmail, picture: customPicture, timezone } = req.body;
  try {
    let email = '';
    let name = '';
    let picture = '';

    if (credential && credential.startsWith('mock_google_')) {
      // Mock Google Login for development/testing
      const parts = credential.split('_');
      email = parts[2] || 'mock@gmail.com';
      name = parts[3] || 'Mock Google User';
      picture = parts[4] || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
    } else if (credential) {
      // Real Google verification
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!verifyRes.ok) {
        return res.status(400).json({ error: 'Invalid Google Credential Token' });
      }
      const payload: any = await verifyRes.json();
      email = payload.email;
      name = payload.name;
      picture = payload.picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
    } else {
      // Direct mock if credential is empty but email/name are supplied (from developer interface)
      email = customEmail || 'developer@lifeos.ai';
      name = customName || 'Developer Mode';
      picture = customPicture || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
    }

    if (!email) {
      return res.status(400).json({ error: 'Failed to retrieve email from Google Account' });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Register new Google user
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: '', // Login via Google has empty hash
          name,
          profilePicture: picture,
          authProvider: 'GOOGLE',
          timezone: timezone || 'UTC',
          profileSetup: {
            create: {
              preferredWorkingHoursStart: '09:00',
              preferredWorkingHoursEnd: '17:00',
            },
          },
        },
      });
    } else {
      // Update profile picture and authProvider for existing user if not already set
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          profilePicture: picture || user.profilePicture,
          authProvider: user.authProvider === 'EMAIL' ? 'EMAIL' : 'GOOGLE', // Keep original EMAIL if they registered by email first, but let them login
        },
      });
    }

    await trackUserLogin(user.id);
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        streak: updatedUser!.streak,
        notificationEnabled: updatedUser!.notificationEnabled,
        reminderTimes: updatedUser!.reminderTimes,
        authProvider: updatedUser!.authProvider,
        profilePicture: updatedUser!.profilePicture
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Server Google login error' });
  }
});

// Protect all /api endpoints below this using authorization middleware
app.use('/api', authenticateToken);

// User Profile Details
app.get('/api/auth/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profileSetup: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/profile', async (req: AuthenticatedRequest, res) => {
  const { name, age, occupation, timezone, preferredWorkingHoursStart, preferredWorkingHoursEnd, lifeGoals, skills, interests } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name,
        age: age ? parseInt(age) : null,
        occupation,
        timezone,
        profileSetup: {
          update: {
            preferredWorkingHoursStart,
            preferredWorkingHoursEnd,
            lifeGoals,
            skills,
            interests,
          },
        },
      },
      include: { profileSetup: true },
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// Session Validation
app.get('/api/auth/validate', async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        streak: true,
        notificationEnabled: true,
        reminderTimes: true,
        authProvider: true,
        profilePicture: true,
        timezone: true
      }
    });
    if (!user) return res.status(401).json({ error: 'Session expired' });
    res.json({ valid: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error validating session' });
  }
});

// Notification Preferences
app.get('/api/notifications/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { notificationEnabled: true, reminderTimes: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching settings' });
  }
});

app.post('/api/notifications/settings', async (req: AuthenticatedRequest, res) => {
  const { notificationEnabled, reminderTimes } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        notificationEnabled: !!notificationEnabled,
        reminderTimes: reminderTimes || "09:00,14:00,20:00"
      },
      select: { notificationEnabled: true, reminderTimes: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating settings' });
  }
});

// VAPID & Subscriptions
app.get('/api/notifications/vapid-key', (_req, res) => {
  try {
    const publicKey = getPublicKey();
    res.json({ publicKey });
  } catch (error) {
    res.status(500).json({ error: 'Error getting VAPID public key' });
  }
});

app.post('/api/notifications/subscribe', async (req: AuthenticatedRequest, res) => {
  const { subscription, deviceType } = req.body;
  if (!subscription) {
    return res.status(400).json({ error: 'Subscription is required' });
  }
  try {
    const tokenStr = typeof subscription === 'string' ? subscription : JSON.stringify(subscription);
    const existing = await prisma.deviceToken.findFirst({
      where: { userId: req.userId!, token: tokenStr }
    });
    if (existing) {
      return res.json({ success: true, message: 'Already subscribed' });
    }
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId: req.userId!,
        token: tokenStr,
        deviceType: deviceType || 'web'
      }
    });
    res.status(201).json(deviceToken);
  } catch (error) {
    res.status(500).json({ error: 'Error registering push subscription' });
  }
});

app.post('/api/notifications/unsubscribe', async (req: AuthenticatedRequest, res) => {
  const { subscription } = req.body;
  if (!subscription) {
    return res.status(400).json({ error: 'Subscription is required' });
  }
  try {
    const tokenStr = typeof subscription === 'string' ? subscription : JSON.stringify(subscription);
    await prisma.deviceToken.deleteMany({
      where: { userId: req.userId!, token: tokenStr }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error removing subscription' });
  }
});

// Test Trigger manually
app.post('/api/notifications/test-trigger', async (req: AuthenticatedRequest, res) => {
  try {
    await checkAndSendNotifications();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// User Engagement Summary
app.get('/api/activity/summary', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loginCount: true, lastLogin: true, streak: true, timezone: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tz = user.timezone || 'UTC';
    const localMidnight = getLocalMidnight(tz);

    const sevenDaysAgo = new Date(localMidnight.getTime() - 6 * 24 * 60 * 60 * 1000);
    const weeklyLogs = await prisma.progress.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' }
    });

    const thirtyDaysAgo = new Date(localMidnight.getTime() - 29 * 24 * 60 * 60 * 1000);
    const monthlyLogs = await prisma.progress.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' }
    });

    const tasksCount = await prisma.task.count({ where: { userId, status: 'COMPLETED' } });
    const goalsCount = await prisma.goal.count({ where: { userId, status: 'COMPLETED' } });
    const journalsCount = await prisma.journalEntry.count({ where: { userId } });

    res.json({
      loginCount: user.loginCount,
      lastLogin: user.lastLogin,
      streak: user.streak,
      tasksCompleted: tasksCount,
      goalsCompleted: goalsCount,
      journalsCount,
      weeklyLogs,
      monthlyLogs
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching activity' });
  }
});

// Dashboard Aggregation API
app.get('/api/dashboard', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true, timezone: true }
    });
    const tz = userRecord?.timezone || 'UTC';
    const midnight = getLocalMidnight(tz);
    const startOfToday = midnight;

    // Get current life score history
    const latestScore = await prisma.lifeScoreHistory.findFirst({
      where: { userId },
      orderBy: { loggedDate: 'desc' },
    });

    // Get habits completion for today
    const habits = await prisma.habit.findMany({ where: { userId } });
    const habitLogsToday = await prisma.habitLog.findMany({
      where: {
        habit: { userId },
        completedAt: { gte: startOfToday },
      },
    });

    // Get goals progress
    const goals = await prisma.goal.findMany({ where: { userId } });

    // Get tasks status
    const tasks = await prisma.task.findMany({ where: { userId } });

    // Latest sleep log
    const sleep = await prisma.sleepLog.findFirst({
      where: { userId },
      orderBy: { sleepTime: 'desc' },
    });

    // Latest mood log
    const mood = await prisma.moodLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Today's water intake
    const waterLogsToday = await prisma.waterLog.findMany({
      where: { userId, loggedDate: { gte: startOfToday } },
    });
    const totalWaterMl = waterLogsToday.reduce((sum, log) => sum + log.amountMl, 0);

    // Today's fitness steps
    const fitnessToday = await prisma.fitnessLog.findFirst({
      where: { userId, loggedDate: { gte: startOfToday } },
    });

    // Today's learning duration
    const learningToday = await prisma.learningSession.findMany({
      where: { userId, createdAt: { gte: startOfToday } },
    });
    const totalLearningMins = learningToday.reduce((sum, s) => sum + s.durationMinutes, 0);

    // Today's total expenses
    const expensesToday = await prisma.expense.findMany({
      where: { userId, transactionDate: { gte: startOfToday } },
    });
    const totalExpensesToday = expensesToday.reduce((sum, e) => sum + e.amount, 0);

    // Find next goal reminder (nearest incomplete goal deadline)
    const nextGoal = await prisma.goal.findFirst({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        deadline: { not: null }
      },
      orderBy: { deadline: 'asc' }
    });

    // Find recent achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
      take: 3
    });

    // Today's progress log
    const progressToday = await prisma.progress.findUnique({
      where: { userId_date: { userId, date: midnight } }
    });

    res.json({
      lifeScore: latestScore?.overallScore || 78,
      streakCount: userRecord?.streak || 0,
      latestMood: mood?.emoji || '😊',
      latestSleepScore: sleep?.sleepScore || 85,
      latestSleepDurationHours: sleep ? (sleep.durationMinutes / 60).toFixed(1) : '7.5',
      waterMl: totalWaterMl,
      steps: fitnessToday?.steps || 0,
      learningMins: totalLearningMins,
      expensesToday: totalExpensesToday,
      goalsCount: goals.length,
      goalsCompleted: goals.filter(g => g.status === 'COMPLETED').length,
      tasksCompleted: tasks.filter(t => t.status === 'COMPLETED').length,
      tasksTotal: tasks.length,
      habitsCompletedToday: habitLogsToday.filter(hl => hl.status === 'COMPLETED').length,
      habitsTotal: habits.length,
      productivityScore: progressToday?.productivityScore || 0,
      nextGoalReminder: nextGoal ? { title: nextGoal.title, deadline: nextGoal.deadline } : null,
      recentAchievements: userAchievements.map(ua => ({
        id: ua.achievement.id,
        title: ua.achievement.title,
        description: ua.achievement.description,
        xpReward: ua.achievement.xpReward,
        unlockedAt: ua.unlockedAt
      })),
      completionPercent: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100) : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Error building dashboard metrics' });
  }
});

// Goals Endpoints
app.get('/api/goals', async (req: AuthenticatedRequest, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      include: { suggestions: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching goals' });
  }
});

app.post('/api/goals', async (req: AuthenticatedRequest, res) => {
  const { title, description, category, priority, deadline } = req.body;
  try {
    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        title,
        description,
        category,
        priority,
        status: 'TODO',
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    // Create a mock AI suggestion for this new goal
    await prisma.goalSuggestion.create({
      data: {
        goalId: goal.id,
        suggestionText: `To complete your "${title}" goal, schedule 30 minutes of deep focus every Tuesday/Thursday mornings when your energy is typically above 8/10.`,
      },
    });

    await updateDailyProgress(req.userId!);
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Error creating goal' });
  }
});

app.put('/api/goals/:id', async (req: AuthenticatedRequest, res) => {
  const { title, description, category, priority, status, progress, deadline } = req.body;
  try {
    const goal = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        category,
        priority,
        status,
        progress: progress ? parseFloat(progress) : 0,
        deadline: deadline ? new Date(deadline) : null,
      },
    });
    await updateDailyProgress(req.userId!);
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Error updating goal' });
  }
});

app.delete('/api/goals/:id', async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting goal' });
  }
});

// Tasks Endpoints
app.get('/api/tasks', async (req: AuthenticatedRequest, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    // Serialize BigInt estimatedTimeMs for JSON response
    const serialized = tasks.map(t => ({
      ...t,
      estimatedTimeMs: t.estimatedTimeMs ? t.estimatedTimeMs.toString() : null,
    }));
    res.json(serialized);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

app.post('/api/tasks', async (req: AuthenticatedRequest, res) => {
  const { title, description, category, priority, difficulty, energyNeeded, estimatedTimeMinutes, plannedTime } = req.body;
  try {
    const estimatedTimeMs = estimatedTimeMinutes ? BigInt(parseInt(estimatedTimeMinutes) * 60 * 1000) : null;
    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title,
        description,
        category,
        priority,
        difficulty,
        energyNeeded,
        estimatedTimeMs,
        plannedTime: plannedTime ? new Date(plannedTime) : null,
        status: 'TODO',
      },
    });

    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        statusChangedFrom: 'NONE',
        statusChangedTo: 'TODO',
      },
    });

    await updateDailyProgress(req.userId!);
    res.status(201).json({
      ...task,
      estimatedTimeMs: task.estimatedTimeMs ? task.estimatedTimeMs.toString() : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

app.put('/api/tasks/:id', async (req: AuthenticatedRequest, res) => {
  const { title, description, category, priority, difficulty, energyNeeded, status, completionPercent, actualTime, delay } = req.body;
  try {
    const originalTask = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!originalTask) return res.status(404).json({ error: 'Task not found' });

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        category,
        priority,
        difficulty,
        energyNeeded,
        status,
        completionPercent: completionPercent ? parseFloat(completionPercent) : 0,
        actualTime: actualTime ? new Date(actualTime) : (status === 'COMPLETED' ? new Date() : null),
        delay: delay ? parseFloat(delay) : null,
      },
    });

    if (originalTask.status !== status) {
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          statusChangedFrom: originalTask.status,
          statusChangedTo: status,
        },
      });
    }

    await updateDailyProgress(req.userId!);
    res.json({
      ...task,
      estimatedTimeMs: task.estimatedTimeMs ? task.estimatedTimeMs.toString() : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error updating task' });
  }
});

app.delete('/api/tasks/:id', async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    await updateDailyProgress(req.userId!);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});

// Habits Endpoints
app.get('/api/habits', async (req: AuthenticatedRequest, res) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId },
      include: {
        logs: {
          orderBy: { completedAt: 'desc' },
          take: 30,
        },
      },
    });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching habits' });
  }
});

app.post('/api/habits', async (req: AuthenticatedRequest, res) => {
  const { name, frequency, targetCount, category } = req.body;
  try {
    const habit = await prisma.habit.create({
      data: {
        userId: req.userId!,
        name,
        frequency,
        targetCount: targetCount ? parseInt(targetCount) : 1,
        category,
        streakCount: 0,
        maxStreak: 0,
      },
    });
    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Error creating habit' });
  }
});

app.post('/api/habits/:id/log', async (req: AuthenticatedRequest, res) => {
  const { status, notes, completedAt } = req.body;
  try {
    const logDate = completedAt ? new Date(completedAt) : new Date();
    const habit = await prisma.habit.findUnique({ where: { id: req.params.id } });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    // Log the habit execution
    const log = await prisma.habitLog.create({
      data: {
        habitId: habit.id,
        completedAt: logDate,
        status,
        notes,
      },
    });

    // Update streak if completed
    let newStreak = habit.streakCount;
    if (status === 'COMPLETED') {
      newStreak += 1;
    } else {
      newStreak = 0; // reset streak if skipped/missed
    }
    const newMaxStreak = Math.max(habit.maxStreak, newStreak);

    const updatedHabit = await prisma.habit.update({
      where: { id: habit.id },
      data: {
        streakCount: newStreak,
        maxStreak: newMaxStreak,
      },
    });

    res.json({ log, habit: updatedHabit });
  } catch (error) {
    res.status(500).json({ error: 'Error logging habit completion' });
  }
});

app.delete('/api/habits/:id', async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.habit.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting habit' });
  }
});

// Sleep Endpoints
app.get('/api/sleep', async (req: AuthenticatedRequest, res) => {
  try {
    const sleepLogs = await prisma.sleepLog.findMany({
      where: { userId: req.userId },
      orderBy: { sleepTime: 'desc' },
      take: 30,
    });
    res.json(sleepLogs);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching sleep logs' });
  }
});

app.post('/api/sleep', async (req: AuthenticatedRequest, res) => {
  const { sleepTime, wakeTime, qualityScore, dreamNotes } = req.body;
  try {
    const start = new Date(sleepTime);
    const end = new Date(wakeTime);
    const durationMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    
    // Quality & duration weights to calculate a sleep score
    const durationScore = Math.min(100, Math.floor((durationMinutes / 480) * 100)); // 8 hours is 100%
    const sleepScore = Math.round((parseInt(qualityScore) * 0.7) + (durationScore * 0.3));

    const sleepLog = await prisma.sleepLog.create({
      data: {
        userId: req.userId!,
        sleepTime: start,
        wakeTime: end,
        durationMinutes,
        qualityScore: parseInt(qualityScore),
        sleepScore,
        dreamNotes,
      },
    });
    res.status(201).json(sleepLog);
  } catch (error) {
    res.status(500).json({ error: 'Error logging sleep' });
  }
});

// Mood Endpoints
app.get('/api/mood', async (req: AuthenticatedRequest, res) => {
  try {
    const moodLogs = await prisma.moodLog.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json(moodLogs);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching mood logs' });
  }
});

app.post('/api/mood', async (req: AuthenticatedRequest, res) => {
  const { emoji, stressLevel, energyLevel, confidenceLevel, motivationLevel, journalSnippet } = req.body;
  try {
    const moodLog = await prisma.moodLog.create({
      data: {
        userId: req.userId!,
        emoji,
        stressLevel: parseInt(stressLevel),
        energyLevel: parseInt(energyLevel),
        confidenceLevel: parseInt(confidenceLevel),
        motivationLevel: parseInt(motivationLevel),
        journalSnippet,
      },
    });
    res.status(201).json(moodLog);
  } catch (error) {
    res.status(500).json({ error: 'Error logging mood' });
  }
});

// Learning Tracker Endpoints
app.get('/api/learning/summary', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const sessions = await prisma.learningSession.findMany({ where: { userId } });
    const courses = await prisma.course.findMany({ where: { userId } });
    const books = await prisma.book.findMany({ where: { userId } });

    res.json({ sessions, courses, books });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching learning data' });
  }
});

app.post('/api/learning/session', async (req: AuthenticatedRequest, res) => {
  const { category, durationMinutes, notes } = req.body;
  try {
    const session = await prisma.learningSession.create({
      data: {
        userId: req.userId!,
        category,
        durationMinutes: parseInt(durationMinutes),
        notes,
      },
    });
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Error logging learning session' });
  }
});

app.get('/api/learning/courses', async (req: AuthenticatedRequest, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching courses' });
  }
});

app.post('/api/learning/courses', async (req: AuthenticatedRequest, res) => {
  const { title, platform, url } = req.body;
  try {
    const course = await prisma.course.create({
      data: {
        userId: req.userId!,
        title,
        platform,
        url,
        status: 'IN_PROGRESS',
        progress: 0,
      },
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Error creating course record' });
  }
});

app.put('/api/learning/courses/:id', async (req: AuthenticatedRequest, res) => {
  const { status, progress, certificateUrl } = req.body;
  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        status,
        progress: progress ? parseFloat(progress) : 0,
        certificateUrl,
      },
    });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Error updating course progress' });
  }
});

app.get('/api/learning/books', async (req: AuthenticatedRequest, res) => {
  try {
    const books = await prisma.book.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching books' });
  }
});

app.post('/api/learning/books', async (req: AuthenticatedRequest, res) => {
  const { title, author, totalPages } = req.body;
  try {
    const book = await prisma.book.create({
      data: {
        userId: req.userId!,
        title,
        author,
        totalPages: parseInt(totalPages),
        currentPage: 0,
        progress: 0,
        status: 'TO_READ',
      },
    });
    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ error: 'Error creating book record' });
  }
});

app.put('/api/learning/books/:id', async (req: AuthenticatedRequest, res) => {
  const { currentPage, rating, review, status } = req.body;
  try {
    const book = await prisma.book.findUnique({ where: { id: req.params.id } });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const currentPg = currentPage ? parseInt(currentPage) : book.currentPage;
    const progress = parseFloat(((currentPg / book.totalPages) * 100).toFixed(1));
    const calculatedStatus = currentPg >= book.totalPages ? 'COMPLETED' : (status || book.status);

    const updatedBook = await prisma.book.update({
      where: { id: req.params.id },
      data: {
        currentPage: currentPg,
        progress,
        status: calculatedStatus,
        rating: rating ? parseInt(rating) : book.rating,
        review,
      },
    });
    res.json(updatedBook);
  } catch (error) {
    res.status(500).json({ error: 'Error updating book details' });
  }
});

// Digital Habits Screen Time
app.get('/api/digital', async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await prisma.digitalHabitLog.findMany({
      where: { userId: req.userId },
      orderBy: { loggedDate: 'desc' },
      take: 60,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching digital habit logs' });
  }
});

app.post('/api/digital', async (req: AuthenticatedRequest, res) => {
  const { applicationName, durationMinutes, category, loggedDate } = req.body;
  try {
    const log = await prisma.digitalHabitLog.create({
      data: {
        userId: req.userId!,
        applicationName,
        durationMinutes: parseInt(durationMinutes),
        category,
        loggedDate: loggedDate ? new Date(loggedDate) : new Date(),
      },
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Error logging screen time' });
  }
});

// Financial Tracker (Expenses, Income, Budget)
app.get('/api/finance/summary', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const expenses = await prisma.expense.findMany({ where: { userId }, orderBy: { transactionDate: 'desc' } });
    const incomes = await prisma.income.findMany({ where: { userId }, orderBy: { transactionDate: 'desc' } });
    const budgets = await prisma.budget.findMany({ where: { userId } });

    res.json({ expenses, incomes, budgets });
  } catch (error) {
    res.status(500).json({ error: 'Error compiling financial logs' });
  }
});

app.post('/api/finance/expense', async (req: AuthenticatedRequest, res) => {
  const { amount, category, merchant, description, isSubscription, transactionDate } = req.body;
  try {
    const expense = await prisma.expense.create({
      data: {
        userId: req.userId!,
        amount: parseFloat(amount),
        category,
        merchant,
        description,
        isSubscription: !!isSubscription,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      },
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Error logging expense' });
  }
});

app.post('/api/finance/income', async (req: AuthenticatedRequest, res) => {
  const { amount, source, description, transactionDate } = req.body;
  try {
    const income = await prisma.income.create({
      data: {
        userId: req.userId!,
        amount: parseFloat(amount),
        source,
        description,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      },
    });
    res.status(201).json(income);
  } catch (error) {
    res.status(500).json({ error: 'Error logging income' });
  }
});

app.post('/api/finance/budget', async (req: AuthenticatedRequest, res) => {
  const { category, amountLimit, period } = req.body;
  try {
    // Upsert budget for category
    const existing = await prisma.budget.findFirst({
      where: { userId: req.userId!, category, period },
    });

    let budget;
    if (existing) {
      budget = await prisma.budget.update({
        where: { id: existing.id },
        data: { amountLimit: parseFloat(amountLimit) },
      });
    } else {
      budget = await prisma.budget.create({
        data: {
          userId: req.userId!,
          category,
          amountLimit: parseFloat(amountLimit),
          period,
        },
      });
    }
    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Error setting budget' });
  }
});

// Fitness & Water Endpoints
app.get('/api/fitness', async (req: AuthenticatedRequest, res) => {
  try {
    const fitnessLogs = await prisma.fitnessLog.findMany({
      where: { userId: req.userId },
      orderBy: { loggedDate: 'desc' },
      take: 30,
    });
    const waterLogs = await prisma.waterLog.findMany({
      where: { userId: req.userId },
      orderBy: { loggedDate: 'desc' },
      take: 30,
    });
    res.json({ fitness: fitnessLogs, water: waterLogs });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching fitness/health logs' });
  }
});

app.post('/api/fitness', async (req: AuthenticatedRequest, res) => {
  const { workoutType, durationMinutes, caloriesBurned, weightKg, steps, loggedDate } = req.body;
  try {
    const activeDate = loggedDate ? new Date(loggedDate) : new Date();
    // Calculate health score & BMI
    const activeSteps = steps ? parseInt(steps) : 0;
    const durMins = durationMinutes ? parseInt(durationMinutes) : 0;
    const healthScore = Math.min(100, Math.floor(65 + (activeSteps / 10000) * 15 + (durMins > 0 ? 15 : 0) + (Math.random() * 5)));
    const bmi = weightKg ? parseFloat((parseFloat(weightKg) / (1.8 * 1.8)).toFixed(1)) : null; // Mock height of 1.8m

    const log = await prisma.fitnessLog.create({
      data: {
        userId: req.userId!,
        workoutType,
        durationMinutes: durMins || null,
        caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        steps: activeSteps || null,
        bmi,
        healthScore,
        loggedDate: activeDate,
      },
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Error logging fitness' });
  }
});

app.post('/api/water', async (req: AuthenticatedRequest, res) => {
  const { amountMl, loggedDate } = req.body;
  try {
    const log = await prisma.waterLog.create({
      data: {
        userId: req.userId!,
        amountMl: parseInt(amountMl),
        loggedDate: loggedDate ? new Date(loggedDate) : new Date(),
      },
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Error logging water' });
  }
});

// Journal Endpoints (reflections, search)
app.get('/api/journal', async (req: AuthenticatedRequest, res) => {
  const { search } = req.query;
  try {
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        userId: req.userId!,
        OR: search ? [
          { reflections: { contains: String(search) } },
          { gratitudeContent: { contains: String(search) } },
          { achievements: { contains: String(search) } },
        ] : undefined,
      },
      orderBy: { entryDate: 'desc' },
    });
    res.json(journalEntries);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching journal entries' });
  }
});

app.post('/api/journal', async (req: AuthenticatedRequest, res) => {
  const { entryDate, reflections, gratitudeContent, achievements, failures, lessonsLearned, moodEmoji } = req.body;
  try {
    const journal = await prisma.journalEntry.create({
      data: {
        userId: req.userId!,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        reflections,
        gratitudeContent,
        achievements,
        failures,
        lessonsLearned,
        moodEmoji,
      },
    });
    res.status(201).json(journal);
  } catch (error) {
    res.status(500).json({ error: 'Error creating journal entry' });
  }
});

// AI Insights API
app.get('/api/ai/insights', async (req: AuthenticatedRequest, res) => {
  try {
    const insights = await generateAIInsights(req.userId!);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Error generating AI insights' });
  }
});

// AI Predictions API
app.get('/api/ai/predictions', async (req: AuthenticatedRequest, res) => {
  try {
    const predictions = await generateAIPredictions(req.userId!);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Error generating AI predictions' });
  }
});

// Achievements API
app.get('/api/achievements', async (req: AuthenticatedRequest, res) => {
  try {
    const allAchievements = await prisma.achievement.findMany();
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: req.userId },
      include: { achievement: true },
    });

    const unlockedIds = userAchievements.map(ua => ua.achievementId);
    
    // Merge into list with "unlocked" flag
    const list = allAchievements.map(ach => ({
      ...ach,
      unlocked: unlockedIds.includes(ach.id),
      unlockedAt: userAchievements.find(ua => ua.achievementId === ach.id)?.unlockedAt || null,
    }));

    // Calculate level and total XP from unlocked achievements
    const totalXP = userAchievements.reduce((sum, ua) => sum + ua.achievement.xpReward, 0);
    // XP level curve: Level = Math.floor(sqrt(XP / 100)) + 1
    const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const currentLevelXP = Math.pow(level - 1, 2) * 100;
    const levelProgress = totalXP > 0 ? ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 0;

    res.json({
      achievements: list,
      totalXP,
      level,
      levelProgress: parseFloat(levelProgress.toFixed(1)),
      nextLevelXP,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving achievements' });
  }
});

// Notifications Endpoints
app.get('/api/notifications', async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

app.post('/api/notifications/:id/read', async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating notification' });
  }
});

// Life Score History (for line chart visualization)
app.get('/api/lifescores', async (req: AuthenticatedRequest, res) => {
  try {
    const scores = await prisma.lifeScoreHistory.findMany({
      where: { userId: req.userId },
      orderBy: { loggedDate: 'asc' },
      take: 30, // Last 30 days
    });
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching life score trends' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/notifications — list all in-app notifications for the current user
app.get('/api/notifications', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/:id/read — mark a single notification as read
app.post('/api/notifications/:id/read', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.userId },
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// POST /api/notifications/read-all — mark all notifications as read
app.post('/api/notifications/read-all', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// GET /api/notifications/settings — get current user's notification preferences
app.get('/api/notifications/settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { notificationEnabled: true, reminderTimes: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// POST /api/notifications/settings — update notification preferences
app.post('/api/notifications/settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { notificationEnabled, reminderTimes } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(typeof notificationEnabled === 'boolean' && { notificationEnabled }),
        ...(typeof reminderTimes === 'string' && { reminderTimes }),
      },
      select: { notificationEnabled: true, reminderTimes: true },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error saving notification settings:', error);
    res.status(500).json({ error: 'Failed to save notification settings' });
  }
});

// GET /api/notifications/vapid-key — return VAPID public key for push subscription
app.get('/api/notifications/vapid-key', authenticateToken, (_req, res) => {
  try {
    const publicKey = getPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    res.status(500).json({ error: 'VAPID key not available' });
  }
});

// POST /api/notifications/subscribe — save browser push subscription
app.post('/api/notifications/subscribe', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { subscription, deviceType = 'web' } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription object is required' });

    const tokenString = JSON.stringify(subscription);

    // Upsert — avoid duplicates by looking for the exact same subscription endpoint
    const existing = await prisma.deviceToken.findFirst({
      where: { userId: req.userId, token: tokenString },
    });

    if (!existing) {
      await prisma.deviceToken.create({
        data: {
          userId: req.userId!,
          token: tokenString,
          deviceType,
        },
      });
    }

    res.json({ success: true, message: 'Push subscription registered' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to register push subscription' });
  }
});

// POST /api/notifications/unsubscribe — remove push subscription
app.post('/api/notifications/unsubscribe', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint is required' });

    // Find tokens whose JSON contains this endpoint
    const tokens = await prisma.deviceToken.findMany({ where: { userId: req.userId } });
    for (const t of tokens) {
      try {
        const parsed = JSON.parse(t.token);
        if (parsed.endpoint === endpoint) {
          await prisma.deviceToken.delete({ where: { id: t.id } });
        }
      } catch { /* skip malformed tokens */ }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

// POST /api/notifications/test — manually trigger a test notification for debugging
app.post('/api/notifications/test', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Create a test in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId: req.userId!,
        title: '🧪 Test Notification',
        message: 'LifeOS AI notification system is working correctly!',
        type: 'SYSTEM',
        isRead: false,
      },
    });

    // Also attempt to send a push notification if subscriptions exist
    const tokens = await prisma.deviceToken.findMany({
      where: { userId: req.userId, deviceType: 'web' },
    });

    let pushSent = 0;
    if (tokens.length > 0) {
      const { sendPushNotification } = await import('./services/pushService');
      for (const t of tokens) {
        try {
          const ok = await sendPushNotification(t.token, {
            title: '🧪 Test Push Notification',
            message: 'Your LifeOS AI push notifications are working!',
            data: { notificationId: notification.id },
          });
          if (ok) pushSent++;
          else await prisma.deviceToken.delete({ where: { id: t.id } }).catch(() => {});
        } catch { /* skip */ }
      }
    }

    res.json({
      success: true,
      notificationId: notification.id,
      pushSent,
      message: pushSent > 0 ? `In-app + ${pushSent} push notification(s) sent` : 'In-app notification created (no push subscriptions)',
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// POST /api/notifications/trigger-scheduler — manually trigger the scheduler (dev/admin)
app.post('/api/notifications/trigger-scheduler', authenticateToken, async (_req, res) => {
  try {
    await checkAndSendNotifications();
    res.json({ success: true, message: 'Scheduler run complete' });
  } catch (error) {
    console.error('Scheduler trigger error:', error);
    res.status(500).json({ error: 'Scheduler run failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// Catch-all route to serve React app for non-API requests
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'frontend', 'dist', 'index.html'));
});

// Bind to 0.0.0.0 so Render can route external traffic
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[LifeOS AI Server] Running on port ${PORT}`);
  // Start background notification scheduler
  startNotificationScheduler();
});
