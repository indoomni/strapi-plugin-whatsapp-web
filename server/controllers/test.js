'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('whatsapp-web')
      .service('test')
      .doSomething('Welcome to Strapi 🚀');
  },
});
