STAGING_BUCKET_NAME=tuneminder-staging
IMAGE_BUCKET_NAME=tuneminder-images

gcloud beta functions deploy ocr-extract --stage-bucket $STAGING_BUCKET_NAME --trigger-bucket $IMAGE_BUCKET_NAME --entry-point processImage
