'use strict';

const { v4: uuidv4 } = require('uuid');
const PNF = require('google-libphonenumber')
  .PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const {
  Client,
  LocalAuth,
  MessageMedia,
} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

module.exports = ({ strapi }) => ({
  init: async config => {
    strapi.whatsapp.client = new Client({
      authStrategy: new LocalAuth({
        clientId: config.clientId,
        dataPath: '/opt/app/.wwebjs_auth',
      }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    // Set up a watchdog..
    setTimeout(async () => {
      if (
        !strapi.whatsapp.client.isAuthenticated ||
        !strapi.whatsapp.client.isReady
      ) {
        console.error(
          'WhatsApp web client not authenticated and ready within one minute. Restarting..',
        );
        process.exit();
      }
    }, 60000);

    let { clientId, handler, test } = config;
    const dirname = strapi.dirs.dist.src;
    const handlerFilename = `${dirname}/${handler}`;
    handler = require(handlerFilename);
    try {
      handler.prepare();
    } catch (err) {}

    strapi.whatsapp.client.on('qr', qr => {
      let propagate = true;
      try {
        propagate = handler.onQr(qr);
      } catch (err) {
      } finally {
        if (propagate) {
          console.log(
            '[DEFAULT] WhatsApp web client received QR:',
            qr,
          );
          qrcode.generate(qr, { small: true });
        }
      }
    });

    strapi.whatsapp.client.on('authenticated', session => {
      strapi.whatsapp.client.isAuthenticated = true;
      let propagate = true;
      try {
        propagate = handler.onAuthenticated(session);
      } catch (err) {
      } finally {
        if (propagate) {
          console.log(
            '[DEFAULT] WhatsApp web client got authenticated:',
            strapi.inspect(session),
          );
        }
      }
    });

    strapi.whatsapp.client.on('ready', () => {
      strapi.whatsapp.client.isReady = true;
      let propagate = true;
      try {
        propagate = handler.onReady();
      } catch (err) {
      } finally {
        if (propagate) {
          console.log(
            '[DEFAULT] WhatsApp web client is ready!',
          );
          if (test) {
            // Send test message in background..
            setTimeout(async () => {
              console.log('Sending test message..');
              let { msisdn, message } = test;
              message = `Hello, ${clientId} just got alive!`;
              await strapi
                .plugin('whatsapp-web')
                .controller('client')
                .send(msisdn, message);
            }, 2000);
          }
        }
      }
    });

    strapi.whatsapp.client.on('message', message => {
      let propagate = true;
      try {
        propagate = handler.onMessage(message);
      } catch (err) {
      } finally {
        if (propagate) {
          console.log(
            '[DEFAULT] WhatsApp web client got a message:',
            strapi.inspect(message),
          );

          // if(message.hasMedia) {
          //   const media = await message.downloadMedia();
          //   console.log('Media downloaded', media);
          // }

          if (message.body === '/ping') {
            message.reply('pong');
            strapi.whatsapp.client.sendMessage(
              message.from,
              'pong',
            );

            //
            // Send media from a Base64 image..
            //
            // const media = new MessageMedia(
            //   'image/png',
            //   base64Image,
            // );
            // chat.sendMessage(media, {caption: 'Put caption here..'});

            //
            // Send media from a file path..
            //
            // const media = MessageMedia.fromFilePath(
            //   './path/to/image.png',
            // );
            // chat.sendMessage(media);

            //
            // Send media from a URL..
            //
            // const media = await MessageMedia.fromUrl('https://via.placeholder.com/350x150.png');
            // chat.sendMessage(media);
          }
        }
      }
    });

    return strapi.whatsapp.client.initialize();
  },
  deinit: async () => {},
  send: async (
    msisdn,
    message,
    media = undefined,
    data = undefined,
  ) => {
    console.log('--send', msisdn);
    if (!msisdn) return;

    const number = phoneUtil.parseAndKeepRawInput(
      msisdn,
      'ID',
    );
    if (!phoneUtil.isValidNumber(number)) {
      console.error(`MSISDN ${number} is not Indonesian!`);
    }
    msisdn = phoneUtil.format(number, PNF.E164);
    // Hack to comply with WhatsApp's WID format..
    msisdn = (msisdn + '@c.us').substring(1);

    if (media) {
      strapi.whatsapp.client.sendMessage(msisdn, media, {
        caption: message,
      });
    } else {
      strapi.whatsapp.client.sendMessage(msisdn, message);
    }

    return 'ok';
  },
});
