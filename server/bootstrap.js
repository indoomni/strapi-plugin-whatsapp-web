'use strict';

// console.log('WhatsApp bootstrap..');

module.exports = async ({ strapi }) => {
  try {
    const { config } = strapi.whatsapp;

    if (
      strapi
        .plugin('whatsapp-web')
        .controller('client')
        .init(config)
    ) {
      // Do anything..?
    }
    strapi.log.info(
      `Bootstrapped WhatsApp web: ${strapi.inspect(
        config.clientId,
      )}`,
    );
  } catch (err) {
    strapi.log.info('WhatsApp web not bootstrapped!');
  }
};
