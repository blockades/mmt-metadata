(function() {
	var Https, Http, URL, _, File_System, Async;
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		Https = require('https');
		Http = require('http');
		URL = require('url');
		_ = require('underscore');
		File_System = require('fs');
		Async = require('async');
	}

	var SBot = function() {};

	SBot.prototype.create_object = function(uri, options_override, callback) {
		var options = _.extend({
			method: 'POST'
		}, options_override);
		this.fetch_object(uri, options, callback);
	};

	SBot.prototype.update_object = function(uri, options_override, callback) {
		var options = _.extend({
			method: 'PUT'
		}, options_override);
		this.fetch_object(uri, options, callback);
	};

	SBot.prototype.fetch_object = function(uri, options_override, callback) {
		var parsed = URL.parse(uri);
		var options = {
			hostname: parsed.hostname,
			protocol: parsed.protocol,
			path: parsed.path,
			method: 'GET',
		};
		if (parsed.port) {
			options.port = parsed.port;
		}
		_.extend(options, options_override);
		var data = '';
		this.fetch(
			options,
			function(chunk) {
				data += chunk;
			},
			function(error, response) {
				if (error) {
					error.response_data = data;
					return callback(error, null, response);
				}
				var obj;
				if (!data) {
					return callback(null, null, response);
				}
				try {
					obj = JSON.parse(data);
				}
				catch(error) {
					return callback(error, null, response);
				}
				if (obj) {
					return callback(null, obj, response);
				}
			}
		);
	};

	SBot.prototype.fetch_text = function(uri, options_override, callback) {
		var parsed = URL.parse(uri);
		var options = {
			hostname: parsed.hostname,
			protocol: parsed.protocol,
			path: parsed.path,
			method: 'GET'
		};
		if (parsed.port) {
			options.port = parsed.port;
		}
		_.extend(options, options_override);
		var data = '';
		this.fetch(
			options,
			function(chunk) {
				data += chunk;
			},
			function(error, response) {
				if (error) {
					return callback(error);
				}
				return callback(null, data, response);
			}
		);
	};

	SBot.prototype.fetch_file = function(options, callback) {
		var parsed;
		try {
			parsed = URL.parse(options.url);
		} catch(error) {
			return callback(error);
		}
		var file = File_System.createWriteStream(options.tmp_filename, { 'flags': 'a' }),
			req_options = {
				hostname: parsed.hostname,
				protocol: parsed.protocol,
				path: parsed.path,
				method: 'GET',
				pipe_to: file
			};
		if (parsed.port) {
			req_options.port = parsed.port;
		}
		if (options.headers) {
			req_options.headers = options.headers;
		}
		this.fetch(
			req_options,
			null,
			function(error, response) {
				file.end();
				if (error) {
					return callback(error);
				}
				return Async.nextTick(callback);
			}
		);
	};

	SBot.prototype.upload_file = function(options, callback) {
		var parsed = URL.parse(options.url),
			upload_options = options.upload_options,
			read_stream = File_System.createReadStream(options.tmp_filename),
			boundary = Math.random().toString(16),
			request = Https.request({
				hostname: parsed.hostname,
				protocol: parsed.protocol,
				port: parsed.port,
				path: parsed.path,
				method: 'POST',
				headers: { 
					cookie: upload_options.headers.cookie,
					'Content-Type': 'multipart/form-data; boundary="' + boundary + '"'
				}
			}, 
			function(response) {
				var data = '';
				response.on('data', function(chunk) {
					data += chunk;
				});
				response.on('error', callback);
				response.on('end', function() {
					return callback(null, data);
				});
			});
		if (options.form) {
			request.write(Object.keys(options.form).map(function(key) {
				return '--' + boundary + '\r\n' +
					'Content-Disposition: form-data; name="' + key + '"\r\n\r\n' +
					options.form[key] + '\r\n';
			}).join());
		}
		request.write(
			'--' + boundary + '\r\n' + 
			'Content-Type: ' + options.content_type + '\r\n' + 
			'Content-Disposition: form-data; name="upload_filenames[0]"; ' +
			'filename="' + options.orig_filename + '"\r\n' + 
			'Content-Transfer-Encoding: binary\r\n\r\n'
		);
		read_stream.on('open', function() {
			read_stream.on('end', function() {
				request.end('\r\n--' + boundary + '--');
			}).pipe(request, { end: false });
		});
	};

	SBot.prototype.fetch = function(options, chunk_handler, callback) {
		var body;
		var has_called_back = false;
		if (options.body) {
			body = options.body;
			delete options.body;
		}
		options.headers = options.headers || {};
		options.headers.Connection = 'Close';
		options.status_ok = options.status_ok || {};
		try {
			var protocol = options.protocol === 'https:' ? Https : Http;
			if (options.headers && 'cookie' in options.headers && !options.headers.cookie) {
				delete options.headers.cookie;
			}
			var req = protocol.request(options, function(response) {
				if (options.pipe_to) {
					if (options.full_headers && options.pipe_to.header && response.headers) {
						Object.keys(response.headers).map(function(key) {
							if (options.headers_override && options.headers_override[key]) { return; }
							options.pipe_to.header(key, response.headers[key]);
						});
					}
					if (options.pipe_to.header && response.headers && response.headers['content-type']) {
						options.pipe_to.header('Content-Type', response.headers['content-type']);
					}
					if (options.headers_override) {
						Object.keys(options.headers_override).map(function(key) {
							options.pipe_to.header(key, options.headers_override[key]);
						});
					}
					response.pipe(options.pipe_to);
				}
				else if (chunk_handler) {
					response.on('data', chunk_handler);
				}
				response.on('end', function() {
					if (has_called_back) { return; }
					has_called_back = true;
					if (response.statusCode >= 400 && !options.status_ok[response.statusCode]) {
						return callback("Request returned bad status:" + response.statusCode, response);
					}
					return callback(null, response);
				});
			});
			req.on('error', function(error) {
				if (has_called_back) { return; }
				has_called_back = true;
				return callback(error);
			});
			req.on('socket', function(socket) {
				socket.setTimeout(options.timeout || 10000);
				socket.on('timeout', function() {
					req.abort();
				});
			});
			if (body) {
				req.write(body);
			}
			req.end();
		} catch(error) {
			if (has_called_back) { return; }
			has_called_back = true;
			return callback(error);
		}
	};

	SBot.prototype.delete_object = function(uri, options, callback) {
		var parsed = URL.parse(uri);
		options = _.defaults(options || {}, {
			hostname: parsed.hostname,
			protocol: parsed.protocol,
			path: parsed.path,
			method: 'DELETE'
		});

		if (parsed.port) {
			options.port = parsed.port;
		}

		var protocol = options.protocol === 'https:' ? Https : Http;
		var req = protocol.request(options, function(response) {
			callback(null, (response.statusCode >= 200 && response.statusCode < 300));
		});
		req.on('error', callback);
		req.end();
	};

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = SBot;
	}
	else {
		window.SBot = SBot;
	}
})();
