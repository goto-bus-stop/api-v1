import debug from 'debug';

import { GenericError } from '../errors';
import { fetchMedia } from './search';

const log = debug('uwave:api:v1:staff');

export const getAllMedia = function getAllMedia(page, limit, mongo) {
  const Media = mongo.model('Media');
  const _limit = Math.min(limit, 100);
  return Media.find({}).setOptions({ 'limit': _limit, 'skip': _limit * page });
};

export const getMedia = function getMedia(type, id, mongo) {
  const Media = mongo.model('Media');

  return Media.find({ 'sourceType': type, 'sourceID': id })
  .then(media => {
    if (!media) throw new GenericError(404, 'no media found');

    return media;
  });
};

export const addMedia = function addMedia(type, id, keys, mongo) {
  const Media = mongo.model('Media');
  return fetchMedia(type, id, keys)
  .then(media => {
    return new Media(media).save();
  });
};

export const editMedia = function editMedia(metadata, mongo) {
  const Media = mongo.model('Media');
  return Media.findOneAndUpdate(
    { 'sourceType': metadata.sourceType, 'sourceID': metadata.sourceID },
    { 'artist': metadata.artist, 'title': metadata.title }
  )
  .then(media => {
    if (!media) throw new GenericError(404, 'no media found');
    return media;
  });
};

export const removeMedia = function removeMedia(type, id, mongo) {
  const Media = mongo.model('Media');
  return Media.findOneAndRemove({ 'sourceType': type, 'sourceID': id })
  .then(media => {
    if (!media) throw new GenericError(404, 'no media found');
    return media;
  });
};