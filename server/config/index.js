'use strict';

const util = require('util');

// console.log('WhatsApp config..');
// console.log(
//   'Config ->',
//   strapi.config.server['whatsapp-web'],
// );

module.exports = {
  default: ({ env }) => {
    if (
      !strapi.config.server['whatsapp-web'] ||
      !strapi.config.server['whatsapp-web'].enabled
    ) {
      return undefined;
    }
    return strapi.config.server['whatsapp-web'].config;
  },
  validator: config => {
    try {
      // Check if Chromium is available..
      var exec = require('child_process').exec;
      console.log('Running chromium --version..');
      var child = exec('chromium --version', function(
        error,
        stdout,
        stderr,
      ) {
        // console.log('stdout: ' + stdout);
        // console.log('stderr: ' + stderr);
        if (error !== null) {
          console.log('exec error: ' + error);
        }

        if (stdout && stdout.startsWith('Chromium')) {
          // console.log('Chromium is available');
        } else {
          console.error('Chromium is not available');
          throw new Error();
        }
      });

      // Check if registered handler is available..
      const { clientId, handler } = config;
      const dirname = strapi.dirs.dist.src;
      const handlerFilename = `${dirname}/${handler}`;
      require(handlerFilename);
      console.log(
        `WhatsApp web ${util.inspect(
          clientId,
        )} configuration is valid!`,
      );

      // Everything's okay!
      strapi.whatsapp = {
        config,
        client: undefined,
      };
    } catch (err) {
      strapi.log.warn(
        `WhatsApp web got disabled or configuration is invalid!`,
      );
    }
  },
};
