import router from 'router';

import route from '../route';
import * as validations from '../validations';
import protect from '../middleware/protect';
import checkFields from '../middleware/checkFields';
import * as controller from '../controllers/booth';
import { ROLE_MODERATOR } from '../roles';

export default function boothRoutes() {
  return router()
    // GET /v1/booth/ - Get current DJ booth state.
    .get(
      '/',
      route(controller.getBooth)
    )
    // POST /v1/booth/skip - Skip the current DJ.
    .post(
      '/skip',
      protect(),
      checkFields(validations.skipBooth),
      route(controller.skipBooth)
    )
    // POST /v1/booth/replace - Replace the current DJ with a different one.
    .post('/replace',
      protect(ROLE_MODERATOR),
      checkFields(validations.replaceBooth),
      route(controller.replaceBooth)
    )
    // POST /v1/booth/favorite - Add the currently playing track to the user's favorites.
    .post(
      '/favorite',
      protect(),
      checkFields(validations.favorite),
      route(controller.favorite)
    )
    // GET /v1/booth/history - Get the play history.
    .get(
      '/history',
      checkFields(validations.getRoomHistory),
      route(controller.getHistory)
    );
}
