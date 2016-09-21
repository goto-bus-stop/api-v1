import debug from 'debug';
import createRouter from 'router';

import protect from '../middleware/protect';
import * as controller from '../controllers/booth';
import { checkFields } from '../utils';
import { handleError } from '../errors';
import { ROLE_MODERATOR } from '../roles';
import getOffsetPagination from '../utils/getOffsetPagination';
import toPaginatedResponse from '../utils/toPaginatedResponse';

const log = debug('uwave:api:v1:booth');

export default function boothRoutes() {
  const router = createRouter();

  router.get('/', (req, res) => {
    controller.getBooth(req.uwave)
      .then(booth => res.status(200).json(booth))
      .catch(e => handleError(res, e, log));
  });

  router.post('/skip', protect(), (req, res) => {
    const skippingSelf = (!req.body.userID && !req.body.reason) ||
      req.body.userID === req.user.id;
    const opts = { remove: !!req.body.remove };

    if (skippingSelf) {
      controller.getCurrentDJ(req.uwave)
        .then((currentDJ) => {
          if (!currentDJ || currentDJ !== req.user.id) {
            res.status(412).json('you are not currently playing');
            return null;
          }

          return controller.skipBooth(req.uwave, null, req.user.id, null, opts)
            .then(skipped => res.status(200).json(skipped));
        })
        .catch(e => handleError(res, e, log));
    } else {
      if (req.user.role < ROLE_MODERATOR) {
        res.status(412).json('you need to be at least a moderator to do this');
        return;
      }

      if (!checkFields(res, req.body, { userID: 'string', reason: 'string' })) {
        return;
      }

      controller.skipBooth(req.uwave, req.user.id, req.body.userID, req.body.reason, opts)
        .then(skipped => res.status(200).json(skipped))
        .catch(e => handleError(res, e, log));
    }
  });

  router.post('/replace', protect(ROLE_MODERATOR), (req, res) => {
    if (typeof req.body.userID === 'undefined') {
      res.status(422).json('userID is not set');
      return;
    }
    if (typeof req.body.userID !== 'string') {
      res.status(422).json('userID has to be of type string');
      return;
    }

    controller.replaceBooth(req.uwave, req.user.id, req.body.userID)
      .then(replaced => res.status(200).json(replaced))
      .catch(e => handleError(res, e, log));
  });

  router.post('/favorite', protect(), (req, res) => {
    if (!checkFields(res, req.body, { playlistID: 'string', historyID: 'string' })) {
      return;
    }

    controller.favorite(req.uwave, req.user.id, req.body.playlistID, req.body.historyID)
      .then(playlist => res.status(200).json(playlist))
      .catch(e => handleError(res, e, log));
  });

  router.get('/history', (req, res) => {
    const pagination = getOffsetPagination(req.query, {
      defaultSize: 25,
      maxSize: 100,
    });
    controller.getHistory(req.uwave, pagination)
      .then(history => toPaginatedResponse(history, {
        included: {
          media: ['media.media'],
          user: ['user'],
        },
      }))
      .then(page => res.json(page))
      .catch(e => handleError(res, e, log));
  });

  return router;
}
