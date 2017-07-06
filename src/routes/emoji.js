import Router from 'router';
import route from '../route';
import { ROLE_MODERATOR } from '../roles';
import { HTTPError } from '../errors';
import protect from '../middleware/protect';
import * as controller from '../controllers/emoji';

export default function emojiRouter() {
  function checkEmojiEnabled(req, res, next) {
    if (!req.uwave.emoji) {
      next(new HTTPError(400, 'Emoji are not enabled.'));
    } else {
      next();
    }
  }

  return Router()
    .use(checkEmojiEnabled)
    .get(
      '/',
      route(controller.getAll),
    )
    .get(
      '/:shortcode',
      route(controller.getEmoji),
    )
    .put(
      '/:shortcode',
      protect(ROLE_MODERATOR),
      route(controller.addCustomEmoji),
    )
    .delete(
      '/:shortcode',
      protect(ROLE_MODERATOR),
      route(controller.deleteCustomEmoji),
    );
}
