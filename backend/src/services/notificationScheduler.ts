import { PrismaClient } from '@prisma/client';
import { sendPushNotification } from './pushService';

const prisma = new PrismaClient();

// Helper to get local hour, minute, and date string for a user's timezone
function getLocalTimeDetails(timezone: string) {
  const options = { timeZone: timezone, hour12: false } as const;
  const timeString = new Date().toLocaleTimeString('en-US', options);
  const dateString = new Date().toLocaleDateString('en-US', options);
  
  const [hour, minute] = timeString.split(':').map(Number);
  
  // Create a midnight date representing today in user's timezone
  const localDate = new Date(dateString);
  localDate.setHours(0, 0, 0, 0);

  return { hour, minute, localDate };
}

// Format hour/minute numbers to HH:MM string format
function formatTimeSlot(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export async function checkAndSendNotifications() {
  const users = await prisma.user.findMany({
    where: { notificationEnabled: true },
    include: {
      deviceTokens: true,
      tasks: { where: { status: { not: 'COMPLETED' } } },
      journalEntries: true, // We will filter locally for date
    },
  });

  const now = new Date();

  for (const user of users) {
    const tz = user.timezone || 'UTC';
    let localTime;
    try {
      localTime = getLocalTimeDetails(tz);
    } catch (err) {
      console.warn(`Invalid timezone "${tz}" for user ${user.id}. Falling back to UTC.`);
      localTime = getLocalTimeDetails('UTC');
    }

    const { hour, minute, localDate } = localTime;
    const formattedCurrentTime = formatTimeSlot(hour, minute);

    // Split reminder times
    const reminderSlots = user.reminderTimes.split(',').map(s => s.trim());

    // Check if the current time matches any of the reminder slots
    if (!reminderSlots.includes(formattedCurrentTime)) {
      continue;
    }

    // Check if we already sent a notification in the last 15 minutes to prevent duplicates
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const recentNotification = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: fifteenMinutesAgo },
        type: 'ALERT',
      },
    });

    if (recentNotification) {
      // Already sent recently, skip
      continue;
    }

    // Generate dynamic contents depending on the time of day
    let title = 'LifeOS AI';
    let message = 'Start your productive day with LifeOS AI.';

    if (hour >= 4 && hour < 12) {
      title = '🌞 Morning Focus';
      const morningMessages = [
        'Good Morning! Start your productive day with LifeOS AI.',
        'Great consistency! Keep your streak alive.',
        'Every small step counts. What will we conquer today?'
      ];
      message = morningMessages[user.loginCount % morningMessages.length];
    } else if (hour >= 12 && hour < 18) {
      title = '📈 Afternoon Check-in';
      const incompleteTasks = user.tasks.length;
      if (incompleteTasks > 0) {
        message = `You have ${incompleteTasks} unfinished tasks. Update today's progress and stay on track.`;
      } else {
        message = "Update today's achievements and stay on track!";
      }
    } else {
      title = '🌙 Evening Reflection';
      // Check if user has written a journal entry for today
      const journalToday = user.journalEntries.some(j => {
        const jDate = new Date(j.entryDate);
        return jDate.getFullYear() === localDate.getFullYear() &&
               jDate.getMonth() === localDate.getMonth() &&
               jDate.getDate() === localDate.getDate();
      });

      if (!journalToday) {
        message = 'Complete today\'s journal before ending the day.';
      } else {
        message = 'Don\'t forget to complete today\'s goals before ending the day.';
      }
    }

    // 1. Create notification in database (for in-app bell notification history)
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: 'ALERT',
        isRead: false,
      },
    });

    // 2. Dispatch push notifications
    if (user.deviceTokens.length > 0) {
      for (const devToken of user.deviceTokens) {
        if (devToken.deviceType === 'web') {
          const success = await sendPushNotification(devToken.token, {
            title,
            message,
            data: { notificationId: notification.id },
          });

          if (!success) {
            // Delete expired device token
            await prisma.deviceToken.delete({ where: { id: devToken.id } }).catch(() => {});
          }
        }
      }
    }
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startNotificationScheduler() {
  if (schedulerInterval) return;

  console.log('[LifeOS Scheduler] Starting notification cron engine (running every minute)...');
  
  // Run once on startup after 5 seconds to not block initialization
  setTimeout(() => {
    checkAndSendNotifications().catch(console.error);
  }, 5000);

  // Set interval to check every 60 seconds
  schedulerInterval = setInterval(() => {
    checkAndSendNotifications().catch(console.error);
  }, 60000);
}

export function stopNotificationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[LifeOS Scheduler] Stopped notification engine.');
  }
}
