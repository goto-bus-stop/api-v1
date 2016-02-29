import debug from 'debug';
import createRouter from 'router';

import * as controller from '../controllers/staff';
import { checkFields } from '../utils';
import handleError from '../errors';

const log = debug('uwave:api:v1:staff');

export default function staffRoutes() {
  const router = createRouter();

  router.get('/media', (req, res) => {
    const { page, limit } = req.query;
    controller.getAllMedia(req.uwave, parseInt(page, 10), parseInt(limit, 10))
    .then(media => res.status(200).json(media))
    .catch(e => handleError(res, e, log));
  });

  router.get('/media/:id', (req, res) => {
    if (req.user.role < 4) {
      return res.status(403).json('you need to be at least manager to do this');
    }
    if (!checkFields(res, req.body, { sourceType: 'string', sourceID: 'string' })) {
      return null;
    }

    controller.getMedia(req.uwave, req.body.sourceType, req.body.sourceID)
    .then(media => res.status(200).json(media))
    .catch(e => handleError(res, e, log));
  });

  router.post('/media/:id', (req, res) => {
    if (req.user.role < 4) {
      return res.status(403).json('you need to be at least manager to do this');
    }
    if (!checkFields(res, req.body, { sourceType: 'string', sourceID: 'string' })) {
      return null;
    }

    controller.addMedia(req.uwave, req.body.sourceType, req.body.sourceID)
    .then(media => res.status(200).json(media))
    .catch(e => handleError(res, e, log));
  });

  router.put('/media/:id', (req, res) => {
    if (req.user.role < 4) {
      return res.status(403).json('you need to be at least manager to do this');
    }
    if (!req.body.auto) {
      if (!checkFields(res, req.body, {
        sourceType: 'string',
        sourceID: 'string',
        artist: 'string',
        title: 'string'
      })) {
        return null;
      }

      if (!Array.isArray(req.body.restricted)) {
        res.status(422).json('restricted has to be an array of strings');
      }
    } else if (!checkFields(res, req.body, {
      sourceType: 'string',
      sourceID: 'string',
      auto: 'boolean'
    })) {
      return res.status(422).json(
        'expected sourceType to be a string, sourceID to be a string and auto to be boolean'
      );
    }

    controller.editMedia(req.uwave, req.body)
    .then(media => res.status(200).json(media))
    .catch(e => handleError(res, e, log));
  });

  router.delete('/media/:id', (req, res) => {
    if (req.user.role < 4) {
      return res.status(403).json('you need to be at least manager to do this');
    }
    if (!checkFields(res, req.body, { sourceType: 'string', sourceID: 'string' })) {
      return res.status(422).json('expected sourceType to be a string and sourceID to be a string');
    }

    controller.removeMedia(req.uwave, req.body.sourceType, req.body.sourceID)
    .then(media => res.status(200).json(media))
    .catch(e => handleError(res, e, log));
  });

  return router;
}
