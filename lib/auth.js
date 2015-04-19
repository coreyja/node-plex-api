var os = require('os');
var uuid = require('uuid');
var request = require('request');
var Q = require('q');

var platform = os.platform();
var release = os.release();

function authHeaderVal(username, password) {
    var authString = username + ':' + password;
    var buffer = new Buffer(authString.toString(), 'binary');
    return 'Basic ' + buffer.toString('base64');
}

function requestSignIn(username, password) {
    var deferred = Q.defer();
    var identifier = uuid.v4();
    var options = {
        url: 'https://plex.tv/users/sign_in.json',
        json: true,
        headers: {
            'Authorization': authHeaderVal(username, password),
            'X-Plex-Client-Identifier': identifier,
            'X-Plex-Product': 'App',
            'X-Plex-Version': '1.0',
            'X-Plex-Device': 'App',
            'X-Plex-Platform': platform,
            'X-Plex-Platform-Version': release,
            'X-Plex-Provides': 'controller'
        }
    };

    request.post(options, function(err, res, jsonBody) {
        if (err) {
            return deferred.reject(new Error('Error while requesting https://plex.tv for authentication: ' + String(err)));
        }
        if (res.statusCode == 401) {
            return deferred.reject(new Error('Authentication Failed. Plex.tv username and/or password is incorrect.'));
        }
        if (res.statusCode !== 201) {
            return deferred.reject(new Error('Invalid status code in authentication response from Plex.tv, expected 201 but got ' + res.statusCode));
        }
        deferred.resolve(jsonBody);
    });

    return deferred.promise;
}

function extractAuthToken(jsonBody) {

    if (jsonBody.user && jsonBody.user.authentication_token) {
        return jsonBody.user.authentication_token;
    } else {
        throw new Error('Couldnt not find authentication token in response from Plex.tv :(');
    }

}

exports.retrieveAuthToken = function retrieveAuthToken(username, password) {
    return requestSignIn(username, password).then(extractAuthToken);
};
