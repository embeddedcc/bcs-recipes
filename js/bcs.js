/**
 *	@project bcslib
 *	@author Brent Rahn <brent.rahn@gmail.com>
 */

/*jshint -W065 */
/*global Q */
/** 
 * @namespace
 */
var BCS = {
	version: '0.1.4'
};

BCS.Helpers = (function () {
	/** 
	 * Creates a `BCS.Helpers` Object
	 *
	 * Helper methods for accessing common values from the BCS.
	 * Added to BCS.Device by it's constructor
	 * @constructs BCS.Helpers
	 * @param {BCS.Device} device
	 */
	var Helpers = function (device) {
		this.device = device;
	};
	
	/**
	 * Get Temperature Probe objects
	 * @returns {Promise.Object[]} Promise of a list of temperature probes
	 */	
	Helpers.prototype.getProbes = function () {
		var promises = [];
		for(var i = 0; i < this.device.probeCount; i++) {
			promises.push(this.device.read('temp/' + i));
		}
		return Q.all(promises);
	};
	
	/**
	 * Get current temperature values
	 * @returns {Promise.number[]} Promise of a list of temperatures
	 */	
	Helpers.prototype.getTempValues = function () {
		return this.device.read('temp').then(function (response) {
			return Q.all(response.map(function (temp) { return temp / 10.0; }));
		});
	};
	
	/**
	 * Get Discrete Input objects
	 * @returns {Promise.Object[]} Promise of a list of discrete inputs
	 */	
	Helpers.prototype.getDins = function () {
		var promises = [];
		for(var i = 0; i < this.device.inputCount; i++) {
			promises.push(this.device.read('din/' + i));
		}
		return Q.all(promises);
	};

	/**
	 * Get current input values
	 * @returns {Promise.number[]} Promise of a list of on/off values for Dins
	 */	
	Helpers.prototype.getDinValues = function () {
		return this.device.read('din');
	};

	/**
	 * Get Outputs objects
	 * @returns {Promise.Object[]} Promise of a list of outputs
	 */	
	Helpers.prototype.getOutputs = function () {
		var promises = [];
		for(var i = 0; i < this.device.outputCount; i++) {
			promises.push(this.device.read('output/' + i));
		}
		return Q.all(promises);		
	};
	
	/**
	 * Get current output values
	 * @returns {Promise.number[]} Promise of a list of on/off values for outputs
	 */	
	Helpers.prototype.getOutputValues = function () {
		return this.device.read('output');
	};
	
	/**
	 * Get current timer values
	 * @param {Number} Process number
	 * @returns {Promise.Array.<BCS.Time>} Promise of a list of `BCS.Time` objects
	 */	
	Helpers.prototype.getTimerValues = function (process) {
		return this.device.read('process/' + process + '/timer')
			.then(function (response) { 
				return Q.all(response.map(function (timer) { return new BCS.Time(timer.value); }));
			});
	};

	/**
	 * Get current timer values as strings
	 * @param {Number} Process number
	 * @returns {Promise.string[]} Promise of a list of times as strings
	 */	
	Helpers.prototype.getTimerStrings = function (process) {
		return this.getTimerValues(process)
			.then(function (timers) { 
				return Q.all(timers.map(function (timer) { return timer.toString(); }));
			});
	};
	
	/**
	 * Get running processes
	 * @returns {Promise.Object[]} Promise of a list of running processes with some runtime data
	 */	
	Helpers.prototype.getRunningProcesses = function () {
		return this.device.read('poll')
		.then(function (poll) {
			return Q.all(poll.process.map(function (p, i) {
					p.id = i;
					return p;
				})
				.filter(function (p) {return p.running;}));
		});
	};
	
	/**
	 * Get Processes objects
	 * @returns {Promise.Object[]} Promise of a list of processes
	 */	
	Helpers.prototype.getProcesses = function () {
		var promises = [];
		for(var i = 0; i < 8; i++) {
			promises.push(this.device.read('process/' + i));
		}
		return Q.all(promises);		
	};
	
		
	return Helpers;
}());

BCS.Device = (function () {
	/** 
	 * Handles communication with BCS.
	 * @constructs BCS.Device
	 * @param {string} address IP Address for BCS
	 * @param {options} options for BCS.  Currently only supports authentication. ex. `{auth: {username: 'x', password: 'y'}}`
	 * @property ready {boolean} Ready to communicate with BCS (other properties are not valid until ready is true)
	 * @property type {string} BCS type, eg `BCS-460`
	 * @property version {string} BCS firmware version, eg, `4.0.0`
	 * @property helpers {BCS.Helpers} Helpers object
	 * @property probeCount {number} The number of temp probes supported by the BCS hardware
	 * @property inputCount {number} The number of discrete inputs supported by the BCS hardware
	 * @property outputCount {number} The number of outputs supported by the BCS hardware
	 */
	var Device = function (address, options) {
		var obj = this;
		var parsedAuth;
		this.address = address;
		this.ready = false;
		this.type = null;
		this.version = null;
		this.helpers = new BCS.Helpers(this);
		this.url = (this.address.match(/^http/) ? '' : 'http://') + this.address + (this.address.match(/\/$/) ? '' : '/') + 'api/';
		this._callbacks = {};
		this.options = options || {};

		/* parse auth credentials from URL if present and auth is not set in options */
		if(!this.options.auth && this.url.match(/http:\/\/(.+):(.+)@/))
		{
			parsedAuth = this.url.match(/http:\/\/(.+):(.+)@/).slice(1);
			this.options.auth = {
				username: parsedAuth[0],
				password: parsedAuth[1]
			};
			this.url = this.url.replace(/(http:\/\/)(.+:.+@)/, '$1');
		}

		if(this.options.auth) {
		  this.request = request.defaults({auth: this.options.auth});
		} else {
		  this.request = request;
		}
		
		this.read('device')
			.then(function (body) {
				obj.ready = true;
				obj.version = body.version;
				obj.type = body.type;
				obj.trigger('ready');
			})
			.catch(function (error) {
				obj.trigger('notReady', [error]);
			});
		
		return this;
	};
	
	Device.prototype = {
		get probeCount() { return !this.ready ? null : (this.type === 'BCS-460' ? 4 : 8); },
		get inputCount() { return !this.ready ? null : (this.type === 'BCS-460' ? 4 : 8); },
		get outputCount() { return !this.ready ? null : (this.type === 'BCS-460' ? 6 : 18); }
	};
	
	/**
	 * Add an event listener
	 * @param {String} event The event to respond to.  ('ready', 'notReady')
	 * @param {callback} callback The function to be called when the event is triggered
	 */
	Device.prototype.on = function (event, callback) {
		if(this._callbacks[event] === undefined) {
			this._callbacks[event] = [callback];
		} else {
			this._callbacks[event].push(callback);
		}
		
		return this;
	};
	
	/**
	 * Trigger an event listener
	 * @private
	 * @param {String} event The event to trigger
	 * @param {Object} arg Argument to pass to the callback
	 */
	Device.prototype.trigger = function (event, arg) {
		var obj = this;
		if(this._callbacks[event] !== undefined) {
			this._callbacks[event].forEach(function (callback) {
				callback.apply(obj, arg);
			});
		}
	};
	
	/** 
	 * Read from the BCS API
	 * @example
	 *    var bcs = BCS.Device("192.168.0.63");
	 *    bcs.read('device').then(function (response) {
	 *        alert("BCS Name:" + response.name);
	 *    });
	 * @param {String} resource The API endpoint to query
	 * @returns {Promise.Object} A Promise of the response from the API
	 */
	Device.prototype.read = function (resource) {
		var deferred = Q.defer();		
		this.request({
				url: this.url + resource,
				json: true
			}, 
			function (e, _, body) {
				if(e) {
					deferred.reject(e);
					return;
				}
			
				deferred.resolve(body);
			});
			
			return deferred.promise;
	};
	
	/**
	 * Write to the BCS API
	 * @param {String} resource The API endpoint to update
	 * @param {Object} JSON object to POST to the API
	 * @returns {Promise.Object} A Promise of the response from the API
	 */
	Device.prototype.write = function (resource, data) {
		var deferred = Q.defer();
		this.request({
				url: this.url + resource,
				json: data,
				method: 'POST'
			}, function (e, xhr, body) {
				if(e && xhr.statusCode !== 202) {
					deferred.reject(e);
					return;
				}
			
				deferred.resolve(body);
		});
		
		return deferred.promise;
	};
	
	return Device;
}());

BCS.Time = (function () {
	/** 
	 * Makes it easier to work with time values from the BCS
	 * @constructs BCS.Time
	 * @param {Number} time Time in tenths of a second
	 */	
	var Time = function (time) {
		this.value = time / 10 || 0;
		return this;
	};

	var formatNumber = function (n) {
		if(n < 10) {
			return '0' + n;
		}

		return "" + n;
	};

	/**
	 * Return the string representation of the BCS.Time object
	 * @returns {String} The string representation of the Time
	 */
	Time.prototype.toString = function () {
		var hours = Math.floor(this.value / 3600);
		var minutes = Math.floor((this.value % 3600) / 60);
		var seconds = Math.floor(this.value % 60);
		return hours + ":" + formatNumber(minutes) + ":" + formatNumber(seconds);
	};

	/**
	 * Convert a string into a BCS.Time object 
	 * @example
	 *    var timeobj = BCS.Time(1000);
	 *    BCS.Time.fromString(timeobj.toString()) == timeobj;
	 *
	 * @param {String} s The string to convert to BCS.Time in hh:mm:ss format
	 * @returns {BCS.Time} A BCS.Time object
	 */
	Time.fromString = function (s) {
		var parts = s.split(':').reverse();
		var value = 0;

		for(var i = 0; i < parts.length; i++) {
			// Don't process more than 3 :'s
			if(i > 2) { return new Time(value); }

			value += parseInt(parts[i]) * Math.pow(60, i);	
		}

		return new Time(value * 10);
	};

	return Time;
}());

