var url = require('url');
var request = require('request');
var Q = require('q');
var xml2js = require('xml2js');

var uri = require('./uri');
var auth = require('./auth');
var PlexAPI = require('./api.js');

var MYPLEX_SERVER_URL = "https://plex.tv/pms/servers.xml";

function MyPlex(username, password) {
    this.username = username;
    this.password = password;

    this.loginPromise = this.login();
}


MyPlex.prototype.login = function login() {
    var deferred = Q.defer();

    var self = this;

    auth.retrieveAuthToken(this.username, this.password).then(function (token) {
        self.authToken = token;
        deferred.resolve();
    }).catch(function (err) {
        deferred.reject(err);
    });

    return deferred.promise;

};

MyPlex.prototype.listServers = function listServers() {

    var deferred = Q.defer();

    var self = this;

    this.loginPromise.then(function() {
        var options = {
            url: MYPLEX_SERVER_URL,
            json: true,
            headers: {
                'Accept': 'application/json',
                'X-Plex-Token': self.authToken
            }
        };

        request(options, function onResponse(err, response, body) {
            if (err) {
                return deferred.reject(err);
            }
            if (response.statusCode !== 200) {
                return deferred.reject(new Error('Plex Server didnt respond with status code 200, response code: ' + response.statusCode));
            }

            xml2js.parseString(body, function(err, result) {

                if (err) {
                    return deferred.reject(err);
                }
                if (result.MediaContainer && result.MediaContainer.Server) {
                    var result_list = [];
                    for (var key in result.MediaContainer.Server) {
                        if (result.MediaContainer.Server.hasOwnProperty(key)) {
                            result_list.push(result.MediaContainer.Server[key].$);
                        }
                    }

                    return deferred.resolve(result_list);
                } else {
                    return deffered.reject(new Error("Could not parse Plex.tv XML"));
                }

            });

        });
    });

    return deferred.promise;
};

MyPlex.prototype.connectTo = function connectTo(serverName) {
    var self = this;
    var deferred = Q.defer();

    this.listServers().then(function (servers) {
        servers.forEach(function (s) {
            if (serverName === s.name) {
                return deferred.resolve(new PlexAPI({
                    'hostname': s.host,
                    'port': s.port,
                    'username': self.username,
                    'authToken': self.authToken
                }));
            }
        });

        return deferred.reject(new Error("Specified server not found."));
    });

    return deferred.promise;
};

module.exports = MyPlex;
