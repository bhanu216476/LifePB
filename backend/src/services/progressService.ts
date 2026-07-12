import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to get local midnight date for a timezone
export function getLocalMidnight(timezone: string = 'UTC'): Date {
  let dateString;
  try {
    dateString = new Date().toLocaleDateString('en-US', { timeZone: timezone });
  } catch (e) {
    dateString = new Date().toLocaleDateString('en-US', { timeZone: 'UTC' });
  }
  const localMidnight = new Date(dateString);
  localMidnight.setHours(0, 0, 0, 0);
  return localMidnight;
}

export async function updateDailyProgress(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) return null;

    const tz = user.timezone || 'UTC';
    const localMidnight = getLocalMidnight(tz);
    const nextDayMidnight = new Date(localMidnight.getTime() + 24 * 60 * 60 * 1000);

    // 1. Count completed tasks today
    const completedTasksCount = await prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
        updatedAt: { gte: localMidnight, lt: nextDayMidnight },
      },
    });

    // 2. Count completed goals today
    const completedGoalsCount = await prisma.goal.count({
      where: {
        userId,
        status: 'COMPLETED',
        updatedAt: { gte: localMidnight, lt: nextDayMidnight },
      },
    });

    // 3. Count completed habits today
    const completedHabitsCount = await prisma.habitLog.count({
      where: {
        habit: { userId },
        status: 'COMPLETED',
        completedAt: { gte: localMidnight, lt: nextDayMidnight },
      },
    });

    // 4. Calculate Productivity Score: 15 per task, 30 per goal, 10 per habit, max 100
    const productivityScore = Math.min(
      100,
      completedTasksCount * 15 + completedGoalsCount * 30 + completedHabitsCount * 10
    );

    // 5. Upsert the Progress Log
    const progress = await prisma.progress.upsert({
      where: {
        userId_date: {
          userId,
          date: localMidnight,
        },
      },
      update: {
        completedTasks: completedTasksCount,
        completedGoals: completedGoalsCount,
        productivityScore,
      },
      create: {
        userId,
        date: localMidnight,
        completedTasks: completedTasksCount,
        completedGoals: completedGoalsCount,
        productivityScore,
      },
    });

    // Also update a LifeScoreHistory record if we want to synchronize with the trend line chart!
    // The trend chart displays the overall score, productivity score, health score, and finance score.
    // Let's create or update the LifeScoreHistory entry for today to make it visually beautiful on the dashboard!
    const latestSleep = await prisma.sleepLog.findFirst({
      where: { userId },
      orderBy: { sleepTime: 'desc' },
    });
    const healthScore = latestSleep?.sleepScore || 80;

    const budget = await prisma.budget.findFirst({ where: { userId } });
    const financeScore = budget ? 85 : 75;

    const overallScore = Math.round((productivityScore * 0.4) + (healthScore * 0.4) + (financeScore * 0.2));

    await prisma.lifeScoreHistory.upsert({
      where: {
        id: (await prisma.lifeScoreHistory.findFirst({
          where: {
            userId,
            loggedDate: { gte: localMidnight, lt: nextDayMidnight }
          }
        }))?.id || 'temp-id-not-found'
      },
      update: {
        overallScore,
        productivityScore,
        healthScore,
        financeScore,
      },
      create: {
        user: { connect: { id: userId } },
        overallScore,
        productivityScore,
        healthScore,
        financeScore,
        learningScore: 80,
        loggedDate: localMidnight,
      }
    }).catch(() => {
      // If upsert fails (temp id), create a new record
      prisma.lifeScoreHistory.create({
        data: {
          user: { connect: { id: userId } },
          overallScore,
          productivityScore,
          healthScore,
          financeScore,
          learningScore: 80,
          loggedDate: localMidnight,
        }
      }).catch(console.error);
    });

    return progress;
  } catch (error) {
    console.error('Error updating daily progress:', error);
    return null;
  }
}
