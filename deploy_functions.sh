YOUR_STAGING_BUCKET_NAME=tuneminder-staging
YOUR_IMAGE_BUCKET_NAME=tuneminder-images
YOUR_TRANSLATE_TOPIC_NAME=tuneminder-translate-topic
YOUR_RESULT_TOPIC_NAME=tuneminder-result-topic

gcloud beta functions deploy ocr-extract --stage-bucket $YOUR_STAGING_BUCKET_NAME --trigger-bucket $YOUR_IMAGE_BUCKET_NAME --entry-point processImage
gcloud beta functions deploy ocr-translate --stage-bucket $YOUR_STAGING_BUCKET_NAME --trigger-topic $YOUR_TRANSLATE_TOPIC_NAME --entry-point translateText
gcloud beta functions deploy ocr-save --stage-bucket $YOUR_STAGING_BUCKET_NAME --trigger-topic $YOUR_RESULT_TOPIC_NAME --entry-point saveResult
