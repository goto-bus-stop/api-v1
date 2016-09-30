import router from 'router';

import route from '../route';
import * as validations from '../validations';
import checkFields from '../middleware/checkFields';
import * as controller from '../controllers/authenticate';

export default function authenticateRoutes() {
  return router()
    // GET /v1/auth/ - Get the current user.
    .get(
      '/',
      route(controller.getCurrentUser)
    )
    // POST /v1/auth/register - Create a new user.
    .post(
      '/register',
      checkFields(validations.register),
      route(controller.register)
    )
    // POST /v1/auth/login - Log in.
    .post(
      '/login',
      checkFields(validations.login),
      route(controller.login)
    )
    // POST /v1/auth/password/reset - Request a password reset.
    .post(
      '/password/reset',
      checkFields(validations.requestPasswordReset),
      route(controller.reset)
    )
    // POST /v1/password/reset/:reset - Reset a password.
    .post(
      '/password/reset/:reset',
      checkFields(validations.passwordReset),
      route(controller.changePassword)
    )
    // DELETE /v1/session/:id - End a user's session.
    .delete(
      '/session/:id',
      route(controller.removeSession)
    );
}
