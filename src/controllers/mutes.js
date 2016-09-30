import {
  HTTPError,
  NotFoundError,
  PermissionError,
} from '../errors';
import toItemResponse from '../utils/toItemResponse';

export async function muteUser(req) {
  if (typeof req.body.time !== 'number' || !isFinite(req.body.time)) {
    throw new HTTPError(400, 'Expected "time" to be a number.');
  }
  if (req.user.id === req.params.id) {
    throw new PermissionError('You can\'t mute yourself.');
  }

  const duration = req.body.time;
  const user = await req.uwave.getUser(req.params.id);
  if (!user) throw new NotFoundError('User not found.');

  await user.mute(duration, { moderator: req.user });

  return toItemResponse({});
}

export async function unmuteUser(req) {
  if (req.user.id === req.params.id) {
    throw new PermissionError('You can\'t unmute yourself.');
  }

  const user = await req.uwave.getUser(req.params.id);
  if (!user) throw new NotFoundError('User not found.');

  await user.unmute({ moderator: req.user });

  return toItemResponse({});
}
