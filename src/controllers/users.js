import clamp from 'clamp';

import { createCommand } from '../sockets';

import { skipIfCurrentDJ } from './booth';
import { leaveWaitlist } from './waitlist';

export function setStatus(uw, id, status) {
  uw.redis.publish('v1', createCommand('statusChange', {
    userID: id,
    status: clamp(status, 0, 3),
  }));
}

export async function disconnectUser(uw, user) {
  const userID = typeof user === 'object' ? `${user._id}` : user;

  await skipIfCurrentDJ(uw, userID);

  try {
    await leaveWaitlist(uw, userID);
  } catch (e) {
    // Ignore
  }

  await uw.redis.lrem('users', 0, userID);

  uw.publish('user:leave', { userID });
}

export async function getHistory(uw, id, pagination) {
  const user = await uw.getUser(id);
  return user.getHistory(pagination);
}
