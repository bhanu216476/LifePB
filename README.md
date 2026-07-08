# LifeOS AI

A full-stack self-improvement and life tracker application powered by AI insights.

## Live Application
🔗 **[https://lifeos-ai-backend.onrender.com](https://lifeos-ai-backend.onrender.com)**

## Features
- **Dashboard**: Track daily habits, sleep scores, mood, tasks, goals, learning, expenses, and water intake.
- **Goals & Tasks**: Organize priorities and get AI-driven advice for goal planning.
- **Habits Tracker**: Maintain streaks for daily and weekly routines.
- **Sleep & Mood**: Log sleep quality and track emotional well-being.
- **Learning Tracker**: Record books read and courses taken.
- **Finances**: Track income, expenses, and set budgets.
- **AI Insights**: Generate personalized coaching and productivity tips based on your logs.

## Setup & Deployment
This project is configured to run as a single full-stack web service.

### Local Development
1. Install root dependencies:
   ```bash
   npm install
   ```
2. Set up database:
   ```bash
   npx prisma db push
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend && npm install
   ```
4. Build the frontend:
   ```bash
   npm run build
   ```
5. Run the development server (runs backend and serves built frontend on port 5000):
   ```bash
   cd ..
   npm run dev
   ```

### Render Deployment
This repository includes a `render.yaml` configuration for easy deployment on Render as a single Web Service.
