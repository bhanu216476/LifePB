// Lia Conversational AI Engine

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

// Rich Response Banks
export const GREETINGS = [
  "Hey there! 😊 It's absolutely wonderful to see you. How's your day treating you?",
  "Hello! Welcome back. Ready to make today super productive?",
  "Hi there! What can I help you conquer today?",
  "Hey! Hope you're having an amazing, productive day.",
  "Hello! So nice to see you again. Let's get things done!",
  "Hi friend! Ready to level up your day?",
  "Greetings! I'm here and ready to help you coordinate your focus.",
  "Hey! Let's make today count together.",
  "Welcome back! Ready to start checking off items from your agenda?",
  "Hi there! Always a pleasure to see you. What is our focus today?",
  "Hey! Hope you are feeling energized and ready to perform.",
  "Hello! Let's turn your plans into real accomplishments today.",
  "Hi! Ready to log some healthy habits and tasks?",
  "Hey! Let's keep that streak burning bright today.",
  "Hello! I was just waiting for you. Let's organize the schedule.",
  "Hi there! Time to focus and build some momentum.",
  "Hey! Ready to add some XP to your productivity level?",
  "Hello friend! How is the workflow going so far?",
  "Hi! Happy to assist. Just let me know what we are focusing on.",
  "Hey! Good to see you. Ready to make today awesome?"
];

export const THANK_YOUS = [
  "You are always welcome! 😊",
  "Happy to help anytime!",
  "Anytime, friend! Let's keep going.",
  "My absolute pleasure. Glad I could assist!",
  "Glad I could help. Let's conquer the next goal!",
  "No problem at all! You got this.",
  "You're welcome! Keep up the fantastic work.",
  "Anytime! I'm always in your corner.",
  "Always happy to support your journey.",
  "It's my pleasure to help you stay productive.",
  "Of course! That's what productivity partners are for.",
  "You bet! Let's keep making progress.",
  "Don't mention it! Happy to assist.",
  "Anytime! Let me know if there's anything else.",
  "You got it! Now let's tackle those goals."
];

export const GOOD_MORNINGS = [
  "🌞 Good morning! Let's make today incredibly productive.",
  "Morning! Hope you slept well and feel recovered.",
  "Wishing you an energetic and successful day ahead!",
  "Good morning! Ready to achieve today's top goals?",
  "Rise and shine! A new day to stack some XP.",
  "Good morning! Let's set the focus early.",
  "Morning! Ready to kick off today's agenda?",
  "Good morning! Remember to hydrate early and stay focused.",
  "A very happy morning to you! Let's be amazing today.",
  "Good morning, partner! Let's keep that habit streak alive.",
  "Morning! Let's knock out at least one task before noon.",
  "Good morning! What's the main directive for today?",
  "Rise and shine! Let's align your tasks with your goals.",
  "Good morning! Hoping today brings you lots of focus.",
  "Morning! Let's make today better than yesterday."
];

export const GOOD_NIGHTS = [
  "🌙 Good night! Get some rest to recover your energy.",
  "Sleep well! You did great work today.",
  "Good night! Make sure to log your sleep and mood before bed.",
  "Time to recharge the battery. Have a wonderful sleep!",
  "Good night! See you tomorrow for another productive run.",
  "Rest well! Tomorrow is a fresh start.",
  "Sweet dreams! Let's disconnect the interface and rest.",
  "Good night! Relax, you earned a peaceful rest today.",
  "Off to bed? Hope you sleep soundly.",
  "Sleep tight! Let's reflect on your wins today.",
  "Good night! Let's keep your circadian rhythms healthy.",
  "Rest up! Tomorrow we build on today's momentum.",
  "Sleep well, friend! Looking forward to tomorrow.",
  "Good night! Time to power down.",
  "Sweet dreams! Rest up for tomorrow's achievements."
];

export const CONGRATULATIONS = [
  "Awesome! You're building a great habit. 🔥",
  "Fantastic work! You have completed everything for today. 🎉",
  "Boom! Task complete. Let's keep this momentum going!",
  "Incredible progress! You are leveling up your focus.",
  "Excellent! Your commitment is paying off.",
  "Look at you go! Keep pushing those goals.",
  "Superb! Another milestone conquered.",
  "Spot on! Your productivity score is climbing.",
  "Amazing achievement! You should be proud.",
  "Yes! That's how we build consistency.",
  "Outstanding! You're making this look easy.",
  "Kudos! That's a huge checkmark off your list.",
  "Brilliant! Keep stackin' those wins.",
  "Way to go! You're on fire today.",
  "Sensational! Let's carry this energy to the next item."
];

export const MOTIVATIONALS = [
  "Every small step counts. Let's complete one tiny task first!",
  "Consistency beats intensity. Just 10 minutes of focus can change your day.",
  "Believe you can and you're halfway there. Let's make progress!",
  "Your future self will thank you for the work you do today.",
  "Focus on the process, not just the outcome. You are growing!",
  "You don't have to be perfect, you just have to start.",
  "Action cures fear. Let's pick one high priority item and crush it.",
  "Success is the sum of small efforts repeated day in and day out.",
  "One step at a time. What is our focus for the next 25 minutes?",
  "You are fully capable of achieving what you set your mind to.",
  "Let's turn that plan into an action. You've got this!",
  "Momentum builds once you start. Let's write down one quick checkmark.",
  "Keep your eyes on the prize. Your habits define your success.",
  "Be stronger than your excuses. Let's boot up the productive mode.",
  "No matter how slow you go, you are still lapping everyone on the couch.",
  "You've handled tough days before. Let's lock in and win today.",
  "Make today so awesome that yesterday gets jealous.",
  "Focus on one thing at a time. Multi-tasking is a myth. Let's do this!",
  "Progress, not perfection. Let's check off one quick habit.",
  "Your energy is your superpower. Let's channel it into our priorities."
];

export const REMINDERS = [
  "Have you updated today's progress yet? Let's check it out.",
  "Don't forget to log your habits today to keep your streak burning!",
  "Time for a quick check-in. How are your focus levels right now?",
  "Remember to take short breaks so you don't burn out. Stay smart!",
  "Let's review your tasks. Any high priority item we can finish?",
  "A quick reminder: check your sleep and water tracking today.",
  "Keep the streak going! Just log in one quick progress update.",
  "Don't let the day end without completing your primary goal.",
  "Your daily agenda has a few open spots. Let's review them.",
  "A quick prompt to stay aligned with your digital habits today."
];

export function parseLiaResponse(
  userMsg: string,
  history: ChatMessage[],
  userName: string,
  streak: number
): { reply: string; state: 'speaking' | 'happy' | 'thinking' | 'celebration' | 'greeting' | 'reminder' | 'listening' | 'goodbye' | 'idle' } {
  const query = userMsg.toLowerCase().trim();
  const name = userName.split(' ')[0] || 'friend';

  // 1. Check for context continuity (Conversation Memory)
  const lastUserMsg = [...history].reverse().find(m => m.sender === 'user');
  const contextSubject = lastUserMsg ? lastUserMsg.text.toLowerCase() : '';

  // Check for emotional state / sentiment
  const isSad = query.includes('sad') || query.includes('depressed') || query.includes('lonely') || query.includes('hurt') || query.includes('bad');
  const isStressed = query.includes('stress') || query.includes('anxious') || query.includes('tired') || query.includes('burnout') || query.includes('exhausted') || query.includes('overwhelmed');
  const isHappy = query.includes('happy') || query.includes('good') || query.includes('great') || query.includes('awesome') || query.includes('won') || query.includes('excited');

  // Empathetic & Emotional Intelligence replies
  if (isSad) {
    return {
      reply: `I'm so sorry you're feeling this way, ${name}. 🌸 Please take a gentle breath. Remember that it's okay to have low-energy days. How about we just do one tiny, easy task to feel a bit of momentum? I'm right here with you.`,
      state: 'listening'
    };
  }

  if (isStressed) {
    return {
      reply: `Take a deep breath, ${name}. 🧘‍♀️ It sounds like you have a lot on your plate. Remember, you don't have to finish everything today. Let's prioritize just one thing, or take a 5-minute offline break. Health always comes first!`,
      state: 'listening'
    };
  }

  if (isHappy) {
    return {
      reply: `That is amazing to hear, ${name}! 🎉 Your positive energy is contagious. Let's harness this great mood and knock out some of our focus goals today!`,
      state: 'happy'
    };
  }

  // 2. Memory Context continuation matching
  if (query === 'any tips?' || query === 'give me tips' || query === 'tips please') {
    if (contextSubject.includes('interview') || contextSubject.includes('job') || contextSubject.includes('career')) {
      return {
        reply: `For your interview prep, ${name}: 1. Research the company's recent announcements. 2. Prepare 3 stories showing how you solved problems (using the STAR method). 3. Rest well the night before! You've got this.`,
        state: 'speaking'
      };
    }
    if (contextSubject.includes('sleep') || contextSubject.includes('tired') || contextSubject.includes('insomnia')) {
      return {
        reply: `For better sleep: 1. Keep your bedroom cool and dark. 2. Avoid blue screens 1 hour before bed. 3. Log your sleep schedule in LifeOS.`,
        state: 'speaking'
      };
    }
    if (contextSubject.includes('study') || contextSubject.includes('exam') || contextSubject.includes('learn')) {
      return {
        reply: `Try the Pomodoro technique: study for 25 minutes, then take a 5-minute break. This prevents cognitive overload!`,
        state: 'speaking'
      };
    }
    return {
      reply: `My top tip: focus on building tiny habits instead of huge, intimidating goals. What topic are we working on right now?`,
      state: 'speaking'
    };
  }

  // 3. Regular intents mapping with random banks selection
  if (query === 'hi' || query === 'hello' || query === 'hey' || query === 'greetings') {
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    return { reply: greeting, state: 'greeting' };
  }

  if (query.includes('how are you') || query.includes('how\'s it going')) {
    const statusReplies = [
      `I'm doing fantastic! Thanks for asking, ${name}. Ready to keep our productivity high?`,
      "Feeling wonderful! I've been monitoring your streaks and they look great.",
      `I'm doing great, ${name}! Always ready to support your daily targets. How about you?`,
      "Fantastic! Ready to check off some goals or analyze your progress logs?"
    ];
    return { reply: statusReplies[Math.floor(Math.random() * statusReplies.length)], state: 'happy' };
  }

  if (query.includes('good morning')) {
    const gm = GOOD_MORNINGS[Math.floor(Math.random() * GOOD_MORNINGS.length)];
    return { reply: gm, state: 'greeting' };
  }

  if (query.includes('good night') || query.includes('going to sleep')) {
    const gn = GOOD_NIGHTS[Math.floor(Math.random() * GOOD_NIGHTS.length)];
    return { reply: gn, state: 'speaking' };
  }

  if (query.includes('thank you') || query.includes('thanks') || query.includes('ty')) {
    const ty = THANK_YOUS[Math.floor(Math.random() * THANK_YOUS.length)];
    return { reply: ty, state: 'happy' };
  }

  if (query === 'bye' || query === 'goodbye' || query === 'logout') {
    return { reply: `Goodbye, ${name}! Have an amazing day. Don't forget to update today's progress!`, state: 'goodbye' };
  }

  if (query.includes('streak') || query.includes('streak count') || query.includes('flame')) {
    return {
      reply: `You are currently on a ${streak} day streak! 🔥 Keep visiting daily to secure your consistency score.`,
      state: 'celebration'
    };
  }

  if (query.includes('remind') || query.includes('reminder') || query.includes('what to do')) {
    const rem = REMINDERS[Math.floor(Math.random() * REMINDERS.length)];
    return { reply: rem, state: 'reminder' };
  }

  if (query.includes('motivation') || query.includes('motivate') || query.includes('inspire')) {
    const mot = MOTIVATIONALS[Math.floor(Math.random() * MOTIVATIONALS.length)];
    return { reply: mot, state: 'speaking' };
  }

  // Default fallback conversational reply
  const defaultReplies = [
    `I've logged your focus activity, ${name}. Remember, taking small steps daily builds great momentum!`,
    `Understood! Let's check off one item on your agenda to boost your productivity score.`,
    `I'm right here with you, ${name}. Let's make this session count. What should we tackle next?`,
    `Understood. Let me know if you need reminders, focus tips, or motivational quotes.`
  ];
  return { reply: defaultReplies[Math.floor(Math.random() * defaultReplies.length)], state: 'speaking' };
}
