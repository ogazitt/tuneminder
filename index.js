/**
 * Copyright 2016, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const config = require('./config.json');

// Get a reference to the Pub/Sub component
const pubsub = require('@google-cloud/pubsub')();
// Get a reference to the Cloud Storage component
const storage = require('@google-cloud/storage')();
// Get a reference to the Cloud Vision API component
const vision = require('@google-cloud/vision')();

// Get a reference to the spotify helper functions
const spotify = require('./spotify');

// Get a referenced to the twilio client library
const twilio = require('twilio');
const twilioConfig = require('./twilioConfig.json');

const Buffer = require('safe-buffer').Buffer;

/**
 * Publishes the result to the given pubsub topic and returns a Promise.
 *
 * @param {string} topicName Name of the topic on which to publish.
 * @param {object} data The message data to publish.
 */
function publishResult (topicName, data) {
  return pubsub.topic(topicName).get({ autoCreate: true })
    .then(([topic]) => topic.publish(data))
    .then(() => { return(data); });
}

/**
 * Detects the text in an image using the Google Vision API.
 *
 * @param {string} text Detected text.
 * @returns {object} Song information as a map { band: string, song: string }.
 */
function extractSongInfo (text) {
  // convert to a word array if necessary
  let textArray = text.split("\n");

  let result = [];
  for (var i = 0; i < textArray.length; i++) {
    let word = textArray[i];

    const regexList = [/^[0-9]/, /^FM/, /^Presets/];
    const isMatch = regexList.some(rx => rx.test(word));

    // eliminate garbage
    if (!isMatch) {
      result.push(word);
    }
  }
  
  if (result.length === 0) {
    return {};
  }

  let band = result[0].replace(/\([A-Za-z]*\)/,'').trim();
  let song = result[1].trim();
  console.log(`Extracted: Band: ${band}; Song: ${song}`);
  var songInfo = {
    band: band,
    song: song
  };
  return songInfo;
}

/**
 * Detects the text in an image using the Google Vision API.
 *
 * @param {object} file Cloud Storage File instance.
 * @returns {Promise}
 */
function detectText (file) {
  let text;

  console.log(`Looking for text in image ${file.name}`);
  return vision.detectText(file)
    .then(([_text]) => {
      if (Array.isArray(_text)) {
        text = _text[0];
      } else {
        text = _text;
      }
      console.log(`Extracted text from image: ${text}; (${text.length} chars)`);

      // extract the song information from the text, into the map { band: name, song: name }
      var songInfo = extractSongInfo(text);
      // save the file name, which encodes the phone number to text back to
      songInfo.filename = file.name;

      return publishResult(config.GETSONGINFO_TOPIC, songInfo);

      // return(saveResult(file.name, text));
    })
    .then((data) => {
      return saveData(config.SONGINFO_BUCKET, renameImageForSave(data.filename), data);
    });
}

/**
 * Appends a .txt suffix to the image name.
 *
 * @param {string} filename Name of a file.
 * @returns {string} The new filename.
 */
function renameImageForSave (filename) {
  return `${filename}.txt`;
}

/**
 * Cloud Function triggered by Cloud Storage when a file is uploaded.
 *
 * @param {object} event The Cloud Functions event.
 * @param {object} event.data A Google Cloud Storage File object.
 */
exports.processImage = function processImage (event) {
  let file = event.data;

  return Promise.resolve()
    .then(() => {
      if (file.resourceState === 'not_exists') {
        // This was a deletion event, we don't want to process this
        return;
      }

      if (!file.bucket) {
        throw new Error('Bucket not provided. Make sure you have a "bucket" property in your request');
      }
      if (!file.name) {
        throw new Error('Filename not provided. Make sure you have a "name" property in your request');
      }

      file = storage.bucket(file.bucket).file(file.name);

      return detectText(file);
    })
    .then(() => {
      console.log(`File ${file.name} processed.`);
    });
};

/**
 * Get song URL from Spotify API. Triggered from a message on
 * a Pub/Sub topic.
 *
 * @param {object} event The Cloud Functions event.
 * @param {object} event.data The Cloud Pub/Sub Message object.
 * @param {string} event.data.data The "data" property of the Cloud Pub/Sub
 * Message. This property will be a base64-encoded string that you must decode.
 */
exports.getSongUrl = function getSongUrl (event) {
  const pubsubMessage = event.data;
  const jsonStr = Buffer.from(pubsubMessage.data, 'base64').toString();
  const payload = JSON.parse(jsonStr);

  return Promise.resolve()
    .then(() => {
      if (!payload.band) {
        throw new Error('Band not provided. Make sure you have a "band" property in your request');
      }
      if (!payload.song) {
        throw new Error('Song not provided. Make sure you have a "song" property in your request');
      }
      if (!payload.filename) {
        throw new Error('Filename not provided. Make sure you have a "filename" property in your request');
      }

      const songInfo = {
        band: payload.band,
        song: payload.song
      };

      console.log(`Getting song info from Spotify - band: ${songInfo.band}, song: ${songInfo.song}`);
      return spotify.getSongInfo(songInfo);
    })
    .then((href) => {
      const messageData = {
        href: href,
        filename: payload.filename
      };
      console.log(`Spotify URL is ${href}`);
      return publishResult(config.SENDSMS_TOPIC, messageData);
    })
    .then((data) => {
      console.log(`Spotify search complete`);
    });
};

/**
 * Send an SMS message. Triggered from a message on
 * a Pub/Sub topic.
 *
 * @param {object} event The Cloud Functions event.
 * @param {object} event.data The Cloud Pub/Sub Message object.
 * @param {string} event.data.data The "data" property of the Cloud Pub/Sub
 * Message. This property will be a base64-encoded string that you must decode.
 */
exports.sendSmsMessage = function sendSmsMessage (event) {
  const pubsubMessage = event.data;
  const jsonStr = Buffer.from(pubsubMessage.data, 'base64').toString();
  const payload = JSON.parse(jsonStr);

  return Promise.resolve()
    .then(() => {
      if (!payload.href) {
        throw new Error('URL not provided. Make sure you have a "href" property in your request');
      }
      if (!payload.filename) {
        throw new Error('Filename not provided. Make sure you have a "filename" property in your request');
      }

      console.log(`Sending SMS to ${payload.filename} containing URL: ${payload.href}`);
      
      var client = new twilio(twilioConfig.TWILIO_ACCOUNT_SID, twilioConfig.TWILIO_AUTH_TOKEN);

      // determine if the filename contains a phone number
      var phoneNumber = null;
      var regex = /^1[1-9][0-9][0-9]/;
      if (regex.test(payload.filename)) {
        phoneNumber = `+${payload.filename.substring(0, 11)}`;
      } else {
        phoneNumber = '+14257650079';  // hardcode my phone number
      }

      console.log(`Texting ${phoneNumber} the message ${payload.href}`);
      return client.messages.create({
          body: `${payload.href}`,
          to: phoneNumber,     // Text this number
          from: '+14252303042' // From a valid Twilio number
      });
    })
    .then((message) => {
      console.log(message.sid);

      // publish the previous payload to save the final file
      const messageData = {
        href: payload.href,
        filename: payload.filename
      };
      return publishResult(config.RESULT_TOPIC, messageData);
    })
    .then(() => {
      console.log(`Sending SMS complete`);
    });
};

/**
 * Saves the data packet to a file in GCS. Triggered from a message on a Pub/Sub
 * topic.
 *
 * @param {object} event The Cloud Functions event.
 * @param {object} event.data The Cloud Pub/Sub Message object.
 * @param {string} event.data.data The "data" property of the Cloud Pub/Sub
 * Message. This property will be a base64-encoded string that you must decode.
 */
exports.saveResult = function saveResult (event) {
  const pubsubMessage = event.data;
  const jsonStr = Buffer.from(pubsubMessage.data, 'base64').toString();
  const payload = JSON.parse(jsonStr);

  return Promise.resolve()
    .then(() => {
      if (!payload.href) {
        throw new Error('URL not provided. Make sure you have a "href" property in your request');
      }
      if (!payload.filename) {
        throw new Error('Filename not provided. Make sure you have a "filename" property in your request');
      }

      console.log(`Received request to save file ${payload.filename}`);

      const bucketName = config.RESULT_BUCKET;
      const filename = renameImageForSave(payload.filename);
      const file = storage.bucket(bucketName).file(filename);

      console.log(`Saving result to ${filename} in bucket ${bucketName}`);

      return file.save(payload.href);
    })
    .then(() => {
      console.log(`File saved.`);
    });
};

/**
 * Saves data to a file in GCS. 
 *
 * @param {string} bucketName Name of bucket to save file into
 * @param {string} filename Name of file to save
 * @param {object} data Data structure to save (in JSON)
 */
function saveData (bucketName, filename, data) {
  return Promise.resolve()
    .then(() => {
      console.log(`Received request to save file ${filename} in bucket ${bucketName}`);

      const file = storage.bucket(bucketName).file(filename);

      console.log(`Saving result to ${filename} in bucket ${bucketName}`);

      return file.save(JSON.stringify(data));
    })
    .then(() => {
      console.log(`File saved.`);
    });
};
