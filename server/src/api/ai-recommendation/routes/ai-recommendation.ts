export default {
  routes: [
    {
      method: 'POST',
      path: '/ai-recommendations/generate',
      handler: 'ai-recommendation.generate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/ai-recommendations',
      handler: 'ai-recommendation.find',
      config: {
        policies: [],
        middleware: [],
      },
    },
  ],
};