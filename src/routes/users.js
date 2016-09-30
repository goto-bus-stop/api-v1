import router from 'router';

import route from '../route';
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
      route(controller.getUser)
    )
    .post(
      '/:id/mute',
      protect(ROLE_MODERATOR),
      route(mutesController.muteUser)
    )
    .delete(
      '/:id/mute',
      protect(ROLE_MODERATOR),
      route(mutesController.unmuteUser)
    )
    .put(
      '/:id/role',
      protect(ROLE_MANAGER),
      checkFields({ role: 'number' }),
      route(controller.setUserRole)
    )
    .put(
      '/:id/username',
      checkFields({ username: 'string' }),
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
      checkFields({ avatar: 'string' }),
      route(controller.setUserAvatar)
    )
    .put(
      '/:id/status',
      checkFields({ status: 'number' }),
      route(controller.setUserStatus)
    )
    .get(
      '/:id/history',
      route(controller.getUserHistory)
    );
}
