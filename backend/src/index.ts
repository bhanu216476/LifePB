import express from 'express';
import cors from 'cors';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from './middleware/auth';
import { generateAIInsights } from './services/insightEngine';
import { generateAIPredictions } from './services/predictionEngine';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'lifeos-ai-super-secret-token-key-2035';

app.use(cors());
app.use(express.json());

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
        profileSetup: {
          create: {
            preferredWorkingHoursStart: '09:00',
            preferredWorkingHoursEnd: '17:00',
          },
        },
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
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

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'Server login error' });
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

// Dashboard Aggregation API
app.get('/api/dashboard', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

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

    res.json({
      lifeScore: latestScore?.overallScore || 78,
      streakCount: habits.length > 0 ? Math.max(...habits.map(h => h.streakCount), 0) : 0,
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

app.listen(PORT, () => {
  console.log(`[LifeOS AI Server] Running on http://localhost:${PORT}`);
});
