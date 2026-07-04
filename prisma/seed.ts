import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding LifeOS AI database...');

  // 1. Clean existing database
  await prisma.$executeRawUnsafe('DELETE FROM UserAchievement;');
  await prisma.$executeRawUnsafe('DELETE FROM Achievement;');
  await prisma.$executeRawUnsafe('DELETE FROM DeviceToken;');
  await prisma.$executeRawUnsafe('DELETE FROM LifeScoreHistory;');
  await prisma.$executeRawUnsafe('DELETE FROM Prediction;');
  await prisma.$executeRawUnsafe('DELETE FROM AIInsight;');
  await prisma.$executeRawUnsafe('DELETE FROM Notification;');
  await prisma.$executeRawUnsafe('DELETE FROM JournalEntry;');
  await prisma.$executeRawUnsafe('DELETE FROM WaterLog;');
  await prisma.$executeRawUnsafe('DELETE FROM FitnessLog;');
  await prisma.$executeRawUnsafe('DELETE FROM Budget;');
  await prisma.$executeRawUnsafe('DELETE FROM Income;');
  await prisma.$executeRawUnsafe('DELETE FROM Expense;');
  await prisma.$executeRawUnsafe('DELETE FROM DigitalHabitLog;');
  await prisma.$executeRawUnsafe('DELETE FROM LearningSession;');
  await prisma.$executeRawUnsafe('DELETE FROM Book;');
  await prisma.$executeRawUnsafe('DELETE FROM Course;');
  await prisma.$executeRawUnsafe('DELETE FROM MoodLog;');
  await prisma.$executeRawUnsafe('DELETE FROM SleepLog;');
  await prisma.$executeRawUnsafe('DELETE FROM HabitLog;');
  await prisma.$executeRawUnsafe('DELETE FROM Habit;');
  await prisma.$executeRawUnsafe('DELETE FROM TaskHistory;');
  await prisma.$executeRawUnsafe('DELETE FROM Task;');
  await prisma.$executeRawUnsafe('DELETE FROM GoalSuggestion;');
  await prisma.$executeRawUnsafe('DELETE FROM Goal;');
  await prisma.$executeRawUnsafe('DELETE FROM ProfileSetup;');
  await prisma.$executeRawUnsafe('DELETE FROM User;');

  // 2. Create standard Achievements
  const achievementsList = [
    { title: 'Early Bird', description: 'Woke up before 6:30 AM 5 days in a row', category: 'HEALTH', xpReward: 250 },
    { title: 'Code Warrior', description: 'Logged over 4 hours of coding in a single day', category: 'LEARNING', xpReward: 300 },
    { title: 'Zen Master', description: 'Completed habit streak of 10 days for Meditation', category: 'HABITS', xpReward: 150 },
    { title: 'Saving Grace', description: 'Stayed 20% under monthly entertainment budget', category: 'FINANCE', xpReward: 400 },
    { title: 'Iron Mind & Body', description: 'Logged fitness steps above 10,000 for 7 consecutive days', category: 'FITNESS', xpReward: 350 },
    { title: 'Digital Detox', description: 'Screen time on social media below 30 minutes in a day', category: 'PRODUCTIVITY', xpReward: 200 },
  ];

  const dbAchievements = [];
  for (const ach of achievementsList) {
    const created = await prisma.achievement.create({ data: ach });
    dbAchievements.push(created);
  }
  console.log(`Created ${dbAchievements.length} base achievements.`);

  // 3. Create Demo User
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'alex@lifeos.ai',
      name: 'Alex Mercer',
      passwordHash,
      age: 27,
      occupation: 'Senior Software Engineer',
      timezone: 'America/New_York',
      profileSetup: {
        create: {
          preferredWorkingHoursStart: '08:00',
          preferredWorkingHoursEnd: '17:00',
          lifeGoals: 'Become a tech lead, run a half marathon, build a secondary passive income stream of $2k/mo, learn Spanish.',
          skills: 'TypeScript, React, Node.js, System Design, SQL',
          interests: 'AI research, Calisthenics, Sci-fi literature, Biohacking',
        },
      },
    },
  });
  console.log(`Created demo user: ${user.name} (${user.email})`);

  // 4. Create Goals
  const goalsData = [
    { title: 'Run a Half Marathon', category: 'HEALTH', priority: 'HIGH', status: 'IN_PROGRESS', progress: 65, deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60) },
    { title: 'Master Spanish (B2 level)', category: 'LEARNING', priority: 'MEDIUM', status: 'IN_PROGRESS', progress: 40, deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180) },
    { title: 'Build Side Product (LifeOS AI)', category: 'CAREER', priority: 'HIGH', status: 'IN_PROGRESS', progress: 85, deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15) },
    { title: 'Save $20,000 for Investments', category: 'FINANCE', priority: 'HIGH', status: 'IN_PROGRESS', progress: 50, deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120) },
    { title: 'Visit Patagonia', category: 'TRAVEL', priority: 'LOW', status: 'TODO', progress: 0, deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 300) },
  ];

  for (const g of goalsData) {
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        ...g,
      },
    });
    // Create AI goal suggestions
    await prisma.goalSuggestion.createMany({
      data: [
        { goalId: goal.id, suggestionText: `Based on your recent logs, breaking this down into 15-minute daily micro-sessions will boost progress by 25%.` },
        { goalId: goal.id, suggestionText: `Scheduling focused blocks before 10:00 AM aligns with your peak focus hours.` },
      ],
    });
  }
  console.log('Seeded goals and AI suggestions.');

  // 5. Create Habits
  const habitsData = [
    { name: 'Meditation (10m)', frequency: 'DAILY', targetCount: 1, streakCount: 12, maxStreak: 15, category: 'MINDFULNESS' },
    { name: 'LeetCode Problem', frequency: 'DAILY', targetCount: 1, streakCount: 4, maxStreak: 20, category: 'LEARNING' },
    { name: 'Drink 3L Water', frequency: 'DAILY', targetCount: 1, streakCount: 8, maxStreak: 12, category: 'HEALTH' },
    { name: 'Strength Training', frequency: 'WEEKLY', targetCount: 3, streakCount: 5, maxStreak: 8, category: 'HEALTH' },
    { name: 'Review Budget', frequency: 'WEEKLY', targetCount: 1, streakCount: 4, maxStreak: 10, category: 'FINANCE' },
  ];

  const dbHabits = [];
  for (const h of habitsData) {
    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        ...h,
      },
    });
    dbHabits.push(habit);
  }
  console.log('Seeded habits.');

  // 6. Generate 30 days of Historical Data
  const today = new Date();
  const logsCount = 30;

  console.log('Generating 30 days of historical logs...');
  for (let i = logsCount; i >= 0; i--) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - i);
    // Remove time components for loggedDate fields
    const loggedDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    // A. Habit Logs (completed on ~80% of days depending on streak)
    for (const habit of dbHabits) {
      const isCompleted = Math.random() > 0.2;
      await prisma.habitLog.create({
        data: {
          habitId: habit.id,
          completedAt: targetDate,
          status: isCompleted ? 'COMPLETED' : 'SKIPPED',
          notes: isCompleted ? 'Felt good.' : 'Too busy / tired.',
        },
      });
    }

    // B. Sleep Logs
    // Sleep time varies between 10:30 PM and 1:00 AM (relative to targetDate)
    const sleepHour = Math.random() > 0.5 ? 22 : 23;
    const sleepMin = Math.floor(Math.random() * 60);
    const sleepTime = new Date(targetDate);
    sleepTime.setDate(targetDate.getDate() - 1); // Slept last night
    sleepTime.setHours(sleepHour, sleepMin, 0, 0);

    // Wake time varies between 6:00 AM and 8:30 AM
    const wakeHour = 6 + Math.floor(Math.random() * 3);
    const wakeMin = Math.floor(Math.random() * 60);
    const wakeTime = new Date(targetDate);
    wakeTime.setHours(wakeHour, wakeMin, 0, 0);

    const durationMinutes = Math.floor((wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60));
    const qualityScore = durationMinutes > 480 ? 80 + Math.floor(Math.random() * 20) : 55 + Math.floor(Math.random() * 25);
    const sleepScore = Math.min(100, Math.floor(qualityScore * 0.9 + (durationMinutes / 480) * 10));

    await prisma.sleepLog.create({
      data: {
        userId: user.id,
        sleepTime,
        wakeTime,
        durationMinutes,
        qualityScore,
        sleepScore,
        dreamNotes: Math.random() > 0.7 ? 'Dreamt of building a startup in Mars. Very vivid details.' : null,
        createdAt: targetDate,
      },
    });

    // C. Mood Logs (Stress and energy levels are correlated with sleep)
    const sleepFactor = durationMinutes / 480; // 1.0 is 8 hours
    const stressLevel = Math.max(1, Math.min(10, Math.floor(8 - sleepFactor * 4 + Math.random() * 3)));
    const energyLevel = Math.max(1, Math.min(10, Math.floor(sleepFactor * 6 + Math.random() * 4)));
    const confidenceLevel = Math.max(1, Math.min(10, Math.floor(sleepFactor * 5 + Math.random() * 5)));
    const motivationLevel = Math.max(1, Math.min(10, Math.floor(sleepFactor * 6 + Math.random() * 4)));
    const moodEmojis = ['😊', '😴', '🧠', '🔥', '😐', '😣'];
    let selectedEmoji = moodEmojis[0];
    if (energyLevel > 8) selectedEmoji = '🔥';
    else if (sleepFactor < 0.8) selectedEmoji = '😴';
    else if (stressLevel > 7) selectedEmoji = '😣';
    else if (energyLevel < 4) selectedEmoji = '😐';

    await prisma.moodLog.create({
      data: {
        userId: user.id,
        emoji: selectedEmoji,
        stressLevel,
        energyLevel,
        confidenceLevel,
        motivationLevel,
        journalSnippet: `Day felt ${stressLevel > 6 ? 'quite demanding' : 'highly productive and stable'}.`,
        createdAt: targetDate,
      },
    });

    // D. Digital Habits (Screen time in minutes)
    // VSCode coding (average 180-350 min)
    // ChatGPT (average 30-100 min)
    // Chrome (average 60-150 min)
    // Distractions: YouTube (40-120 min), Instagram (20-90 min), Netflix (0-150 min)
    const apps = [
      { name: 'VS Code', cat: 'PRODUCTIVE', base: 240, rand: 120 },
      { name: 'ChatGPT', cat: 'PRODUCTIVE', base: 60, rand: 60 },
      { name: 'Chrome', cat: 'PRODUCTIVE', base: 90, rand: 90 },
      { name: 'Instagram', cat: 'DISTRACTING', base: 30, rand: 40 },
      { name: 'YouTube', cat: 'DISTRACTING', base: 45, rand: 80 },
      { name: 'Netflix', cat: 'DISTRACTING', base: 0, rand: 120 },
      { name: 'LinkedIn', cat: 'PRODUCTIVE', base: 10, rand: 20 },
      { name: 'Gaming', cat: 'DISTRACTING', base: 0, rand: 90 },
    ];

    for (const app of apps) {
      const duration = Math.floor(app.base + Math.random() * app.rand);
      if (duration > 0) {
        await prisma.digitalHabitLog.create({
          data: {
            userId: user.id,
            applicationName: app.name.toUpperCase().replace(' ', ''),
            durationMinutes: duration,
            category: app.cat,
            loggedDate,
          },
        });
      }
    }

    // E. Fitness & Water Logs
    const exerciseMinutes = Math.random() > 0.4 ? 30 + Math.floor(Math.random() * 60) : 0;
    const workoutTypes = ['RUNNING', 'WEIGHTS', 'CARDIO', 'YOGA'];
    const activeSteps = Math.floor(4000 + (exerciseMinutes ? 5000 : 0) + Math.random() * 4000);
    const calories = Math.floor(activeSteps * 0.04 + exerciseMinutes * 8);
    const weight = 78.5 + (Math.random() * 0.8 - 0.4);
    const bmi = 23.4;
    const healthScore = Math.min(100, Math.floor(70 + (activeSteps / 10000) * 15 + (exerciseMinutes > 0 ? 15 : 0)));

    await prisma.fitnessLog.create({
      data: {
        userId: user.id,
        workoutType: exerciseMinutes > 0 ? workoutTypes[Math.floor(Math.random() * workoutTypes.length)] : null,
        durationMinutes: exerciseMinutes > 0 ? exerciseMinutes : null,
        caloriesBurned: calories,
        weightKg: weight,
        steps: activeSteps,
        bmi,
        healthScore,
        loggedDate,
      },
    });

    await prisma.waterLog.create({
      data: {
        userId: user.id,
        amountMl: Math.floor(1500 + Math.random() * 1500),
        loggedDate,
      },
    });

    // F. Expenses (daily food/coffee/other, monthly recurring)
    const isFirstOfMonth = targetDate.getDate() === 1;
    if (isFirstOfMonth) {
      // Monthly income
      await prisma.income.create({
        data: {
          userId: user.id,
          amount: 8500,
          source: 'SALARY',
          description: 'Primary software engineering salary',
          transactionDate: targetDate,
        },
      });
      // Side hustle income
      if (Math.random() > 0.3) {
        await prisma.income.create({
          data: {
            userId: user.id,
            amount: 1200,
            source: 'FREELANCE',
            description: 'AI consulting work',
            transactionDate: targetDate,
          },
        });
      }
      // Rent expense
      await prisma.expense.create({
        data: {
          userId: user.id,
          amount: 2200,
          category: 'RENT',
          merchant: 'Hudson Yards Apts',
          isSubscription: false,
          transactionDate: targetDate,
        },
      });
      // Subscriptions
      await prisma.expense.create({
        data: {
          userId: user.id,
          amount: 15.99,
          category: 'ENTERTAINMENT',
          merchant: 'Netflix Inc',
          isSubscription: true,
          transactionDate: targetDate,
        },
      });
      await prisma.expense.create({
        data: {
          userId: user.id,
          amount: 29.00,
          category: 'OTHER',
          merchant: 'ChatGPT Plus',
          isSubscription: true,
          transactionDate: targetDate,
        },
      });
    }

    // Daily miscellaneous expenses
    const numExpenses = Math.floor(Math.random() * 3); // 0, 1, or 2 expenses
    for (let k = 0; k < numExpenses; k++) {
      const categories = ['FOOD', 'SHOPPING', 'ENTERTAINMENT', 'TRAVEL', 'HEALTH', 'OTHER'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const merchants: Record<string, string[]> = {
        FOOD: ['Whole Foods', 'Starbucks', 'Sweetgreen', 'Chipotle'],
        SHOPPING: ['Amazon', 'Target', 'Apple Store'],
        ENTERTAINMENT: ['Cinemark', 'Steam Games', 'Spotify'],
        TRAVEL: ['Uber', 'Lyft', 'Gas Station'],
        HEALTH: ['CVS Pharmacy', 'Gym Membership'],
        OTHER: ['Laundry', 'Local News Sub'],
      };
      const merchantList = merchants[category] || ['Generic Store'];
      const merchant = merchantList[Math.floor(Math.random() * merchantList.length)];
      const amount = Math.floor(5 + Math.random() * 80) + Math.random();

      await prisma.expense.create({
        data: {
          userId: user.id,
          amount: parseFloat(amount.toFixed(2)),
          category,
          merchant,
          transactionDate: targetDate,
        },
      });
    }

    // G. Journal Entries (weekly, ~every 2-3 days)
    if (i % 3 === 0) {
      const dailyGoalReached = Math.random() > 0.3;
      await prisma.journalEntry.create({
        data: {
          userId: user.id,
          entryDate: targetDate,
          reflections: `Reflecting on the progress of this week. Work has been ${stressLevel > 6 ? 'highly stressful' : 'smooth and organized'}. I spent focused time coding on VS Code. Spanish lessons are advancing well, practiced for 30 mins.`,
          gratitudeContent: `Grateful for good health, hot coffee in the morning, and helpful code suggestions from AI tools.`,
          achievements: dailyGoalReached ? `Completed all daily coding tasks and hit 10k steps.` : null,
          failures: stressLevel > 7 ? `Felt overwhelmed by backend bugs and lost focus in the afternoon.` : null,
          lessonsLearned: `Time-blocking my calendar is the single best way to protect my coding sessions.`,
          moodEmoji: selectedEmoji,
        },
      });
    }

    // H. Life Score History (0-100)
    // Overall Life Score is a weighted average of other dimensions
    const productivityScore = Math.min(100, Math.floor(65 + (activeSteps / 10000) * 10 + (sleepFactor * 15) + (Math.random() * 10)));
    const healthScoreDim = healthScore;
    const financeScore = Math.min(100, Math.floor(70 + (isFirstOfMonth ? 15 : 0) + (Math.random() * 15)));
    const learningScore = Math.min(100, Math.floor(50 + (i % 2 === 0 ? 30 : 10) + Math.random() * 15));
    const overallScore = Math.floor((productivityScore + healthScoreDim + financeScore + learningScore) / 4);

    await prisma.lifeScoreHistory.create({
      data: {
        userId: user.id,
        overallScore,
        productivityScore,
        healthScore: healthScoreDim,
        financeScore,
        learningScore,
        loggedDate,
      },
    });
  }

  // 7. Seed Tasks
  const tasksData = [
    { title: 'Refactor Auth middleware', category: 'PRODUCTIVITY', priority: 'HIGH', difficulty: 'MEDIUM', energyNeeded: 'HIGH', status: 'COMPLETED', estimatedTimeMs: BigInt(7200000), actualTime: new Date(Date.now() - 1000 * 60 * 60 * 2), plannedTime: new Date(Date.now() - 1000 * 60 * 60 * 4), delay: 0, completionPercent: 100 },
    { title: 'Implement Recharts on Dashboard', category: 'PRODUCTIVITY', priority: 'HIGH', difficulty: 'HARD', energyNeeded: 'HIGH', status: 'COMPLETED', estimatedTimeMs: BigInt(14400000), actualTime: new Date(Date.now() - 1000 * 60 * 60 * 2), plannedTime: new Date(Date.now() - 1000 * 60 * 60 * 6), delay: 120, completionPercent: 100 },
    { title: 'Cardio endurance session', category: 'HEALTH', priority: 'MEDIUM', difficulty: 'EASY', energyNeeded: 'MEDIUM', status: 'COMPLETED', estimatedTimeMs: BigInt(3600000), actualTime: new Date(Date.now() - 1000 * 60 * 60 * 24), plannedTime: new Date(Date.now() - 1000 * 60 * 60 * 25), delay: 60, completionPercent: 100 },
    { title: 'Review monthly balance sheet', category: 'FINANCE', priority: 'MEDIUM', difficulty: 'EASY', energyNeeded: 'LOW', status: 'TODO', estimatedTimeMs: BigInt(1800000), completionPercent: 0 },
    { title: 'Finish Reading "Sapiens" Chapter 5', category: 'LEARNING', priority: 'LOW', difficulty: 'MEDIUM', energyNeeded: 'LOW', status: 'IN_PROGRESS', estimatedTimeMs: BigInt(3600000), completionPercent: 50 },
    { title: 'Schedule dental appointment', category: 'PERSONAL', priority: 'LOW', difficulty: 'EASY', energyNeeded: 'LOW', status: 'TODO', estimatedTimeMs: BigInt(900000), completionPercent: 0 },
  ];

  for (const t of tasksData) {
    const createdTask = await prisma.task.create({
      data: {
        userId: user.id,
        ...t,
      },
    });

    await prisma.taskHistory.create({
      data: {
        taskId: createdTask.id,
        statusChangedFrom: 'NONE',
        statusChangedTo: createdTask.status,
        notes: 'Initial task seed',
      },
    });
  }

  // 8. Seed Learning (Courses & Books)
  await prisma.course.createMany({
    data: [
      { userId: user.id, title: 'Prisma Client Mastery', platform: 'Udemy', status: 'COMPLETED', progress: 100, certificateUrl: 'https://certificates.prisma.io/alex-mercer-10293' },
      { userId: user.id, title: 'Advanced React Patterns', platform: 'Frontend Masters', status: 'IN_PROGRESS', progress: 45 },
    ],
  });

  await prisma.book.createMany({
    data: [
      { userId: user.id, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', totalPages: 443, currentPage: 120, progress: 27.1, status: 'READING' },
      { userId: user.id, title: 'Atomic Habits', author: 'James Clear', totalPages: 320, currentPage: 320, progress: 100, status: 'COMPLETED', rating: 5, review: 'Incredible book that changed how I track my daily routines. Life-changing!' },
    ],
  });

  // Seed Learning Sessions for the past week
  for (let s = 7; s >= 0; s--) {
    const sessionDate = new Date();
    sessionDate.setDate(today.getDate() - s);
    await prisma.learningSession.createMany({
      data: [
        { userId: user.id, category: 'REACT', durationMinutes: 45, notes: 'Studied virtual DOM details.', createdAt: sessionDate },
        { userId: user.id, category: 'SQL', durationMinutes: 60, notes: 'Optimized complex query parameters.', createdAt: sessionDate },
      ],
    });
  }

  // 9. Seed AI Insights
  const insightsList = [
    { userId: user.id, text: 'You complete coding tasks 46% faster before 10 AM, when energy levels peak.', type: 'PRODUCTIVITY', confidenceScore: 0.94 },
    { userId: user.id, text: 'You are least productive on Tuesday afternoons, corresponding with higher distraction screen time.', type: 'PRODUCTIVITY', confidenceScore: 0.88 },
    { userId: user.id, text: 'You spend 4× more money on Food & Coffee during weeks when stress is logged above 7.', type: 'FINANCE', confidenceScore: 0.92 },
    { userId: user.id, text: 'Sleep above 7.5 hours increases your daily coding focus duration by 52 minutes.', type: 'SLEEP', confidenceScore: 0.95 },
    { userId: user.id, text: 'You procrastinate most (average delay of 180m) on tasks categorized as React.', type: 'PRODUCTIVITY', confidenceScore: 0.84 },
    { userId: user.id, text: 'Strength training sessions raise your motivation score the following day by 1.8 points.', type: 'FITNESS', confidenceScore: 0.90 },
  ];
  await prisma.aIInsight.createMany({ data: insightsList });

  // 10. Seed AI Predictions
  const predictionsList = [
    { userId: user.id, target: 'GOAL_COMPLETION', value: '82%', confidenceScore: 0.89 },
    { userId: user.id, target: 'BURNOUT_RISK', value: 'Low (12%)', confidenceScore: 0.92 },
    { userId: user.id, target: 'FOCUS_SCORE', value: '84/100', confidenceScore: 0.85 },
    { userId: user.id, target: 'WEEKLY_PRODUCTIVITY', value: '+8.4%', confidenceScore: 0.78 },
    { userId: user.id, target: 'MONTHLY_SAVINGS', value: '$3,450', confidenceScore: 0.91 },
    { userId: user.id, target: 'HABIT_CONSISTENCY', value: '92%', confidenceScore: 0.88 },
  ];
  await prisma.prediction.createMany({ data: predictionsList });

  // 11. Unlock initial achievements for User
  await prisma.userAchievement.createMany({
    data: [
      { userId: user.id, achievementId: dbAchievements[0].id, unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10) },
      { userId: user.id, achievementId: dbAchievements[1].id, unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) },
    ],
  });

  // 12. Create Notifications
  const notificationsData = [
    { userId: user.id, title: 'Burnout Risk Alert', message: 'Your work hours are 15% higher than average this week. Take a break!', type: 'ALERT', isRead: false },
    { userId: user.id, title: 'Achievement Unlocked: Code Warrior!', message: 'You logged 5.5 hours of coding today. 300 XP awarded.', type: 'ACHIEVEMENT', isRead: false },
    { userId: user.id, title: 'Smart Reminder', message: 'Completing your Meditation habit before 9:00 AM matches your peak consistency pattern.', type: 'SMART', isRead: false },
    { userId: user.id, title: 'Goal Deadline Approaching', message: 'Your goal "Build Side Product (LifeOS AI)" is due in 15 days.', type: 'DEADLINE', isRead: true },
  ];
  await prisma.notification.createMany({ data: notificationsData });

  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
