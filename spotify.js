const SpotifyWebApi = require('spotify-web-api-node');
const config = require('./spotifyConfig.json');

// credentials are optional
const spotifyApi = new SpotifyWebApi({
  clientId: config.SPOTIFY_CLIENT_ID,
  clientSecret: config.SPOTIFY_ACCESS_TOKEN
});

var accessToken = null;
accessToken = config.SPOTIFY_ACCESS_TOKEN;

const rp = require('request-promise');

function authorize() {
  return spotifyApi.clientCredentialsGrant()
  .then(function(data) {
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    accessToken = data.body['access_token'];
    spotifyApi.setAccessToken(accessToken);
  }, function(err) {
        console.log('Something went wrong when retrieving an access token', err);
  });
}

exports.getSongInfo = function getSongInfo(songInfo) {

  return Promise.resolve()
  .then(() => { 
    if (accessToken === null) {
      console.log('Calling authorize() to get a new access token');
      return authorize();
    }
  })
  .then(() => {
    var url = `https://api.spotify.com/v1/search?query=${songInfo.band}%20${songInfo.song}&type=artist,track`; 
    var options = {
        uri: url,
        headers: {
          'User-Agent': 'Request-Promise',
          'Authorization': `Bearer ${accessToken}`
        },
        json: true // Automatically parses the JSON string in the response 
    };
  
    console.log(`Calling spotify API with URL: ${url}`)
    return rp(options);
  })
  .then(function (json) {
    url = json.tracks.items[0].href;
      console.log('Track URL', url);
      return url;
  })
  .catch(function (err) {
      console.log(`Error detected: ${err}`);
      return '';
      // API call failed... 
  });
}

/*
function spotifySearch (songInfo) {
  let query = `/v1/search?query=${songInfo.band}%20${songInfo.song}&type=artist,track`;
  var options = {
    host: 'api.spotify.com',
    port: 443,
    path: query,
    method: 'GET'
  };

  var req = https.request(options, function(res) {
    console.log(res.statusCode);
    res.on('data', function(d) {
      process.stdout.write(d);
      var json = JSON.parse(d);
      track = json.tracks.items[0].href;
      console.log(track);
    });
  });
  req.end();
  req.on('error', function(e) {
    console.error(e);
  });
}
*/
