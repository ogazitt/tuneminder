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

// [START functions_ocr_setup]
const config = require('./config.json');

// Get a reference to the Cloud Storage component
const storage = require('@google-cloud/storage')();
// Get a reference to the Cloud Vision API component
const vision = require('@google-cloud/vision')();

const Buffer = require('safe-buffer').Buffer;
// [END functions_ocr_setup]

// [START functions_ocr_detect]
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
      return(saveResult(file.name, text));
    });
}
// [END functions_ocr_detect]

// [START functions_ocr_rename]
/**
 * Appends a .txt suffix to the image name.
 *
 * @param {string} filename Name of a file.
 * @returns {string} The new filename.
 */
function renameImageForSave (filename) {
  return `${filename}.txt`;
}
// [END functions_ocr_rename]

// [START functions_ocr_save]
/**
 * Saves the data packet to a file in GCS. 
 *
 * @param {string} fname The original filename.
 * @param {string} text The extracted text.
 */
function saveResult (fname, text) {
  return Promise.resolve()
    .then(() => {
      console.log(`Received request to save file ${fname}`);

      const bucketName = config.RESULT_BUCKET;
      const filename = renameImageForSave(fname);
      const file = storage.bucket(bucketName).file(filename);

      console.log(`Saving result to ${filename} in bucket ${bucketName}`);

      return file.save(text);
    })
    .then(() => {
      console.log(`File saved.`);
    });
};
// [END functions_ocr_save]


// [START functions_ocr_process]
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
// [END functions_ocr_process]
