import router from 'router';

import * as controller from '../controllers/server';
import toItemResponse from '../utils/toItemResponse';

export default function serverRoutes() {
  return router()
    .get('/time', (req, res) => {
      res.json(toItemResponse({
        time: controller.getServerTime(),
      }));
    })
    .get('/roles', (req, res) => {
      controller.getRoles(req.uwave)
        .then(toItemResponse)
        .then(item => res.json(item));
    });
}
