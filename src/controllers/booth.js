import Promise from 'bluebird';
// Will be unnecessary later when a history module exists in -core.
// For now we'll assume that we've got a u-wave-core peer installed.
// eslint-disable-next-line
import Page from 'u-wave-core/lib/Page';

import { createCommand } from '../sockets';
import {
  CombinedError,
  HTTPError,
  NotFoundError,
  PermissionError,
} from '../errors';
import {
  ROLE_MODERATOR,
} from '../roles';
import getOffsetPagination from '../utils/getOffsetPagination';
import toItemResponse from '../utils/toItemResponse';
import toListResponse from '../utils/toListResponse';
import toPaginatedResponse from '../utils/toPaginatedResponse';

export async function isEmpty(uw) {
  return !(await uw.redis.get('booth:historyID'));
}

export async function getBoothState(uw) {
  const History = uw.model('History');

  const historyID = await uw.redis.get('booth:historyID');
  const historyEntry = await History.findById(historyID)
    .populate('media.media');

  if (!historyEntry || !historyEntry.user) {
    return {};
  }

  const stats = await Promise.props({
    upvotes: uw.redis.lrange('booth:upvotes', 0, -1),
    downvotes: uw.redis.lrange('booth:downvotes', 0, -1),
    favorites: uw.redis.lrange('booth:favorites', 0, -1),
  });

  return {
    historyID,
    playlistID: `${historyEntry.playlist}`,
    playedAt: Date.parse(historyEntry.playedAt),
    userID: `${historyEntry.user}`,
    media: historyEntry.media,
    stats,
  };
}

export function getBooth(req) {
  return getBoothState(req.uwave)
    .then(booth => toItemResponse(booth, { url: req.fullUrl }));
}

export async function getCurrentDJ(uw) {
  return await uw.redis.get('booth:currentDJ');
}

export async function skipBooth(req) {
  const uw = req.uwave;
  const moderator = req.user;
  const { userID, reason } = req.body;
  const opts = {
    remove: !!req.body.remove,
  };

  const bodyIsEmpty = !userID && !reason;
  const skippingSelf = userID === moderator.id || bodyIsEmpty;

  if (skippingSelf) {
    const currentDJ = await getCurrentDJ(req.uwave);
    if (!currentDJ || currentDJ !== moderator.id) {
      throw new HTTPError(412, 'You are not currently playing');
    }
  } else {
    if (moderator.role < ROLE_MODERATOR) {
      throw new PermissionError('You need to be a moderator to do this');
    }
    const errors = [];
    if (typeof userID !== 'string') {
      errors.push(new HTTPError(422, 'userID: Expected a string'));
    }
    if (typeof reason !== 'string') {
      errors.push(new HTTPError(422, 'reason: Expected a string'));
    }
    if (errors.length > 0) {
      throw new CombinedError(errors);
    }
  }

  uw.redis.publish('v1', createCommand('skip', {
    moderatorID: skippingSelf ? null : moderator.id,
    userID,
    reason,
  }));

  await uw.advance({
    remove: opts.remove === true,
  });

  return toItemResponse({});
}

export async function skipIfCurrentDJ(uw, userID) {
  const currentDJ = await getCurrentDJ(uw);
  if (userID === currentDJ) {
    await uw.advance({ remove: true });
  }
}

export async function replaceBooth(req) {
  const uw = req.uwave;
  const moderator = req.user;
  const { userID } = req.body;
  let waitlist = await uw.redis.lrange('waitlist', 0, -1);

  if (!waitlist.length) throw new NotFoundError('Waitlist is empty.');

  if (waitlist.some(waitingID => waitingID === userID)) {
    uw.redis.lrem('waitlist', 1, userID);
    await uw.redis.lpush('waitlist', userID);
    waitlist = await uw.redis.lrange('waitlist', 0, -1);
  }

  uw.redis.publish('v1', createCommand('boothReplace', {
    moderatorID: moderator.id,
    userID,
  }));

  await uw.advance();

  return toItemResponse({});
}

async function addVote(uw, userID, direction) {
  await Promise.all([
    uw.redis.lrem('booth:upvotes', 0, userID),
    uw.redis.lrem('booth:downvotes', 0, userID),
  ]);
  await uw.redis.lpush(
    direction > 0 ? 'booth:upvotes' : 'booth:downvotes',
    userID
  );
  uw.publish('booth:vote', {
    userID, direction,
  });
}

export async function vote(uw, userID, direction) {
  const currentDJ = await uw.redis.get('booth:currentDJ');
  if (currentDJ !== null && currentDJ !== userID) {
    const historyID = await uw.redis.get('booth:historyID');
    if (historyID === null) return;
    if (direction > 0) {
      const upvoted = await uw.redis.lrange('booth:upvotes', 0, -1);
      if (upvoted.indexOf(userID) === -1) {
        await addVote(uw, userID, 1);
      }
    } else {
      const downvoted = await uw.redis.lrange('booth:downvotes', 0, -1);
      if (downvoted.indexOf(userID) === -1) {
        await addVote(uw, userID, -1);
      }
    }
  }
}

export async function favorite(req) {
  const uw = req.uwave;
  const Playlist = uw.model('Playlist');
  const PlaylistItem = uw.model('PlaylistItem');
  const History = uw.model('History');

  const user = req.user;
  const { playlistID, historyID } = req.body;

  const historyEntry = await History.findById(historyID)
    .populate('media.media');

  if (!historyEntry) {
    throw new NotFoundError('History entry not found.');
  }
  if (`${historyEntry.user}` === user.id) {
    throw new PermissionError('You can\'t favorite your own plays.');
  }

  const playlist = await Playlist.findById(playlistID);

  if (!playlist) throw new NotFoundError('Playlist not found.');
  if (`${playlist.author}` !== user.id) {
    throw new PermissionError('You can\'t edit another user\'s playlist.');
  }

  // `.media` has the same shape as `.item`, but is guaranteed to exist and have
  // the same properties as when the playlist item was actually played.
  const playlistItem = new PlaylistItem(historyEntry.media.toJSON());

  await playlistItem.save();

  playlist.media.push(playlistItem.id);

  uw.redis.lrem('booth:favorites', 0, user.id);
  uw.redis.lpush('booth:favorites', user.id);
  uw.redis.publish('v1', createCommand('favorite', {
    userID: user.id,
    playlistID,
  }));

  await playlist.save();

  return toListResponse([playlistItem], {
    meta: {
      playlistSize: playlist.media.length,
    },
  });
}

export async function getHistory(req, res, filter = {}) {
  const uw = req.uwave;
  const History = uw.model('History');

  const pagination = getOffsetPagination(req.query, {
    defaultSize: 25,
    maxSize: 100,
  });

  const history = await History.find({})
    .where(filter)
    .skip(pagination.offset)
    .limit(pagination.limit)
    .sort({ playedAt: -1 })
    .populate('media.media user');

  const count = await History.where(filter).count();

  const page = new Page(history, {
    pageSize: pagination ? pagination.limit : null,
    filtered: count,
    total: count,

    current: pagination,
    next: pagination ? {
      offset: pagination.offset + pagination.limit,
      limit: pagination.limit,
    } : null,
    previous: pagination ? {
      offset: Math.max(pagination.offset - pagination.limit, 0),
      limit: pagination.limit,
    } : null,
  });

  return toPaginatedResponse(page, {
    included: {
      media: ['media.media'],
      user: ['user'],
    },
  });
}
