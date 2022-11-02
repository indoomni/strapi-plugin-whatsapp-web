# 🚀 Getting started with Strapi

Wrapper for pedroslopez's [whatsapp-web.js](https://www.npmjs.com/package/whatsapp-web.js) library to be used with Strapi apps.
<br/><br/>

### `Installation`

Add the library to your Strapi project. [Learn more](https://www.npmjs.com/package/@indoomni/strapi-plugin-whatsapp-web)

```

yarn add @indoomni/strapi-plugin-whatsapp-web
yarn install
yarn build

```

<br/>

### `Configuration`

Add the following configuration attributes to your **server.js**.

```

# config/server.js or config/env/**/server.js
# -------------------------------------------

module.exports = ({ env }) => ({
  host: env('HOST'),
  port: env.int('PORT'),
  app: {
    env: env('ENV'),
    name: env('APP_NAME'),
    keys: env.array('APP_KEYS'),
  },
  // ...
  'whatsapp-web': {
    enabled: true,
    config: {
      clientId: `${env('APP_NAME')}_${env('ENV')}_wa`,
      handler: 'whatsapp-handler.js',
      test: {
        msisdn: '+628999175163',
        message: 'Hello world!',
      },
    },
  },
  // ...
});

```

Notice **config** sub-attribute in the the **'whatsapp-web'** attribute. Don't forget to use the single-quotation marks.

Now, notice the **configFile** attribute. You can add your own handler in the **handler** attribute (we use "src" as the base directory). If you supply a **test** attribute, the library will try to send a message to the said phone number after the client gets authenticated by WhatsApp and becomes ready.
<br/>
In the handler script, you can hook event functions to provide your own processing. If in the hook functions you return false, the event won't get propagated to the default code.

```

# src/whatsapp-handler.js
# -------------------------------------------

module.exports = {
  prepare: async () => {
    console.log('Cutting carrots and chopping onions..');
    return true;
  },

  // Uncomment if you want to consume the 'qr' event.
  // Return true if you want the 'qr' event propagate to the default code.
  // onQr: async qr => {
  //   return true;
  // },

  // Uncomment if you want to consume the 'authenticated' event.
  // Return true if you want the 'authenticated' event propagate to the default code.
  // onAuthenticated: async session => {
  //   return true;
  // },

  // Uncomment if you want to consume the 'ready' event.
  // Return true if you want the 'ready' event propagate to the default code.
  // onReady: async () => {
  //   return true;
  // },

  // Uncomment if you want to consume the 'message' event.
  // Return true if you want the 'message' event propagate to the default code.
  // onMessage: async message => {
  //   strapi.log.info(
  //     `I am sample handler file ${__filename}, edit me..`,
  //   );
  //   strapi.log.info(
  //     `Received message: ${strapi.inspect(message)}`,
  //   );

  //   return false;
  // },
};

```

<br/>

### `How to send messages`

Anywhere in your code, write as in the following snippet. Refer to the **client** controller inside the library, and call **send** function. Supply a client's MSISDN, message, and media if necessary (optional).

```

# src/**/any.js
# ------------------------------

// ...
try {
  await strapi
    .plugin('whatsapp-web')
    .controller('client')
    .send(msisdn, message);
} catch (err) {
  strapi.log.debug('📺: ', err);
}
// ...

```

<br/>

## 📚 Learn more

- [whatsapp-web.js](https://www.npmjs.com/package/whatsapp-web.js) - pedroslopez's excellent whatsapp-web.js library page on npmjs.com.
- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.

<br/>

---

<sub>Feel free to check out my [GitHub repository](https://github.com/indoomni/strapi-plugin-whatsapp-web). Your feedback and contributions are welcome!</sub>
