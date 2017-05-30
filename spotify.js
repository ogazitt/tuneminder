const config = require('./spotifyConfig.json');

var accessToken = null;
//accessToken = config.SPOTIFY_ACCESS_TOKEN;

const rp = require('request-promise');
var retries = 1;

function authorize() {
  return Promise.resolve()
  .then(() => {
    var base64creds = new Buffer(`${config.SPOTIFY_CLIENT_ID}:${config.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    var options = {
        method: 'POST',
        uri: `https://accounts.spotify.com/api/token`,
        headers: {
          'User-Agent': 'Request-Promise',
          'Authorization': `Basic ${base64creds}`
        },
        form: {
          'grant_type': 'client_credentials'
        },
        json: true // Automatically parses the JSON string in the response 
    };
  
    return rp(options);
  })
  .then(function (data) {
    console.log('The access token expires in ' + data.expires_in);
    console.log('The access token is ' + data.access_token);

    // Save the access token so that it's used in future calls
    accessToken = data.access_token;
  }, function(err) {
     console.log('Something went wrong when retrieving an access token', err);
  });
}

exports.getSongInfo = function getSongInfo(songInfo) {

  return Promise.resolve()
  .then(() => { 
    if (accessToken === null) {
      return authorize();
    }
  })
  .then(() => {
    var options = {
        uri: `https://api.spotify.com/v1/search?query=${songInfo.band}%20${songInfo.song}&type=artist,track`,
        headers: {
          'User-Agent': 'Request-Promise',
          'Authorization': `Bearer ${accessToken}`
        },
        json: true // Automatically parses the JSON string in the response 
    };
  
    return rp(options);
  })
  .then(function (json) {
    url = `https://open.spotify.com/track/${json.tracks.items[0].id}`;
      console.log('Track URL', url);
      return url;
  })
  .catch(function (err) {
      console.log(`Error detected: ${err}`);
      // if the error is unauthorized access then try again
      if (err.statusCode == 401 && retries > 0) {
        // try again with a fresh access token
        console.log('Retrying with a fresh auth token');
        accessToken = null;
        retries--;
        return getSongInfo(songInfo);
      }
      console.log('No more retries');
      return '';
      // API call failed... 
  });
}
