import router from 'router';

import route from '../route';
import * as validations from '../validations';
import protect from '../middleware/protect';
import checkFields from '../middleware/checkFields';
import * as controller from '../controllers/playlists';

export default function playlistRoutes() {
  return router()
    .use(protect())

    .get(
      '/',
      route(controller.getPlaylists)
    )
    .post(
      '/',
      checkFields(validations.createPlaylist),
      route(controller.createPlaylist)
    )

    // Individual playlists
    .get(
      '/:id',
      checkFields(validations.getPlaylist),
      route(controller.getPlaylist)
    )
    .delete(
      '/:id',
      checkFields(validations.deletePlaylist),
      route(controller.deletePlaylist)
    )
    .patch(
      '/:id',
      checkFields(validations.updatePlaylist),
      route(controller.updatePlaylist)
    )
    // Playlist actions
    .put(
      '/:id/rename',
      checkFields(validations.renamePlaylist),
      route(controller.renamePlaylist)
    )
    .put(
      '/:id/share',
      checkFields(validations.sharePlaylist),
      route(controller.sharePlaylist)
    )
    .put(
      '/:id/activate',
      route(controller.activatePlaylist)
    )
    .get(
      '/:id/media',
      checkFields(validations.getPlaylistItems),
      route(controller.getPlaylistItems)
    )
    .post(
      '/:id/media',
      checkFields(validations.addPlaylistItems),
      route(controller.addPlaylistItems)
    )
    .delete(
      '/:id/media',
      checkFields(validations.removePlaylistItems),
      route(controller.removePlaylistItems)
    )
    .put(
      '/:id/move',
      checkFields(validations.movePlaylistItems),
      route(controller.movePlaylistItems)
    )
    .post(
      '/:id/shuffle',
      checkFields(validations.shufflePlaylistItems),
      route(controller.shufflePlaylistItems)
    )
    // Playlist items
    .get(
      '/:id/media/:itemID',
      checkFields(validations.getPlaylistItem),
      route(controller.getPlaylistItem)
    )
    .put(
      '/:id/media/:itemID',
      checkFields(validations.updatePlaylistItem),
      route(controller.updatePlaylistItem)
    )
    .delete(
      '/:id/media/:itemID',
      checkFields(validations.removePlaylistItem),
      route(controller.removePlaylistItem)
    );
}
