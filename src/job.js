/* eslint-disable no-await-in-loop */
/**
 * Module dependencies
 */
const _ = require('lodash');
const moment = require('moment');
const grpc = require('grpc');

/**
 * Utilities
 */
const PubSub = require('../utils/pubsub');
const Logger = require('../utils/logger');

/**
 * Configurations
 */

const cachedPubsubClient = {};
const cachedTopic = {};

class Job {
  constructor({ name, data = {} }, config = {}) {
    this.name = name;
    this.data = data;
    this.config = config;

    const { credentials, projectId, topicSuffix } = config;
    if (!credentials) {
      throw new Error('`credentials` is required for setting up the Google Cloud Pub/Sub');
    }

    if (!cachedPubsubClient[projectId]) {
      cachedPubsubClient[projectId] = new PubSub({ credentials, projectId, grpc });
    }

    this.topicName = `${this.name}-${topicSuffix}`;
    this.pubsub = cachedPubsubClient[projectId];

    this.logger = new Logger({ debug: config.debug });
  }

  async save() {
    const dataBuffer = Buffer.from(
      JSON.stringify({
        ...this.data,
        topicName: this.topicName,
        createdAt: moment().utc(),
      }),
    );

    if (!cachedTopic[`${this.topicName}`]) {
      cachedTopic[`${this.topicName}`] = await this.pubsub.createOrGetTopic(this.topicName);
    }

    this.topic = cachedTopic[`${this.topicName}`];
    return this.topic.publishMessage({
      data: dataBuffer,
    });
  }
}

module.exports = Job;
