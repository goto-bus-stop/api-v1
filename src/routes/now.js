import router from 'router';

import route from '../route';
import * as controller from '../controllers/now';

export default function nowRoute(v1) {
  return router()
    .get(
      '/',
      route(controller.getState)
    );
}
