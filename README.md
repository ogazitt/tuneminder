# TuneMinder 

## Description 

Server-side functionality for taking a photo of a music track (e.g. from a car radio's display)
and converting it into a Spotify URL that can be opened in the Spotify app.

This project is meant to be used in conjunction with a minimal mobile (e.g. iOS) app for taking and 
uploading photos into a Google Cloud Storage bucket.

## Architecture

The project is implemented using a "serverless" architecture, with Google Functions providing the
following pipeline:
- an image is dropped into a Google Cloud Storage bucket, triggering an OCR using the Google Vision API.  
Some heuristics are applied on the extracted text to guess at an artist and track name.  The original image 
name is assumed to be in the following format: {phonenumber.filename} (e.g. 14255551212.img2048.jpg).
- a pubsub topic is signaled which passes the artist and track name into the Spotify Search API.  A URL of 
the form "https://open.spotify.com/track/..." is passed into the next stage.
- a pubsub topic is signaled which passes the track URL into a Twilio API call to send an SMS with the 
URL to the caller.  The SMS is sent to the phone number extracted from the original image filename.
- a pubsub topic is signaled which instructs the final Google Function to drop the extracted song info 
as a file into a cloud storage bucket.  This is helpful for viewing the result of successful workflows.

Based on the Google OCR example source: https://cloud.google.com/functions/docs/tutorials/ocr

## Dependencies

In addition to what's in this repo, this project requires two files at the top-level that 
contain secrets: twilioConfig.json and spotifyConfig.json:

twilioConfig.json:
```
{
  "TWILIO_ACCOUNT_SID": "...",
  "TWILIO_AUTH_TOKEN": "..."
}
```

spotifyConfig.json:
```
{
  "SPOTIFY_CLIENT_ID": "...",
  "SPOTIFY_CLIENT_SECRET": "..."
}
```

## Deployment

Install the Google Cloud Platform SDK.

```
gsutil mb gs://trueminder-staging  # create the staging bucket
gsutil mb gs://trueminder-images   # create the bucket for uploading images
gsutil mb gs://trueminder-text     # create the bucket for the final text files
./deploy_functions.sh              # deploy the Google Functions 
```

## Testing

```
gsutil cp ./test.jpg gs://tuneminder-images/14255551212.test.jpg   # will trigger the workflow
gcloud beta functions logs read |tail -50                          # will tail the google functions log
```
