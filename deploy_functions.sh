STAGING_BUCKET_NAME=tuneminder-staging
IMAGE_BUCKET_NAME=tuneminder-images
GETSONGINFO_TOPIC_NAME=tuneminder-getsonginfo-topic
SENDSMS_TOPIC_NAME=tuneminder-sendsms-topic
RESULT_TOPIC_NAME=tuneminder-result-topic

gcloud beta functions deploy ocr-extract --stage-bucket $STAGING_BUCKET_NAME --trigger-bucket $IMAGE_BUCKET_NAME --entry-point processImage
gcloud beta functions deploy get-song-info --stage-bucket $STAGING_BUCKET_NAME --trigger-topic $GETSONGINFO_TOPIC_NAME --entry-point getSongUrl
gcloud beta functions deploy send-sms --stage-bucket $STAGING_BUCKET_NAME --trigger-topic $SENDSMS_TOPIC_NAME --entry-point sendSmsMessage
gcloud beta functions deploy ocr-save --stage-bucket $STAGING_BUCKET_NAME --trigger-topic $RESULT_TOPIC_NAME --entry-point saveResult