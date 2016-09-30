import router from 'router';

import route from '../route';
import * as validations from '../validations';
import protect from '../middleware/protect';
import requireActiveConnection from '../middleware/requireActiveConnection';
import checkFields from '../middleware/checkFields';
import * as controller from '../controllers/waitlist';
import { ROLE_MANAGER, ROLE_MODERATOR } from '../roles';

export default function waitlistRoutes() {
  return router()
    .get(
      '/',
      route(controller.getWaitlist)
    )
    .post(
      '/',
      protect(),
      requireActiveConnection(),
      checkFields(validations.joinWaitlist),
      route(controller.addToWaitlist)
    )
    .delete(
      '/',
      protect(ROLE_MANAGER),
      route(controller.clearWaitlist)
    )
    .put(
      '/move',
      protect(ROLE_MODERATOR),
      checkFields(validations.moveWaitlist),
      route(controller.moveWaitlist)
    )
    .delete(
      '/:id',
      protect(),
      route(controller.removeFromWaitlist)
    )
    .put(
      '/lock',
      protect(ROLE_MODERATOR),
      checkFields(validations.lockWaitlist),
      route(controller.lockWaitlist)
    );
}
