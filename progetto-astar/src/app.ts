import express from 'express';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Creo l'app Express: parser JSON -> rotte -> gestione 404 -> gestione errori
const app = express();

app.use(express.json());
app.use('/', routes);
app.use(notFoundHandler);
app.use(errorHandler); // sempre ULTIMO

export default app;
