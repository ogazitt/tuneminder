# TuneMinder 

Google Functions that get triggered when an image gets uploaded to a bucket, 
and run OCR on the text in the image to extract text

Original source: https://cloud.google.com/functions/docs/tutorials/ocr

Requires two files that contain secrets: twilioConfig.json and spotifyConfig.json:

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
