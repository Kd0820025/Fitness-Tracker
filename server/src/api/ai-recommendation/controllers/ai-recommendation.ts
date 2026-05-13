import { factories } from '@strapi/strapi';

const Groq = require('groq-sdk');

export default factories.createCoreController(
  'api::ai-recommendation.ai-recommendation' as any,
  ({ strapi }) => ({

    async generate(ctx) {
      // 1. Auth check — same pattern as your food-log controller
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login required');

      // 2. Fetch full user profile
      const userProfile = await strapi.entityService.findOne(
        'plugin::users-permissions.user' as any,
        user.id,
        { populate: ['*'] }
      );

      // 3. Fetch recent food logs (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const foodLogs = await strapi.entityService.findMany(
        'api::food-log.food-log',
        {
          filters: {
            users_permissions_user: user.id,
            createdAt: { $gte: sevenDaysAgo.toISOString() },
          },
        }
      );

      // 4. Fetch recent activity logs (last 7 days)
      const activityLogs = await strapi.entityService.findMany(
        'api::activity-log.activity-log',
        {
          filters: {
            users_permissions_user: user.id,
            createdAt: { $gte: sevenDaysAgo.toISOString() },
          },
        }
      );

      // 5. Build prompt using real user data
      const age = userProfile?.age ?? 'unknown';
      const weight = userProfile?.weight ?? 'unknown';
      const height = userProfile?.height ?? 'unknown';
      const goal = userProfile?.goal ?? 'general fitness';
      const activityLevel = userProfile?.activityLevel ?? 'moderate';

      const foodSummary = foodLogs.length
        ? foodLogs
            .map((f: any) => `${f.name}: ${f.calories ?? '?'} kcal`)
            .join(', ')
        : 'No food logs found in the last 7 days';

      const activitySummary = activityLogs.length
        ? activityLogs
            .map((a: any) => `${a.name ?? a.type}: ${a.duration ?? '?'} min`)
            .join(', ')
        : 'No activity logs found in the last 7 days';

      const prompt = `You are a professional fitness and nutrition coach. A user has shared their data. Give practical, specific advice.

User Profile:
- Age: ${age}
- Weight: ${weight} kg
- Height: ${height} cm
- Fitness Goal: ${goal}
- Activity Level: ${activityLevel}

Last 7 days of food logs:
${foodSummary}

Last 7 days of activity logs:
${activitySummary}

Based on this data, provide:
1. **Weekly Workout Plan** – 3-5 specific exercises with sets/reps suited to their goal
2. **Daily Calorie Target** – with a brief reason based on their weight and goal
3. **Diet Suggestions** – 3-4 practical food swaps or additions based on their logs
4. **Recovery Tips** – 2-3 specific tips based on their activity pattern

Keep it concise, actionable, and encouraging. Use plain text, no markdown symbols.`;

      // 6. Call Groq API
      let recommendationText: string;
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
         model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
        });
        recommendationText =
          completion.choices[0]?.message?.content ?? 'No response generated.';
      } catch (err: any) {
        strapi.log.error('Groq API error:', err);
        return ctx.internalServerError(
          'AI service unavailable. Please try again later.'
        );
      }

      // 7. Save to DB
      try {
        await strapi.entityService.create(
          'api::ai-recommendation.ai-recommendation' as any,
          {
            data: {
              users_permissions_user: user.id,
              recommendationType: 'full_plan',
              content: recommendationText,
            },
          }
        );
      } catch (err) {
        // Non-fatal — still return the response even if save fails
        strapi.log.warn('Could not save recommendation to DB:', err);
      }

      // 8. Return to frontend
      return ctx.send({ recommendation: recommendationText });
    },

    // Fetch saved recommendations for this user
    async find(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login required');

      const results = await strapi.entityService.findMany(
        'api::ai-recommendation.ai-recommendation' as any,
        {
          filters: { users_permissions_user: user.id },
          sort: { createdAt: 'desc' },
          limit: 5,
        }
      );
      return results;
    },
  })
);