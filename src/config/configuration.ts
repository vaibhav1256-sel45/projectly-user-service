export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  grpc: {
    authUrl: process.env.AUTH_GRPC_URL ?? 'localhost:50051',
    userUrl: process.env.USER_GRPC_URL ?? 'localhost:50056',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
  },

  mongo: {
    uri: process.env.MONGO_URI,
  },

});
