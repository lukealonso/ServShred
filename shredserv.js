sol = { };
sol.node = { };

sol.node.sys = require("sys");
sol.node.fs = require("fs");
sol.node.http = require("http");
sol.node.path = require("path");
sol.node.url = require("url");
sol.node.querystring = require("querystring");
sol.node.buffer = require("buffer");
sol.node.net = require("net");

var _endPoints = { };
var _shreds = { };

function handleSyncShreds(request, response) {
	var payload = "";
	var total = Number(request.headers["content-length"]);
	request.addListener("data", function(chunk) {
		payload = payload + chunk;
	});
	request.addListener("end", function() {
		try
		{
			var data = JSON.parse(payload);
			var requestTime = (new Date()).getTime();
			var lastRequestTime = data.since;
			var shredExcludeMap = { };
			if( data.shreds.length > 0 ) {
				console.log("received " + data.shreds.length + " shreds at time " + requestTime);
			}
			for( var i = 0; i < data.shreds.length; i++ ) {
				var shred = data.shreds[i];
				var serverShred = _shreds[shred.index];
				if( !serverShred || shred.timeStamp > serverShred.timeStamp ) {
					shred.serverTimeStamp = requestTime;
					_shreds[shred.index] = shred;
					shredExcludeMap[shred.index] = true;
				}
			}
			response.writeHead(200, { "content-type" : "text/xml", "connection" : "close" });

			var responseStr = "";
			responseStr += "<shreds>";
			responseStr += '<serverTime value="' + requestTime + '"/>';
			var responseCount = 0;
			for( var k in _shreds ) {
				if( _shreds.hasOwnProperty(k) ) {
					var shred = _shreds[k];
					if( !shredExcludeMap[shred.index] && shred.serverTimeStamp > lastRequestTime ) {
						responseStr += "<shred ";
						responseStr += 'index="' + shred.index + '" ';
						responseStr += 'x="' + shred.x + '" ';
						responseStr += 'y="' + shred.y + '" ';
						responseStr += 'angle="' + shred.angle + '"';
						responseStr += '/>';
						responseCount++;
					}
				}
			}
			responseStr += "</shreds>";
			response.end(responseStr);
			if( responseCount > 0 ) {
				console.log("responded with " + responseCount + " shreds for time " + requestTime);
			}
		}
		catch(e)
		{
			console.log("payload error");
			response.writeHead(500, { "connection" : "close" });
			response.end();
		}
	});
}
_endPoints["SyncShreds"] = handleSyncShreds;

function handleRequest(request, response) {
	var url = sol.node.url.parse(request.url, true);
	var path = url.pathname;
	var pathComponents = path.split("/");
	if( pathComponents.length > 1 ) {
		var endPoint = _endPoints[pathComponents[1]];
		if( endPoint ) {
			endPoint(request, response);
			return;
		}
	}
	response.writeHead(404, { "connection" : "close" });
	response.end();
}

function startup() {
	var httpServer = sol.node.http.createServer(handleRequest);
	httpServer.listen(80, "127.0.0.1");
}

startup();