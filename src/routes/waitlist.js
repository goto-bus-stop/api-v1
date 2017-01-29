import createRouter from 'router';

import protect from '../middleware/protect';
import requireActiveConnection from '../middleware/requireActiveConnection';
import checkFields from '../middleware/checkFields';
import * as controller from '../controllers/waitlist';
import { PermissionError } from '../errors';
import toItemResponse from '../utils/toItemResponse';
import toListResponse from '../utils/toListResponse';

export default function waitlistRoutes() {
  const router = createRouter();

  router.get('/', (req, res, next) => {
    controller.getWaitlist(req.uwave)
      .then(waitlist => toListResponse(waitlist, { url: req.fullUrl }))
      .then(list => res.status(200).json(list))
      .catch(next);
  });

  router.post('/',
    protect('waitlist.join'),
    requireActiveConnection(),
    checkFields({ userID: 'string' }),
    (req, res, next) => {
      let position = parseInt(req.body.position, 10);
      position = isFinite(position) ? position : -1;

      const targetID = req.body.userID;
      const promise = position !== -1
        ? req.user.can('waitlist.add')
        : Promise.resolve(true);
      promise.then((canAdd) => {
        if (!canAdd) {
          throw new PermissionError(
            'You must have the \'waitlist.add\' permission to do this.');
        }
      })
        .then(() => (position === -1
          ? controller.appendToWaitlist(req.uwave, req.user, targetID)
          : controller.insertWaitlist(req.uwave, req.user, targetID, position)
        ))
        .then(waitlist => toListResponse(waitlist, { url: req.fullUrl }))
        .then(list => res.status(200).json(list))
        .catch(next);
    },
  );

  router.delete('/', protect('waitlist.clear'), (req, res, next) => {
    controller.clearWaitlist(req.uwave, req.user.id)
      .then(waitlist => toListResponse(waitlist, { url: req.fullUrl }))
      .then(list => res.status(200).json(list))
      .catch(next);
  });

  router.put('/move', protect('waitlist.move'), checkFields({
    userID: 'string',
    position: 'number',
  }), (req, res, next) => {
    controller.moveWaitlist(req.uwave, req.user.id, req.body.userID, req.body.position)
      .then(waitlist => toListResponse(waitlist, { url: req.fullUrl }))
      .then(list => res.status(200).json(list))
      .catch(next);
  });

  router.delete('/:id', protect('waitlist.leave'), (req, res, next) => {
    let promise;
    if (req.user.id !== req.params.id) {
      promise = controller.removeFromWaitlist(req.uwave, req.user, req.params.id);
    } else {
      promise = controller.leaveWaitlist(req.uwave, req.user);
    }

    promise
      .then(waitlist => toListResponse(waitlist, { url: req.fullUrl }))
      .then(list => res.status(200).json(list))
      .catch(next);
  });

  router.put('/lock', protect('waitlist.lock'), checkFields({
    lock: 'boolean',
  }), (req, res, next) => {
    controller.lockWaitlist(req.uwave, req.user.id, req.body.lock)
      .then(locked => toItemResponse({
        locked,
      }, { url: req.fullUrl }))
      .then(item => res.status(200).json(item))
      .catch(next);
  });

  return router;
}
