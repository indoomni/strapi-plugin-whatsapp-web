'use strict';

const { v4: uuidv4 } = require('uuid');
const PNF = require('google-libphonenumber')
  .PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const {
  Buttons,
  Client,
  List,
  LocalAuth,
  Location,
  MessageMedia,
} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const _inspectMessage = msg => {
  const { type, from, fromMe, notifyName, to, body } = msg;
  return `${type} from ${
    fromMe ? 'myself' : from + '(' + notifyName + ')'
  } to ${to} -> ${body}`;
};

module.exports = ({ strapi }) => ({
  init: async config => {
    console.log('WhatsApp Web library --init');

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
    // setTimeout(async () => {
    //   if (
    //     !strapi.whatsapp.client.qr &&
    //     (!strapi.whatsapp.client.isAuthenticated ||
    //       !strapi.whatsapp.client.isReady)
    //   ) {
    //     console.error(
    //       'WhatsApp web client not authenticated and ready within one minute. Restarting..',
    //     );
    //     process.exit();
    //   }
    // }, 60000);

    let { clientId, handler, test } = config;
    const dirname = strapi.dirs.dist.src;
    const handlerFilename = `${dirname}/${handler}`;
    handler = require(handlerFilename);
    try {
      await handler.prepare();
    } catch (err) {}

    //
    // CONNECTION STATE EVENTS..
    //

    strapi.whatsapp.client.on(
      'loading_screen',
      async (percent, message) => {
        // strapi.whatsapp.client.loading = true;
        // strapi.whatsapp.client.loadingPercent = percent;
        // strapi.whatsapp.client.loadingMessage = message;
        let propagate = true;
        try {
          propagate = await handler.onLoading(
            percent,
            message,
          );
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onLoading event: ${percent}% ${message}`,
            );
          }
        }
      },
    );

    // NOTE: This event will not be fired if a session is specified.
    strapi.whatsapp.client.on('qr', async qr => {
      strapi.whatsapp.client.qr = qr;
      let propagate = true;
      try {
        propagate = await handler.onQr(qr);
      } catch (err) {
      } finally {
        if (propagate) {
          console.log(`[DEFAULT] onQr event: ${qr}`);
          qrcode.generate(qr, { small: true });
        }
      }
    });

    strapi.whatsapp.client.on('authenticated', async () => {
      strapi.whatsapp.client.isAuthenticated = true;
      let propagate = true;
      try {
        propagate = await handler.onAuthenticated();
      } catch (err) {
      } finally {
        if (propagate) {
          console.log(`[DEFAULT] onAuthenticated event`);
        }
      }
    });

    // NOTE: This event will be fired if session restore was unsuccessful
    strapi.whatsapp.client.on('auth_failure', async msg => {
      strapi.whatsapp.client.isAuthenticated = false;
      let propagate = true;
      try {
        propagate = await handler.onAuthenticationFailure(
          msg,
        );
      } catch (err) {
      } finally {
        if (propagate) {
          console.log(
            `[DEFAULT] onAuthenticationFailure event: ${msg}`,
          );
        }
      }
    });

    strapi.whatsapp.client.on('ready', async () => {
      strapi.whatsapp.client.isReady = true;
      let propagate = true;
      try {
        propagate = await handler.onReady();
      } catch (err) {
      } finally {
        if (propagate) {
          console.log(`[DEFAULT] onReady event`);
          if (test) {
            // Send test message in background..
            setTimeout(async () => {
              console.log('Sending test message..');
              let { msisdn, message } = test;
              message = `Hello, WhatsApp Web client ${clientId} just got alive!`;
              await strapi
                .plugin('whatsapp-web')
                .controller('client')
                .send(msisdn, message);
            }, 0);
          }
        }
      }
    });

    strapi.whatsapp.client.on(
      'change_state',
      async state => {
        let propagate = true;
        try {
          propagate = await handler.onStateChanged(state);
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onStateChanged event: ${state}`,
            );
          }
        }
      },
    );

    strapi.whatsapp.client.on(
      'disconnected',
      async reason => {
        strapi.whatsapp.client.isAuthenticated = false;
        strapi.whatsapp.client.isReady = false;
        let propagate = true;
        try {
          propagate = await handler.onDisconnected(reason);
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onDisconnected event: ${reason}`,
            );
          }
        }
      },
    );

    //
    // MESSAGE EVENTS..
    //

    // NOTE: Fired on all message creations, including your own
    strapi.whatsapp.client.on(
      'message_create',
      async msg => {
        let propagate = true;
        try {
          propagate = await handler.onMessageCreated(msg);
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onMessageCreated event: ${_inspectMessage(
                msg,
              )}`,
            );
            // if (msg.fromMe) {
            // }
          }
        }
      },
    );

    // NOTE: Fired whenever a message is deleted by anyone (including you)
    strapi.whatsapp.client.on(
      'message_revoke_everyone',
      async (after, before) => {
        let propagate = true;
        try {
          propagate = await handler.onMessageRevokedByEveryone(
            after,
            before,
          );
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onMessageRevokedByEveryone event: ${before} -> ${after}`,
            );
            // console.log(after); // message after it was deleted.
            // if (before) {
            //   console.log(before); // message before it was deleted.
            // }
          }
        }
      },
    );

    // NOTE: Fired whenever a message is only deleted in your own view.
    strapi.whatsapp.client.on(
      'message_revoke_me',
      async msg => {
        let propagate = true;
        try {
          propagate = await handler.onMessageRevokedByMe(
            msg,
          );
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onMessageRevokedByMe event: ${_inspectMessage(
                msg,
              )}`,
            );
          }
        }
      },
    );

    strapi.whatsapp.client.on(
      'message_ack',
      async (msg, ack) => {
        /*
          == ACK VALUES ==
          ACK_ERROR: -1
          ACK_PENDING: 0
          ACK_SERVER: 1
          ACK_DEVICE: 2
          ACK_READ: 3
          ACK_PLAYED: 4
      */
        let propagate = true;
        try {
          propagate = await handler.onMessageAcknowledged(
            msg,
            ack,
          );
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onMessageAcknowledged event: ${_inspectMessage(
                msg,
              )} -> ack:${ack}`,
            );
          }
        }
      },
    );

    strapi.whatsapp.client.on('message', async msg => {
      let propagate = true;
      try {
        propagate = handler.onMessage(msg);
      } catch (err) {
      } finally {
        if (propagate) {
          console.log(
            `[DEFAULT] onMessage event: ${_inspectMessage(
              msg,
            )}`,
          );

          if (!msg.body || msg.body === '') {
            // Do nothing..
            console.log('What the frick!?', msg);

            //
            // PERSONAL CHATS..
            //
          } else if (msg.body === '!ping reply') {
            // Send a new message as a reply to the current one
            msg.reply('pong');
          } else if (msg.body === '!ping') {
            // Send a new message to the same chat
            strapi.whatsapp.client.sendMessage(
              msg.from,
              'pong',
            );
          } else if (msg.body.startsWith('!echo ')) {
            // Replies with the same message
            msg.reply(msg.body.slice(6));
          } else if (msg.body.startsWith('!sendto ')) {
            // Direct send a new message to specific id
            let number = msg.body.split(' ')[1];
            let messageIndex =
              msg.body.indexOf(number) + number.length;
            let message = msg.body.slice(
              messageIndex,
              msg.body.length,
            );
            number = number.includes('@c.us')
              ? number
              : `${number}@c.us`;
            let chat = await msg.getChat();
            chat.sendSeen();
            strapi.whatsapp.client.sendMessage(
              number,
              message,
            );
          } else if (msg.body === '!chats') {
            const chats = await strapi.whatsapp.client.getChats();
            strapi.whatsapp.client.sendMessage(
              msg.from,
              `The bot has ${chats.length} chats open.`,
            );
          } else if (msg.body === '!info') {
            let info = strapi.whatsapp.client.info;
            strapi.whatsapp.client.sendMessage(
              msg.from,
              `
*Connection info*
User name: ${info.pushname}
My number: ${info.wid.user}
Platform: ${info.platform}
            `,
            );
          } else if (
            msg.body === '!mediainfo' &&
            msg.hasMedia
          ) {
            const attachmentData = await msg.downloadMedia();
            msg.reply(`
*Media info*
MimeType: ${attachmentData.mimetype}
Filename: ${attachmentData.filename}
Data (length): ${attachmentData.data.length}
            `);
          } else if (
            msg.body === '!quoteinfo' &&
            msg.hasQuotedMsg
          ) {
            const quotedMsg = await msg.getQuotedMessage();
            quotedMsg.reply(`
*Quoted message info*
ID: ${quotedMsg.id._serialized}
Type: ${quotedMsg.type}
Author: ${quotedMsg.author || quotedMsg.from}
Timestamp: ${quotedMsg.timestamp}
Has Media? ${quotedMsg.hasMedia}
            `);
          } else if (
            msg.body === '!resendmedia' &&
            msg.hasQuotedMsg
          ) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
              const attachmentData = await quotedMsg.downloadMedia();
              strapi.whatsapp.client.sendMessage(
                msg.from,
                attachmentData,
                {
                  caption: "Here's your requested media.",
                },
              );
            }
          } else if (msg.body === '!location') {
            msg.reply(
              new Location(
                37.422,
                -122.084,
                'Googleplex\nGoogle Headquarters',
              ),
            );
          } else if (msg.location) {
            msg.reply(msg.location);
          } else if (msg.body.startsWith('!status ')) {
            const newStatus = msg.body.split(' ')[1];
            await strapi.whatsapp.client.setStatus(
              newStatus,
            );
            msg.reply(
              `Status was updated to *${newStatus}*`,
            );
          } else if (msg.body === '!mention') {
            const contact = await msg.getContact();
            const chat = await msg.getChat();
            chat.sendMessage(`Hi @${contact.number}!`, {
              mentions: [contact],
            });
          } else if (msg.body === '!delete') {
            if (msg.hasQuotedMsg) {
              const quotedMsg = await msg.getQuotedMessage();
              if (quotedMsg.fromMe) {
                quotedMsg.delete(true);
              } else {
                msg.reply(
                  'I can only delete my own messages',
                );
              }
            }
          } else if (msg.body === '!pin') {
            const chat = await msg.getChat();
            await chat.pin();
          } else if (msg.body === '!archive') {
            const chat = await msg.getChat();
            await chat.archive();
          } else if (msg.body === '!mute') {
            const chat = await msg.getChat();
            // mute the chat for 20 seconds
            const unmuteDate = new Date();
            unmuteDate.setSeconds(
              unmuteDate.getSeconds() + 20,
            );
            await chat.mute(unmuteDate);
          } else if (msg.body === '!typing') {
            const chat = await msg.getChat();
            // simulates typing in the chat
            chat.sendStateTyping();
          } else if (msg.body === '!recording') {
            const chat = await msg.getChat();
            // simulates recording audio in the chat
            chat.sendStateRecording();
          } else if (msg.body === '!clearstate') {
            const chat = await msg.getChat();
            // stops typing or recording in the chat
            chat.clearState();
          } else if (msg.body === '!jumpto') {
            if (msg.hasQuotedMsg) {
              const quotedMsg = await msg.getQuotedMessage();
              strapi.whatsapp.client.interface.openChatWindowAt(
                quotedMsg.id._serialized,
              );
            }
          } else if (msg.body === '!buttons') {
            let button = new Buttons(
              'Button body',
              [
                { body: 'bt1' },
                { body: 'bt2' },
                { body: 'bt3' },
              ],
              'title',
              'footer',
            );
            strapi.whatsapp.client.sendMessage(
              msg.from,
              button,
            );
          } else if (msg.body === '!list') {
            let sections = [
              {
                title: 'sectionTitle',
                rows: [
                  {
                    title: 'ListItem1',
                    description: 'desc',
                  },
                  { title: 'ListItem2' },
                ],
              },
            ];
            let list = new List(
              'List body',
              'btnText',
              sections,
              'Title',
              'footer',
            );
            strapi.whatsapp.client.sendMessage(
              msg.from,
              list,
            );
          } else if (msg.body === '!reaction') {
            msg.react('👍');

            //
            // GROUP CHATS..
            //
          } else if (msg.body.startsWith('!join ')) {
            const inviteCode = msg.body.split(' ')[1];
            try {
              await strapi.whatsapp.client.acceptInvite(
                inviteCode,
              );
              msg.reply('Joined the group!');
            } catch (e) {
              msg.reply(
                'That invite code seems to be invalid.',
              );
            }
          } else if (msg.body === '!leave') {
            // Leave the group
            let chat = await msg.getChat();
            if (chat.isGroup) {
              chat.leave();
            } else {
              msg.reply(
                'This command can only be used in a group!',
              );
            }
          } else if (msg.body === '!groupinfo') {
            let chat = await msg.getChat();
            if (chat.isGroup) {
              msg.reply(`
*Group Details*
Name: ${chat.name}
Description: ${chat.description}
Created At: ${chat.createdAt.toString()}
Created By: ${chat.owner.user}
Participant count: ${chat.participants.length}
                `);
            } else {
              msg.reply(
                'This command can only be used in a group!',
              );
            }
          } else if (msg.body.startsWith('!subject ')) {
            // Change the group subject
            let chat = await msg.getChat();
            if (chat.isGroup) {
              let newSubject = msg.body.slice(9);
              chat.setSubject(newSubject);
            } else {
              msg.reply(
                'This command can only be used in a group!',
              );
            }
          } else if (msg.body.startsWith('!description ')) {
            // Change the group description
            let chat = await msg.getChat();
            if (chat.isGroup) {
              let newDescription = msg.body.slice(6);
              chat.setDescription(newDescription);
            } else {
              msg.reply(
                'This command can only be used in a group!',
              );
            }
          }

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
    });

    //
    // GROUP EVENTS..
    //

    strapi.whatsapp.client.on(
      'group_join',
      async notification => {
        // User has joined or been added to the group.
        let propagate = true;
        try {
          propagate = await handler.onUserJoined(
            notification,
          );
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onUserJoined event: ${notification}`,
            );
            notification.reply('User joined.');
          }
        }
      },
    );

    strapi.whatsapp.client.on(
      'group_leave',
      async notification => {
        // User has left or been kicked from the group.
        let propagate = true;
        try {
          propagate = await handler.onUserLeft(
            notification,
          );
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onUserLeft event: ${notification}`,
            );
            notification.reply('User left.');
          }
        }
      },
    );

    strapi.whatsapp.client.on(
      'group_update',
      async notification => {
        // Group picture, subject or description has been updated.
        let propagate = true;
        try {
          propagate = await handler.onGroupUpdate(
            notification,
          );
        } catch (err) {
        } finally {
          if (propagate) {
            console.log(
              `[DEFAULT] onGroupUpdate event: ${notification}`,
            );
            notification.reply('Group updated.');
          }
        }
      },
    );

    return strapi.whatsapp.client.initialize();
  },
  deinit: async () => {
    console.log('WhatsApp Web library --deinit');
  },
  sendMessage: async (msisdn, content, options = {}) => {
    if (!msisdn) return;

    let number = phoneUtil.parseAndKeepRawInput(
      msisdn,
      'ID',
    );
    if (!phoneUtil.isValidNumber(number)) {
      console.warn(`MSISDN ${number} is not Indonesian!`);
    }
    number = phoneUtil.format(number, PNF.E164);
    number = (number + '@c.us').substring(1);

    console.log(
      `WhatsApp Web library --send Sending message to ${number}..`,
    );
    // console.log('Media:', media);
    await strapi.whatsapp.client.sendMessage(
      number,
      content,
      options,
    );
    console.log(`--> Sent!`);

    return 'ok';
  },
});
