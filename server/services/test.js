'use strict';

module.exports = ({ strapi }) => ({
  doSomething(message) {
    strapi.log.info(message);
  },
});
