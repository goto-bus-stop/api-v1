import createRouter from 'router';

import protect from '../middleware/protect';
import toItemResponse from '../utils/toItemResponse';

export default function chatRoutes() {
  const router = createRouter();

  router.delete('/', protect('chat.delete'), (req, res) => {
    req.uwave.deleteChat(
      {},
      { moderator: req.user },
    );
    res.status(200).json(toItemResponse({}));
  });

  router.delete('/user/:id', protect('chat.delete'), (req, res) => {
    req.uwave.deleteChat(
      { userID: req.params.id },
      { moderator: req.user },
    );
    res.status(200).json(toItemResponse({}));
  });

  router.delete('/:id', protect('chat.delete'), (req, res) => {
    req.uwave.deleteChat(
      { id: req.params.id },
      { moderator: req.user },
    );
    res.status(200).json(toItemResponse({}));
  });

  return router;
}
