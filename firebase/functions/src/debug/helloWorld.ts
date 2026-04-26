import { onRequest } from 'firebase-functions/v2/https';

export const helloWorld = onRequest((_req, res) => {
  res.status(200).send('SCR-Mesh Firebase Functions — online');
});
