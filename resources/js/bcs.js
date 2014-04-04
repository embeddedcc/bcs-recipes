/*jshint -W065 */
var bcslib = {};

bcslib.Time = (function () {
	var Time = function (time) {
		this.value = time || 0;
		return this;
	};

	var formatNumber = function (n) {
		if(n < 10) {
			return '0' + n;
		}

		return "" + n;
	};

	Time.prototype.toString = function () {
		var hours = Math.floor(this.value / 3600);
		var minutes = Math.floor((this.value % 3600) / 60);
		var seconds = Math.floor(this.value % 60);
		return hours + ":" + formatNumber(minutes) + ":" + formatNumber(seconds);
	};

	Time.prototype.fromString = function (s) {
		var parts = s.split(':').reverse();
		this.value = 0;

		for(var i = 0; i < parts.length; i++) {
			// Don't process more than 3 :'s
			if(i > 2) { return this; }

			this.value += parseInt(parts[i]) * Math.pow(60, i);	
		}

		return this;
	};


	return Time;
}());