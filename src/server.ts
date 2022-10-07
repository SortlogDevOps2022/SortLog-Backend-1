require('dotenv').config();

import express from 'express';
import { createServer } from 'http';

import { ApolloServer } from 'apollo-server-express';
import depthLimit from 'graphql-depth-limit';
import schema from './graphql/schema';
import { MongoHelper } from './db/mongo';
import Router from './routes';

import compression from 'compression';
import cors from 'cors';

import swaggerUI from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

const app = express();
const mHelper = new MongoHelper();
mHelper.initiateMongoConnection();

const server = new ApolloServer({
  schema,
  validationRules: [depthLimit(7)],
  introspection: true,
  playground: true,
  context: async ({ req }) => {
    return await mHelper.validateUser(req);
  },
});

const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'Sortlog API',
      version: '1.0.0',
    },
  },
  apis: ['./routes/*.ts'],
};

app.use(express.json());
app.use(cors());
app.use('*', cors());
app.use(compression());
app.use('/api', Router);
app.get('/health-check', (req, res) => res.status(200).send({ message: 'healthy' }));
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerJsDoc(swaggerOptions)));
server.applyMiddleware({ app, path: '/graphql' });

const httpServer = createServer(app);
const port = process.env.PORT || 4000;

httpServer.listen({ port: process.env.PORT }, (): void => {
  console.log(`\n🚀 Swagger is now running on http://localhost:${port}/docs`);
  console.log(`\n🚀 GraphQL is now running on http://localhost:${port}/graphql`);
});

// try this in graphql playground:
// query {
//   token(
//     email: "vinod@test.com"
//   )
// }
