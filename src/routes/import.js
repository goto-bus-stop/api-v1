import router from 'router';

import route from '../route';
import protect from '../middleware/protect';
import * as controller from '../controllers/import';

export default function importRoutes() {
  return router()
    .use(protect())
    .all(
      '/:source',
      route(controller.executeImportAction)
    )
    .all(
      '/:source/:action',
      route(controller.executeImportAction)
    );
}
