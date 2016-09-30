import router from 'router';

import route from '../route';
import * as validations from '../validations';
import protect from '../middleware/protect';
import checkFields from '../middleware/checkFields';
import rateLimit from '../middleware/rateLimit';
import * as controller from '../controllers/users';
import * as mutesController from '../controllers/mutes';
import { ROLE_MANAGER, ROLE_MODERATOR } from '../roles';

export default function userRoutes() {
  return router()
    .get(
      '/',
      protect(ROLE_MANAGER),
      route(controller.getUsers)
    )
    .get(
      '/:id',
      checkFields(validations.getUser),
      route(controller.getUser)
    )
    .post(
      '/:id/mute',
      protect(ROLE_MODERATOR),
      checkFields(validations.muteUser),
      route(mutesController.muteUser)
    )
    .delete(
      '/:id/mute',
      protect(ROLE_MODERATOR),
      checkFields(validations.unmuteUser),
      route(mutesController.unmuteUser)
    )
    .put(
      '/:id/role',
      protect(ROLE_MANAGER),
      checkFields(validations.setUserRole),
      route(controller.setUserRole)
    )
    .put(
      '/:id/username',
      checkFields(validations.setUserName),
      rateLimit('change-username', {
        max: 5,
        duration: 60 * 60 * 1000,
        error: (_, retryAfter) =>
          `You can only change your username five times per hour. Try again in ${retryAfter}.`,
      }),
      route(controller.setUserName)
    )
    .put(
      '/:id/avatar',
      checkFields(validations.setUserAvatar),
      route(controller.setUserAvatar)
    )
    .put(
      '/:id/status',
      checkFields(validations.setUserStatus),
      route(controller.setUserStatus)
    )
    .get(
      '/:id/history',
      checkFields(validations.getUserHistory),
      route(controller.getUserHistory)
    );
}
