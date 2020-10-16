const Resource = require('./resource.js');

function UoAlbert(index) {
	this.sensory = {
		map: 0,
		map2: 0,
		signalStrength: 0,
		leftProximity: 0,
		rightProximity: 0,
		accelerationX: 0,
		accelerationY: 0,
		accelerationZ: 0,
		positionX: -1,
		positionY: -1,
		light: 0,
		temperature: 0,
		touch: 0,
		oid: -1,
		pulseCount: 0,
		wheelState: 0,
		soundState: 0,
		batteryState: 2,
		tilt: 0,
		handFound: false
	};
	this.motoring = {
		module: 'uoalbert',
		index: index,
		map: 0xbf800000,
		leftWheel: 0,
		rightWheel: 0,
		leftRed: 0,
		leftGreen: 0,
		leftBlue: 0,
		rightRed: 0,
		rightGreen: 0,
		rightBlue: 0,
		buzzer: 0,
		pulse: 0,
		note: 0,
		sound: 0,
		boardWidth: 0,
		boardHeight: 0,
		motionType: 0,
		motionUnit: 0,
		motionSpeed: 0,
		motionValue: 0,
		motionRadius: 0
	};
	this.blockId = 0;
	this.motionCallback = undefined;
	this.currentSound = 0;
	this.soundRepeat = 1;
	this.soundCallback = undefined;
	this.noteId = 0;
	this.noteTimer1 = undefined;
	this.noteTimer2 = undefined;
	this.clicked = false;
	this.longPressed = false;
	this.longLongPressed = false;
	this.tempo = 60;
	this.timeouts = [];
}

UoAlbert.prototype.reset = function() {
	var motoring = this.motoring;
	motoring.map = 0xbff80001;
	motoring.leftWheel = 0;
	motoring.rightWheel = 0;
	motoring.leftRed = 0;
	motoring.leftGreen = 0;
	motoring.leftBlue = 0;
	motoring.rightRed = 0;
	motoring.rightGreen = 0;
	motoring.rightBlue = 0;
	motoring.buzzer = 0;
	motoring.pulse = 0;
	motoring.note = 0;
	motoring.sound = 0;
	motoring.boardWidth = 0;
	motoring.boardHeight = 0;
	motoring.motionType = 0;
	motoring.motionUnit = 0;
	motoring.motionSpeed = 0;
	motoring.motionValue = 0;
	motoring.motionRadius = 0;
	
	this.blockId = 0;
	this.motionCallback = undefined;
	this.currentSound = 0;
	this.soundRepeat = 1;
	this.soundCallback = undefined;
	this.noteId = 0;
	this.noteTimer1 = undefined;
	this.noteTimer2 = undefined;
	this.clicked = false;
	this.longPressed = false;
	this.longLongPressed = false;
	this.tempo = 60;
	
	this.__removeAllTimeouts();
};

UoAlbert.prototype.__removeTimeout = function(id) {
	clearTimeout(id);
	var idx = this.timeouts.indexOf(id);
	if(idx >= 0) {
		this.timeouts.splice(idx, 1);
	}
};

UoAlbert.prototype.__removeAllTimeouts = function() {
	var timeouts = this.timeouts;
	for(var i in timeouts) {
		clearTimeout(timeouts[i]);
	}
	this.timeouts = [];
};

UoAlbert.prototype.clearMotoring = function() {
	this.motoring.map = 0xbf800000;
};

UoAlbert.prototype.clearEvent = function() {
	this.clicked = false;
	this.longPressed = false;
	this.longLongPressed = false;
};

UoAlbert.prototype.__setPulse = function(pulse) {
	this.motoring.pulse = pulse;
	this.motoring.map |= 0x00400000;
};

UoAlbert.prototype.__setNote = function(note) {
	this.motoring.note = note;
	this.motoring.map |= 0x00200000;
};

UoAlbert.prototype.__issueNoteId = function() {
	this.noteId = this.blockId = (this.blockId % 65535) + 1;
	return this.noteId;
};

UoAlbert.prototype.__cancelNote = function() {
	this.noteId = 0;
	if(this.noteTimer1 !== undefined) {
		this.__removeTimeout(this.noteTimer1);
	}
	if(this.noteTimer2 !== undefined) {
		this.__removeTimeout(this.noteTimer2);
	}
	this.noteTimer1 = undefined;
	this.noteTimer2 = undefined;
};

UoAlbert.prototype.__setSound = function(sound) {
	this.motoring.sound = sound;
	this.motoring.map |= 0x00100000;
};

UoAlbert.prototype.__runSound = function(sound, count) {
	if(typeof count != 'number') count = 1;
	if(count < 0) count = -1;
	if(count) {
		this.currentSound = sound;
		this.soundRepeat = count;
		this.__setSound(sound);
	}
};

UoAlbert.prototype.__cancelSound = function() {
	this.soundCallback = undefined;
};

UoAlbert.prototype.__setBoardSize = function(width, height) {
	this.motoring.boardWidth = width;
	this.motoring.boardHeight = height;
	this.motoring.map |= 0x00080000;
};

UoAlbert.prototype.__setMotion = function(type, unit, speed, value, radius) {
	var motoring = this.motoring;
	motoring.motionType = type;
	motoring.motionUnit = unit;
	motoring.motionSpeed = speed;
	motoring.motionValue = value;
	motoring.motionRadius = radius;
	motoring.map |= 0x00000001;
};

UoAlbert.prototype.__cancelMotion = function() {
	this.motionCallback = undefined;
};

UoAlbert.prototype.handleSensory = function() {
	var self = this;
	var sensory = self.sensory;
	
	if(sensory.map2 & 0x80000000) self.clicked = true;
	if(sensory.map2 & 0x40000000) self.longPressed = true;
	if(sensory.map2 & 0x20000000) self.longLongPressed = true;
	
	if(self.motionCallback && (sensory.map & 0x00000010) != 0) {
		if(sensory.wheelState == 0) {
			self.motoring.leftWheel = 0;
			self.motoring.rightWheel = 0;
			var callback = self.motionCallback;
			self.__cancelMotion();
			if(callback) callback();
		}
	}
	if((sensory.map & 0x00000008) != 0) {
		if(sensory.soundState == 0) {
			if(self.currentSound > 0) {
				if(self.soundRepeat < 0) {
					self.__runSound(self.currentSound, -1);
				} else if(self.soundRepeat > 1) {
					self.soundRepeat --;
					self.__runSound(self.currentSound, self.soundRepeat);
				} else {
					self.currentSound = 0;
					self.soundRepeat = 1;
					var callback = self.soundCallback;
					self.__cancelSound();
					if(callback) callback();
				}
			} else {
				self.currentSound = 0;
				self.soundRepeat = 1;
				var callback = self.soundCallback;
				self.__cancelSound();
				if(callback) callback();
			}
		}
	}
};

UoAlbert.prototype.__UNITS = {
	'cm': 1,
	'degrees': 1,
	'seconds': 2,
	'pulses': 3
};

UoAlbert.prototype.__motion = function(type, callback) {
	var motoring = this.motoring;
	
	motoring.leftWheel = 0;
	motoring.rightWheel = 0;
	this.__setPulse(0);
	this.__setMotion(type, 1, 0, 0, 0); // type, unit, speed, value, radius
	this.motionCallback = callback;
};

UoAlbert.prototype.__motionUnit = function(type, unit, value, callback) {
	var motoring = this.motoring;
	this.__cancelMotion();
	
	motoring.leftWheel = 0;
	motoring.rightWheel = 0;
	this.__setPulse(0);
	value = parseFloat(value);
	if(value && value > 0) {
		this.__setMotion(type, unit, 0, value, 0); // type, unit, speed, value, radius
		this.motionCallback = callback;
	} else {
		this.__setMotion(0, 0, 0, 0, 0);
		callback();
	}
};

UoAlbert.prototype.moveForward = function(callback) {
	this.__motion(101, callback);
};

UoAlbert.prototype.moveBackward = function(callback) {
	this.__motion(102, callback);
};

UoAlbert.prototype.turn = function(direction, callback) {
	if(direction == 'left') {
		this.__motion(103, callback);
	} else {
		this.__motion(104, callback);
	}
};

UoAlbert.prototype.moveForwardUnit = function(value, unit, callback) {
	if(value < 0) this.__motionUnit(2, this.__UNITS[unit], -value, callback);
	else this.__motionUnit(1, this.__UNITS[unit], value, callback);
};

UoAlbert.prototype.moveBackwardUnit = function(value, unit, callback) {
	if(value < 0) this.__motionUnit(1, this.__UNITS[unit], -value, callback);
	else this.__motionUnit(2, this.__UNITS[unit], value, callback);
};

UoAlbert.prototype.turnUnit = function(direction, value, unit, callback) {
	if(direction == 'left') {
		if(value < 0) this.__motionUnit(4, this.__UNITS[unit], -value, callback);
		else this.__motionUnit(3, this.__UNITS[unit], value, callback);
	} else {
		if(value < 0) this.__motionUnit(3, this.__UNITS[unit], -value, callback);
		else this.__motionUnit(4, this.__UNITS[unit], value, callback);
	}
};

UoAlbert.prototype.pivotUnit = function(part, value, unit, toward, callback) {
	unit = this.__UNITS[unit];
	if(part == 'left') {
		if(toward == 'forward') {
			if(value < 0) this.__motionUnit(6, unit, -value, callback);
			else this.__motionUnit(5, unit, value, callback);
		} else {
			if(value < 0) this.__motionUnit(5, unit, -value, callback);
			else this.__motionUnit(6, unit, value, callback);
		}
	} else {
		if(toward == 'forward') {
			if(value < 0) this.__motionUnit(8, unit, -value, callback);
			else this.__motionUnit(7, unit, value, callback);
		} else {
			if(value < 0) this.__motionUnit(7, unit, -value, callback);
			else this.__motionUnit(8, unit, value, callback);
		}
	}
};

UoAlbert.prototype.setWheels = function(leftVelocity, rightVelocity) {
	var motoring = this.motoring;
	this.__cancelMotion();
	
	leftVelocity = parseFloat(leftVelocity);
	rightVelocity = parseFloat(rightVelocity);
	if(typeof leftVelocity == 'number') {
		motoring.leftWheel = leftVelocity;
	}
	if(typeof rightVelocity == 'number') {
		motoring.rightWheel = rightVelocity;
	}
	this.__setPulse(0);
	this.__setMotion(0, 0, 0, 0, 0);
};

UoAlbert.prototype.changeWheels = function(leftVelocity, rightVelocity) {
	var motoring = this.motoring;
	this.__cancelMotion();
	
	leftVelocity = parseFloat(leftVelocity);
	rightVelocity = parseFloat(rightVelocity);
	if(typeof leftVelocity == 'number') {
		motoring.leftWheel += leftVelocity;
	}
	if(typeof rightVelocity == 'number') {
		motoring.rightWheel += rightVelocity;
	}
	this.__setPulse(0);
	this.__setMotion(0, 0, 0, 0, 0);
};

UoAlbert.prototype.setWheel = function(wheel, velocity) {
	var motoring = this.motoring;
	this.__cancelMotion();
	
	velocity = parseFloat(velocity);
	if(typeof velocity == 'number') {
		if(wheel == 'left') {
			motoring.leftWheel = velocity;
		} else if(wheel == 'right') {
			motoring.rightWheel = velocity;
		} else {
			motoring.leftWheel = velocity;
			motoring.rightWheel = velocity;
		}
	}
	this.__setPulse(0);
	this.__setMotion(0, 0, 0, 0, 0);
};

UoAlbert.prototype.changeWheel = function(wheel, velocity) {
	var motoring = this.motoring;
	this.__cancelMotion();
	
	velocity = parseFloat(velocity);
	if(typeof velocity == 'number') {
		if(wheel == 'left') {
			motoring.leftWheel += velocity;
		} else if(wheel == 'right') {
			motoring.rightWheel += velocity;
		} else {
			motoring.leftWheel += velocity;
			motoring.rightWheel += velocity;
		}
	}
	this.__setPulse(0);
	this.__setMotion(0, 0, 0, 0, 0);
};

UoAlbert.prototype.stop = function() {
	var motoring = this.motoring;
	this.__cancelMotion();
	
	motoring.leftWheel = 0;
	motoring.rightWheel = 0;
	this.__setPulse(0);
	this.__setMotion(0, 0, 0, 0, 0);
};

UoAlbert.prototype.setBoardSize = function(width, height) {
	var motoring = this.motoring;
	width = parseInt(width);
	height = parseInt(height);
	if(width && height && width > 0 && height > 0) {
		this.__setBoardSize(width, height);
	}
};

UoAlbert.prototype.__RGBS = {
	'red': [255, 0, 0],
	'orange': [255, 63, 0],
	'yellow': [255, 255, 0],
	'green': [0, 255, 0],
	'sky blue': [0, 255, 255],
	'blue': [0, 0, 255],
	'violet': [63, 0, 255],
	'purple': [255, 0, 255],
	'white': [255, 255, 255]
};

UoAlbert.prototype.setEyeColor = function(eye, color) {
	var rgb = this.__RGBS[color];
	if(rgb) {
		this.setRgb(eye, rgb[0], rgb[1], rgb[2]);
	}
};

UoAlbert.prototype.clearEye = function(eye) {
	this.setRgb(eye, 0, 0, 0);
};

UoAlbert.prototype.setRgbArray = function(eye, rgb) {
	if(rgb) {
		this.setRgb(eye, rgb[0], rgb[1], rgb[2]);
	}
};

UoAlbert.prototype.setRgb = function(eye, red, green, blue) {
	var motoring = this.motoring;
	red = parseInt(red);
	green = parseInt(green);
	blue = parseInt(blue);
	if(eye == 'left') {
		if(typeof red == 'number') {
			motoring.leftRed = red;
		}
		if(typeof green == 'number') {
			motoring.leftGreen = green;
		}
		if(typeof blue == 'number') {
			motoring.leftBlue = blue;
		}
	} else if(eye == 'right') {
		if(typeof red == 'number') {
			motoring.rightRed = red;
		}
		if(typeof green == 'number') {
			motoring.rightGreen = green;
		}
		if(typeof blue == 'number') {
			motoring.rightBlue = blue;
		}
	} else {
		if(typeof red == 'number') {
			motoring.leftRed = red;
			motoring.rightRed = red;
		}
		if(typeof green == 'number') {
			motoring.leftGreen = green;
			motoring.rightGreen = green;
		}
		if(typeof blue == 'number') {
			motoring.leftBlue = blue;
			motoring.rightBlue = blue;
		}
	}
};

UoAlbert.prototype.changeRgb = function(eye, red, green, blue) {
	var motoring = this.motoring;
	red = parseInt(red);
	green = parseInt(green);
	blue = parseInt(blue);
	if(eye == 'left') {
		if(typeof red == 'number') {
			motoring.leftRed += red;
		}
		if(typeof green == 'number') {
			motoring.leftGreen += green;
		}
		if(typeof blue == 'number') {
			motoring.leftBlue += blue;
		}
	} else if(eye == 'right') {
		if(typeof red == 'number') {
			motoring.rightRed += red;
		}
		if(typeof green == 'number') {
			motoring.rightGreen += green;
		}
		if(typeof blue == 'number') {
			motoring.rightBlue += blue;
		}
	} else {
		if(typeof red == 'number') {
			motoring.leftRed += red;
			motoring.rightRed += red;
		}
		if(typeof green == 'number') {
			motoring.leftGreen += green;
			motoring.rightGreen += green;
		}
		if(typeof blue == 'number') {
			motoring.leftBlue += blue;
			motoring.rightBlue += blue;
		}
	}
};

UoAlbert.prototype.__SOUNDS = {
	'beep': 1,
	'siren': 2,
	'engine': 3,
	'robot': 4,
	'march': 5,
	'birthday': 6,
	'dibidibidip': 7
};

UoAlbert.prototype.playSound = function(sound, count) {
	var motoring = this.motoring;
	this.__cancelNote();
	this.__cancelSound();
	
	sound = this.__SOUNDS[sound];
	count = parseInt(count);
	motoring.buzzer = 0;
	this.__setNote(0);
	if(sound && count) {
		this.__runSound(sound, count);
	} else {
		this.__runSound(0);
	}
};

UoAlbert.prototype.playSoundUntil = function(sound, count, callback) {
	var motoring = this.motoring;
	this.__cancelNote();
	this.__cancelSound();
	
	sound = this.__SOUNDS[sound];
	count = parseInt(count);
	motoring.buzzer = 0;
	this.__setNote(0);
	if(sound && count) {
		this.__runSound(sound, count);
		this.soundCallback = callback;
	} else {
		this.__runSound(0);
		callback();
	}
};

UoAlbert.prototype.setBuzzer = function(hz) {
	var motoring = this.motoring;
	this.__cancelNote();
	this.__cancelSound();
	
	hz = parseFloat(hz);
	if(typeof hz == 'number') {
		motoring.buzzer = hz;
	}
	this.__setNote(0);
	this.__runSound(0);
};

UoAlbert.prototype.changeBuzzer = function(hz) {
	var motoring = this.motoring;
	this.__cancelNote();
	this.__cancelSound();
	
	hz = parseFloat(hz);
	if(typeof hz == 'number') {
		motoring.buzzer += hz;
	}
	this.__setNote(0);
	this.__runSound(0);
};

UoAlbert.prototype.clearSound = function() {
	this.__cancelNote();
	this.__cancelSound();
	this.motoring.buzzer = 0;
	this.__setNote(0);
	this.__runSound(0);
};

UoAlbert.prototype.__NOTES = {
	'C': 4,
	'C♯ (D♭)': 5,
	'D': 6,
	'D♯ (E♭)': 7,
	'E': 8,
	'F': 9,
	'F♯ (G♭)': 10,
	'G': 11,
	'G♯ (A♭)': 12,
	'A': 13,
	'A♯ (B♭)': 14,
	'B': 15
};

UoAlbert.prototype.playNote = function(note, octave) {
	var motoring = this.motoring;
	this.__cancelNote();
	this.__cancelSound();
	
	note = this.__NOTES[note];
	octave = parseInt(octave);
	motoring.buzzer = 0;
	if(note && octave && octave > 0 && octave < 8) {
		note += (octave - 1) * 12;
		this.__setNote(note);
	} else {
		this.__setNote(0);
	}
	this.__runSound(0);
};

UoAlbert.prototype.playNoteBeat = function(note, octave, beat, callback) {
	var self = this;
	var motoring = self.motoring;
	self.__cancelNote();
	self.__cancelSound();
	
	note = this.__NOTES[note];
	octave = parseInt(octave);
	beat = parseFloat(beat);
	motoring.buzzer = 0;
	if(note && octave && octave > 0 && octave < 8 && beat && beat > 0 && self.tempo > 0) {
		var id = self.__issueNoteId();
		note += (octave - 1) * 12;
		self.__setNote(note);
		var timeout = beat * 60 * 1000 / self.tempo;
		var tail = (timeout > 100) ? 100 : 0;
		if(tail > 0) {
			self.noteTimer1 = setTimeout(function() {
				if(self.noteId == id) {
					self.__setNote(0);
					if(self.noteTimer1 !== undefined) self.__removeTimeout(self.noteTimer1);
					self.noteTimer1 = undefined;
				}
			}, timeout - tail);
			self.timeouts.push(self.noteTimer1);
		}
		self.noteTimer2 = setTimeout(function() {
			if(self.noteId == id) {
				self.__setNote(0);
				self.__cancelNote();
				callback();
			}
		}, timeout);
		self.timeouts.push(self.noteTimer2);
		self.__runSound(0);
	} else {
		self.__setNote(0);
		self.__runSound(0);
		callback();
	}
};

UoAlbert.prototype.restBeat = function(beat, callback) {
	var self = this;
	var motoring = self.motoring;
	self.__cancelNote();
	self.__cancelSound();
	
	beat = parseFloat(beat);
	motoring.buzzer = 0;
	self.__setNote(0);
	self.__runSound(0);
	if(beat && beat > 0 && self.tempo > 0) {
		var id = self.__issueNoteId();
		self.noteTimer1 = setTimeout(function() {
			if(self.noteId == id) {
				self.__cancelNote();
				callback();
			}
		}, beat * 60 * 1000 / self.tempo);
		self.timeouts.push(self.noteTimer1);
	} else {
		callback();
	}
};

UoAlbert.prototype.setTempo = function(bpm) {
	bpm = parseFloat(bpm);
	if(typeof bpm == 'number') {
		this.tempo = bpm;
		if(this.tempo < 1) this.tempo = 1;
	}
};

UoAlbert.prototype.changeTempo = function(bpm) {
	bpm = parseFloat(bpm);
	if(typeof bpm == 'number') {
		this.tempo += bpm;
		if(this.tempo < 1) this.tempo = 1;
	}
};

UoAlbert.prototype.getLeftProximity = function() {
	return this.sensory.leftProximity;
};

UoAlbert.prototype.getRightProximity = function() {
	return this.sensory.rightProximity;
};

UoAlbert.prototype.getAccelerationX = function() {
	return this.sensory.accelerationX;
};

UoAlbert.prototype.getAccelerationY = function() {
	return this.sensory.accelerationY;
};

UoAlbert.prototype.getAccelerationZ = function() {
	return this.sensory.accelerationZ;
};

UoAlbert.prototype.getTouch = function() {
	return this.sensory.touch;
};

UoAlbert.prototype.getOid = function() {
	return this.sensory.oid;
};

UoAlbert.prototype.getPositionX = function() {
	return this.sensory.positionX;
};

UoAlbert.prototype.getPositionY = function() {
	return this.sensory.positionY;
};

UoAlbert.prototype.getLight = function() {
	return this.sensory.light;
};

UoAlbert.prototype.getTemperature = function() {
	return this.sensory.temperature;
};

UoAlbert.prototype.getSignalStrength = function() {
	return this.sensory.signalStrength;
};

UoAlbert.prototype.checkHandFound = function() {
	var sensory = this.sensory;
	return (sensory.handFound === undefined) ? (sensory.leftProximity > 40 || sensory.rightProximity > 40) : sensory.handFound;
};

UoAlbert.prototype.checkTouchEvent = function(event) {
	if(event == 'clicked') {
		return this.clicked;
	} else if(event == 'long-pressed (1.5 secs)') {
		return this.longPressed;
	} else if(event == 'long-long-pressed (3 secs)') {
		return this.longLongPressed;
	}
	return false;
};

UoAlbert.prototype.checkOid = function(value) {
	return this.sensory.oid == parseInt(value);
};

UoAlbert.prototype.checkTilt = function(tilt) {
	var sensory = this.sensory;
	switch(tilt) {
		case 'tilt forward': return sensory.tilt == 1;
		case 'tilt backward': return sensory.tilt == -1;
		case 'tilt left': return sensory.tilt == 2;
		case 'tilt right': return sensory.tilt == -2;
		case 'tilt flip': return sensory.tilt == 3;
		case 'not tilt': return sensory.tilt == -3;
	}
	return false;
};

UoAlbert.prototype.__BATTERY_STATES = {
	'normal': 2,
	'low': 1,
	'empty': 0
};

UoAlbert.prototype.checkBattery = function(battery) {
	return this.sensory.batteryState == this.__BATTERY_STATES[battery];
};

const RoboidUtil = {
	toNumber: function(value, defaultValue) {
		if(defaultValue === undefined) defaultValue = 0;
		const n = Number(value);
		if(isNaN(n)) return defaultValue;
		return n;
	},
	toBoolean: function(value) {
		if(typeof value === 'boolean') {
			return value;
		}
		if(typeof value === 'string') {
			if((value === '') || (value === '0') || (value.toLowerCase() === 'false')) {
				return false;
			}
			return true;
		}
		return Boolean(value);
	},
	toString: function(value) {
		return String(value);
	},
	hexToRgb: function(hex) {
		const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	},
	decimalToRgb: function(decimal) {
		const a = (decimal >> 24) & 0xff;
		const r = (decimal >> 16) & 0xff;
		const g = (decimal >> 8) & 0xff;
		const b = decimal & 0xff;
		return {r: r, g: g, b: b, a: a > 0 ? a : 255};
	},
	toRgbArray: function(value) {
		let color;
		if(typeof value === 'string' && value.substring(0, 1) === '#') {
			color = RoboidUtil.hexToRgb(value);
		} else {
			color = RoboidUtil.decimalToRgb(RoboidUtil.toNumber(value));
		}
		return [color.r, color.g, color.b];
	}
};

class RoboidRunner {
	constructor(creators) {
		this.creators = creators;
		this.robots = {};
		this.robotsByGroup = {};
		this.robotsByModule = {};
		this.packet = {};
		this.retryId = undefined;
		this.alive = false;
		this.canSend = false;
	}
	
	addRobotByModule(module, key, robot) {
		let robots = this.robotsByModule[module];
		if(robots === undefined) {
			robots = this.robotsByModule[module] = {};
		}
		robots[key] = robot;
	}
	
	getOrCreateRobot(group, module, index) {
		const robots = this.robots;
		const key = module + index;
		let robot = robots[key];
		if(!robot) {
			const creator = this.creators[module];
			if(creator) {
				robot = creator(index);
			}
			if(robot) {
				robots[key] = robot;
				this.packet[key] = robot.motoring;
				this.addRobotByModule(module, key, robot);
			}
		}
		this.robotsByGroup[group + index] = robot;
		return robot;
	}
	
	getRobot(group, index) {
		return this.robotsByGroup[group + index];
	}
	
	clearMotorings() {
		const robots = this.robots;
		for(const i in robots) {
			robots[i].clearMotoring();
		}
	}
	
	afterTick() {
		const robots = this.robots;
		for(const i in robots) {
			robots[i].clearEvent();
		}
	}
	
	reset(module) {
		const robots = this.robotsByModule[module];
		if(robots) {
			for(const i in robots) {
				robots[i].reset();
			}
		}
	}
	
	open() {
		try {
			const self = this;
			const sock = new WebSocket('ws://localhost:56417');
			sock.binaryType = 'arraybuffer';
			self.socket = sock;
			sock.onmessage = function(message) {
				try {
					const received = JSON.parse(message.data);
					if(received.type == 0) {
					} else if(received.type == 2) {
						for(const module in received.modules) {
						}
					} else {
						if(received.index >= 0) {
							const robot = self.getOrCreateRobot(received.group, received.module, received.index);
							if(robot) {
								robot.clearEvent();
								robot.sensory = received;
								robot.handleSensory();
							}
						}
					}
				} catch (e) {
				}
			};
			sock.onclose = function() {
				self.alive = false;
				self.canSend = false;
				if(self.retryId === undefined) {
					self.retryId = setInterval(function() {
						if(self.alive) {
							if(self.retryId !== undefined) {
								clearInterval(self.retryId);
								self.retryId = undefined;
							}
						} else {
							self.open();
						}
					}, 2000);
				}
			};
			sock.onopen = function() {
				self.alive = true;
				
				let targetTime = Date.now();
				const run = function() {
					if(self.canSend && self.socket) {
						if(Date.now() > targetTime) {
							try {
								const json = JSON.stringify(self.packet);
								if(self.canSend && self.socket) self.socket.send(json);
								self.clearMotorings();
							} catch (e) {
							}
							targetTime += 20;
						}
						setTimeout(run, 5);
					}
				};
				self.canSend = true;
				run();
			};
			return true;
		} catch(e) {
		}
		return false;
	}
	
	close() {
		this.canSend = false;
		if(this.socket) {
			this.socket.close();
			this.socket = undefined;
		}
	}
}

class UoAlbertExtension {
	constructor(runtime) {
		this.runtime = runtime;
		if(runtime.roboidCreators === undefined) {
			runtime.roboidCreators = {};
		}
		runtime.roboidCreators['uoalbert'] = function(index) {
			return new UoAlbert(index);
		};
		if(runtime.roboidRunner === undefined) {
			runtime.roboidRunner = new RoboidRunner(runtime.roboidCreators);
			setTimeout(() => {
				runtime.roboidRunner.open();
			}, 1000);
		}
		runtime.registerPeripheralExtension('uoalbert', this);
		runtime.on('PROJECT_STOP_ALL', this.onStop.bind(this));
	}
	
	onStop() {
		if(this.runtime.roboidRunner) {
			this.runtime.roboidRunner.reset('uoalbert');
		}
	}
	
	getInfo() {
		return {
			id: 'uoalbert',
			name: 'UO 알버트',
      color1: '#0FBD8C',
      color2: '#0DA57A',
			menuIconURI: Resource.iconURI,
			blockIconURI: Resource.iconURI,
			blocks: [
				{"opcode":"uoMoveForwardUnit","text":"앞으로 [VALUE][UNIT] 이동하기","blockType":"command","arguments":{"VALUE":{"type":"number","defaultValue":5},"UNIT":{"type":"string","menu":"move_unit","defaultValue":"cm"}},"func":"uoMoveForwardUnit","blockCategory":"motion"},
				{"opcode":"uoMoveBackwardUnit","text":"뒤로 [VALUE][UNIT] 이동하기","blockType":"command","arguments":{"VALUE":{"type":"number","defaultValue":5},"UNIT":{"type":"string","menu":"move_unit","defaultValue":"cm"}},"func":"uoMoveBackwardUnit","blockCategory":"motion"},
				{"opcode":"uoTurnUnitInPlace","text":"[DIRECTION]으로 [VALUE][UNIT] 제자리 돌기","blockType":"command","arguments":{"DIRECTION":{"type":"string","menu":"left_right","defaultValue":"left"},"VALUE":{"type":"number","defaultValue":90},"UNIT":{"type":"string","menu":"turn_unit","defaultValue":"degrees"}},"func":"uoTurnUnitInPlace","blockCategory":"motion"},
				{"opcode":"uoPivotAroundWheelUnitInDirection","text":"[WHEEL] 바퀴 중심으로 [VALUE][UNIT] [TOWARD] 방향으로 돌기","blockType":"command","arguments":{"WHEEL":{"type":"string","menu":"left_right","defaultValue":"left"},"VALUE":{"type":"number","defaultValue":90},"UNIT":{"type":"string","menu":"turn_unit","defaultValue":"degrees"},"TOWARD":{"type":"string","menu":"forward_backward","defaultValue":"forward"}},"func":"uoPivotAroundWheelUnitInDirection","blockCategory":"motion"},
				{"opcode":"uoChangeBothWheelsBy","text":"왼쪽 바퀴 [LEFT] 오른쪽 바퀴 [RIGHT]만큼 바꾸기","blockType":"command","arguments":{"LEFT":{"type":"number","defaultValue":10},"RIGHT":{"type":"number","defaultValue":10}},"func":"uoChangeBothWheelsBy","blockCategory":"motion"},
				{"opcode":"uoSetBothWheelsTo","text":"왼쪽 바퀴 [LEFT] 오른쪽 바퀴 [RIGHT](으)로 정하기","blockType":"command","arguments":{"LEFT":{"type":"number","defaultValue":50},"RIGHT":{"type":"number","defaultValue":50}},"func":"uoSetBothWheelsTo","blockCategory":"motion"},
				{"opcode":"uoChangeWheelBy","text":"[WHEEL] 바퀴 [VALUE]만큼 바꾸기","blockType":"command","arguments":{"WHEEL":{"type":"string","menu":"left_right_both","defaultValue":"left"},"VALUE":{"type":"number","defaultValue":10}},"func":"uoChangeWheelBy","blockCategory":"motion"},
				{"opcode":"uoSetWheelTo","text":"[WHEEL] 바퀴 [VALUE](으)로 정하기","blockType":"command","arguments":{"WHEEL":{"type":"string","menu":"left_right_both","defaultValue":"left"},"VALUE":{"type":"number","defaultValue":50}},"func":"uoSetWheelTo","blockCategory":"motion"},
				{"opcode":"uoStop","text":"정지하기","blockType":"command","func":"uoStop","blockCategory":"motion"},
				{"opcode":"uoSetBoardSizeTo","text":"말판 크기를 폭 [WIDTH] 높이 [HEIGHT](으)로 정하기","blockType":"command","arguments":{"WIDTH":{"type":"number","defaultValue":108},"HEIGHT":{"type":"number","defaultValue":76}},"func":"uoSetBoardSizeTo","blockCategory":"motion"},"---",
				{"opcode":"uoSetEyeTo","text":"[EYE] 눈을 [COLOR]으로 정하기","blockType":"command","arguments":{"EYE":{"type":"string","menu":"left_right_both","defaultValue":"left"},"COLOR":{"type":"string","menu":"led_color","defaultValue":"red"}},"func":"uoSetEyeTo","blockCategory":"looks"},
				{"opcode":"uoSetEyeToPicker","text":"[EYE] 눈을 [COLOR]로 정하기","blockType":"command","arguments":{"EYE":{"type":"string","menu":"left_right_both","defaultValue":"left"},"COLOR":{"type":"color","defaultValue":"#ff0000"}},"func":"uoSetEyeToPicker","blockCategory":"looks"},
				{"opcode":"uoChangeEyeByRGB","text":"[EYE] 눈을 R: [RED] G: [GREEN] B: [BLUE]만큼 바꾸기","blockType":"command","arguments":{"EYE":{"type":"string","menu":"left_right_both","defaultValue":"left"},"RED":{"type":"number","defaultValue":10},"GREEN":{"type":"number","defaultValue":0},"BLUE":{"type":"number","defaultValue":0}},"func":"uoChangeEyeByRGB","blockCategory":"looks"},
				{"opcode":"uoSetEyeToRGB","text":"[EYE] 눈을 R: [RED] G: [GREEN] B: [BLUE](으)로 정하기","blockType":"command","arguments":{"EYE":{"type":"string","menu":"left_right_both","defaultValue":"left"},"RED":{"type":"number","defaultValue":255},"GREEN":{"type":"number","defaultValue":0},"BLUE":{"type":"number","defaultValue":0}},"func":"uoSetEyeToRGB","blockCategory":"looks"},
				{"opcode":"uoClearEye","text":"[EYE] 눈 끄기","blockType":"command","arguments":{"EYE":{"type":"string","menu":"left_right_both","defaultValue":"left"}},"func":"uoClearEye","blockCategory":"looks"},"---",
				{"opcode":"uoPlaySoundTimes","text":"[SOUND] 소리 [REPEAT]번 재생하기","blockType":"command","arguments":{"SOUND":{"type":"string","menu":"uo_sound","defaultValue":"beep"},"REPEAT":{"type":"number","defaultValue":1}},"func":"uoPlaySoundTimes","blockCategory":"sound"},
				{"opcode":"uoPlaySoundTimesUntilDone","text":"[SOUND] 소리 [REPEAT]번 재생하고 기다리기","blockType":"command","arguments":{"SOUND":{"type":"string","menu":"uo_sound","defaultValue":"beep"},"REPEAT":{"type":"number","defaultValue":1}},"func":"uoPlaySoundTimesUntilDone","blockCategory":"sound"},
				{"opcode":"uoChangeBuzzerBy","text":"버저 음을 [HZ]만큼 바꾸기","blockType":"command","arguments":{"HZ":{"type":"number","defaultValue":10}},"func":"uoChangeBuzzerBy","blockCategory":"sound"},
				{"opcode":"uoSetBuzzerTo","text":"버저 음을 [HZ](으)로 정하기","blockType":"command","arguments":{"HZ":{"type":"number","defaultValue":1000}},"func":"uoSetBuzzerTo","blockCategory":"sound"},
				{"opcode":"uoClearSound","text":"소리 끄기","blockType":"command","func":"uoClearSound","blockCategory":"sound"},
				{"opcode":"uoPlayNote","text":"[NOTE][OCTAVE] 음을 연주하기","blockType":"command","arguments":{"NOTE":{"type":"string","menu":"note","defaultValue":"C"},"OCTAVE":{"type":"string","menu":"octave","defaultValue":"4"}},"func":"uoPlayNote","blockCategory":"sound"},
				{"opcode":"uoPlayNoteFor","text":"[NOTE][OCTAVE] 음을 [BEAT]박자 연주하기","blockType":"command","arguments":{"NOTE":{"type":"string","menu":"note","defaultValue":"C"},"OCTAVE":{"type":"string","menu":"octave","defaultValue":"4"},"BEAT":{"type":"number","defaultValue":0.5}},"func":"uoPlayNoteFor","blockCategory":"sound"},
				{"opcode":"uoRestFor","text":"[BEAT]박자 쉬기","blockType":"command","arguments":{"BEAT":{"type":"number","defaultValue":0.25}},"func":"uoRestFor","blockCategory":"sound"},
				{"opcode":"uoChangeTempoBy","text":"연주 속도를 [BPM]만큼 바꾸기","blockType":"command","arguments":{"BPM":{"type":"number","defaultValue":20}},"func":"uoChangeTempoBy","blockCategory":"sound"},
				{"opcode":"uoSetTempoTo","text":"연주 속도를 [BPM]BPM으로 정하기","blockType":"command","arguments":{"BPM":{"type":"number","defaultValue":60}},"func":"uoSetTempoTo","blockCategory":"sound"},"---",
				{"opcode":"uoLeftProximity","text":"왼쪽 근접 센서","blockType":"reporter","func":"uoLeftProximity","blockCategory":"sensing"},
				{"opcode":"uoRightProximity","text":"오른쪽 근접 센서","blockType":"reporter","func":"uoRightProximity","blockCategory":"sensing"},
				{"opcode":"uoAccelerationX","text":"x축 가속도","blockType":"reporter","func":"uoAccelerationX","blockCategory":"sensing"},
				{"opcode":"uoAccelerationY","text":"y축 가속도","blockType":"reporter","func":"uoAccelerationY","blockCategory":"sensing"},
				{"opcode":"uoAccelerationZ","text":"z축 가속도","blockType":"reporter","func":"uoAccelerationZ","blockCategory":"sensing"},
				{"opcode":"uoTouch","text":"터치","blockType":"reporter","func":"uoTouch","blockCategory":"sensing"},
				{"opcode":"uoOid","text":"OID","blockType":"reporter","func":"uoOid","blockCategory":"sensing"},
				{"opcode":"uoPositionX","text":"x 위치","blockType":"reporter","func":"uoPositionX","blockCategory":"sensing"},
				{"opcode":"uoPositionY","text":"y 위치","blockType":"reporter","func":"uoPositionY","blockCategory":"sensing"},
				{"opcode":"uoLight","text":"밝기","blockType":"reporter","func":"uoLight","blockCategory":"sensing"},
				{"opcode":"uoTemperature","text":"온도","blockType":"reporter","func":"uoTemperature","blockCategory":"sensing"},
				{"opcode":"uoSignalStrength","text":"신호 세기","blockType":"reporter","func":"uoSignalStrength","blockCategory":"sensing"},
				{"opcode":"uoWhenHandFound","text":"손 찾았을 때","blockType":"hat","func":"uoWhenHandFound","blockCategory":"sensing"},
				{"opcode":"uoWhenTouchState","text":"터치 센서를 [EVENT] 때","blockType":"hat","arguments":{"EVENT":{"type":"string","menu":"when_touch_state","defaultValue":"clicked"}},"func":"uoWhenTouchState","blockCategory":"sensing"},
				{"opcode":"uoWhenOid","text":"OID가 [VALUE]일 때","blockType":"hat","arguments":{"VALUE":{"type":"number","defaultValue":0}},"func":"uoWhenOid","blockCategory":"sensing"},
				{"opcode":"uoWhenTilt","text":"[TILT] 때","blockType":"hat","arguments":{"TILT":{"type":"string","menu":"when_tilt","defaultValue":"tilt forward"}},"func":"uoWhenTilt","blockCategory":"sensing"},
				{"opcode":"uoHandFound","text":"손 찾음?","blockType":"Boolean","func":"uoHandFound","blockCategory":"sensing"},
				{"opcode":"uoTouchState","text":"터치 센서를 [EVENT]?","blockType":"Boolean","arguments":{"EVENT":{"type":"string","menu":"touch_state","defaultValue":"clicked"}},"func":"uoTouchState","blockCategory":"sensing"},
				{"opcode":"uoIsOid","text":"OID가 [VALUE]인가?","blockType":"Boolean","arguments":{"VALUE":{"type":"number","defaultValue":0}},"func":"uoIsOid","blockCategory":"sensing"},
				{"opcode":"uoTilt","text":"[TILT]?","blockType":"Boolean","arguments":{"TILT":{"type":"string","menu":"tilt","defaultValue":"tilt forward"}},"func":"uoTilt","blockCategory":"sensing"},
				{"opcode":"uoBatteryState","text":"배터리 [BATTERY]?","blockType":"Boolean","arguments":{"BATTERY":{"type":"string","menu":"battery","defaultValue":"normal"}},"func":"uoBatteryState","blockCategory":"sensing"}
			],
			menus: {
				"move_unit":[{"text":"cm","value":"cm"},{"text":"초","value":"seconds"},{"text":"펄스","value":"pulses"}],
				"turn_unit":[{"text":"도","value":"degrees"},{"text":"초","value":"seconds"},{"text":"펄스","value":"pulses"}],
				"cm_sec":[{"text":"cm","value":"cm"},{"text":"초","value":"seconds"}],
				"deg_sec":[{"text":"도","value":"degrees"},{"text":"초","value":"seconds"}],
				"left_right":[{"text":"왼쪽","value":"left"},{"text":"오른쪽","value":"right"}],
				"left_right_both":[{"text":"왼쪽","value":"left"},{"text":"오른쪽","value":"right"},{"text":"양쪽","value":"both"}],
				"forward_backward":[{"text":"앞쪽","value":"forward"},{"text":"뒤쪽","value":"backward"}],
				"led_color":[{"text":"빨간색","value":"red"},{"text":"주황색","value":"orange"},{"text":"노란색","value":"yellow"},{"text":"초록색","value":"green"},{"text":"하늘색","value":"sky blue"},{"text":"파란색","value":"blue"},{"text":"보라색","value":"violet"},{"text":"자주색","value":"purple"},{"text":"하얀색","value":"white"}],
				"uo_sound":[{"text":"삐","value":"beep"},{"text":"사이렌","value":"siren"},{"text":"엔진","value":"engine"},{"text":"로봇","value":"robot"},{"text":"디비디비딥","value":"dibidibidip"},{"text":"행진","value":"march"},{"text":"생일","value":"birthday"}],
				"note":[{"text":"도","value":"C"},{"text":"도♯ (레♭)","value":"C♯ (D♭)"},{"text":"레","value":"D"},{"text":"레♯ (미♭)","value":"D♯ (E♭)"},{"text":"미","value":"E"},{"text":"파","value":"F"},{"text":"파♯ (솔♭)","value":"F♯ (G♭)"},{"text":"솔","value":"G"},{"text":"솔♯ (라♭)","value":"G♯ (A♭)"},{"text":"라","value":"A"},{"text":"라♯ (시♭)","value":"A♯ (B♭)"},{"text":"시","value":"B"}],
				"octave":[{"text":"1","value":"1"},{"text":"2","value":"2"},{"text":"3","value":"3"},{"text":"4","value":"4"},{"text":"5","value":"5"},{"text":"6","value":"6"},{"text":"7","value":"7"}],
				"when_touch_state":[{"text":"클릭했을","value":"clicked"},{"text":"오래 눌렀을(1.5초)","value":"long-pressed (1.5 secs)"},{"text":"아주 오래 눌렀을(3초)","value":"long-long-pressed (3 secs)"}],
				"when_tilt":[{"text":"앞으로 기울였을","value":"tilt forward"},{"text":"뒤로 기울였을","value":"tilt backward"},{"text":"왼쪽으로 기울였을","value":"tilt left"},{"text":"오른쪽으로 기울였을","value":"tilt right"},{"text":"거꾸로 뒤집었을","value":"tilt flip"},{"text":"기울이지 않았을","value":"not tilt"}],
				"touch_state":[{"text":"클릭했는가","value":"clicked"},{"text":"오래 눌렀는가(1.5초)","value":"long-pressed (1.5 secs)"},{"text":"아주 오래 눌렀는가(3초)","value":"long-long-pressed (3 secs)"}],
				"tilt":[{"text":"앞으로 기울임","value":"tilt forward"},{"text":"뒤로 기울임","value":"tilt backward"},{"text":"왼쪽으로 기울임","value":"tilt left"},{"text":"오른쪽으로 기울임","value":"tilt right"},{"text":"거꾸로 뒤집음","value":"tilt flip"},{"text":"기울이지 않음","value":"not tilt"}],
				"battery":[{"text":"정상","value":"normal"},{"text":"부족","value":"low"},{"text":"없음","value":"empty"}]
			}
		};
	}
	
	getRobot(args) {
		if(args.INDEX === undefined) {
			if(this.runtime.roboidRunner) {
				return this.runtime.roboidRunner.getRobot('uoalbert', 0);
			}
		} else {
			const index = RoboidUtil.toNumber(args.INDEX, -1);
			if(index >= 0 && this.runtime.roboidRunner) {
				return this.runtime.roboidRunner.getRobot('uoalbert', index);
			}
		}
	}
	
	uoMoveForwardUnit(args) {
		return new Promise(resolve => {
			const robot = this.getRobot(args);
			if(robot) robot.moveForwardUnit(args.VALUE, args.UNIT, resolve);
		});
	}
	
	uoMoveBackwardUnit(args) {
		return new Promise(resolve => {
			const robot = this.getRobot(args);
			if(robot) robot.moveBackwardUnit(args.VALUE, args.UNIT, resolve);
		});
	}
	
	uoTurnUnitInPlace(args) {
		return new Promise(resolve => {
			const robot = this.getRobot(args);
			if(robot) robot.turnUnit(args.DIRECTION, args.VALUE, args.UNIT, resolve);
		});
	}
	
	uoPivotAroundWheelUnitInDirection(args) {
		return new Promise(resolve => {
			const robot = this.getRobot(args);
			if(robot) robot.pivotUnit(args.WHEEL, args.VALUE, args.UNIT, args.TOWARD, resolve);
		});
	}
	
	uoChangeBothWheelsBy(args) {
		const robot = this.getRobot(args);
		if(robot) robot.changeWheels(args.LEFT, args.RIGHT);
	}
	
	uoSetBothWheelsTo(args) {
		const robot = this.getRobot(args);
		if(robot) robot.setWheels(args.LEFT, args.RIGHT);
	}
	
	uoChangeWheelBy(args) {
		const robot = this.getRobot(args);
		if(robot) robot.changeWheel(args.WHEEL, args.VALUE);
	}
	
	uoSetWheelTo(args) {
		const robot = this.getRobot(args);
		if(robot) robot.setWheel(args.WHEEL, args.VALUE);
	}
	
	uoStop(args) {
		const robot = this.getRobot(args);
		if(robot) robot.stop();
	}
	
	uoSetBoardSizeTo(args) {
		const robot = this.getRobot(args);
		if(robot) robot.setBoardSize(args.WIDTH, args.HEIGHT);
	}
	
	uoSetEyeTo(args) {
		const robot = this.getRobot(args);
		if(robot) robot.setEyeColor(args.EYE, args.COLOR);
	}
	
	uoSetEyeToPicker(args) {
		const robot = this.getRobot(args);
		if(robot) robot.setRgbArray(args.EYE, StudioUtil.toRgbArray(args.COLOR));
	}
	
	uoChangeEyeByRGB(args) {
		const robot = this.getRobot(args);
		if(robot) robot.changeRgb(args.EYE, args.RED, args.GREEN, args.BLUE);
	}
	
	uoSetEyeToRGB(args) {
		const robot = this.getRobot(args);
		if(robot) robot.setRgb(args.EYE, args.RED, args.GREEN, args.BLUE);
	}
	
	uoClearEye(args) {
		const robot = this.getRobot(args);
		if(robot) robot.clearEye(args.EYE);
	}
	
	uoPlaySound(args) {
		const robot = this.getRobot(args);
		if(robot) robot.playSound(args.SOUND, 1);
	}
	
	uoPlaySoundTimes(args) {
		const robot = this.getRobot(args);
		if(robot) robot.playSound(args.SOUND, args.REPEAT);
	}
	
	uoPlaySoundTimesUntilDone(args) {
		return new Promise(resolve => {
			const robot = this.getRobot(args);
			if(robot) robot.playSoundUntil(args.SOUND, args.REPEAT, resolve);
		});
	}
	
	uoChangeBuzzerBy(args) {
		const robot = this.getRobot(args);
		if(robot) robot.changeBuzzer(args.HZ);
	}
	
	uoSetBuzzerTo(args) {
		const robot = this.getRobot(args);
		if(robot) robot.setBuzzer(args.HZ);
	}
	
	uoClearSound(args) {
		const robot = this.getRobot(args);
		if(robot) robot.clearSound();
	}
	
	uoPlayNote(args) {
		const robot = this.getRobot(args);
		if(robot) robot.playNote(args.NOTE, args.OCTAVE);
	}
	
	uoPlayNoteFor(args) {
		return new Promise(resolve => {
			const robot = this.getRobot(args);
			if(robot) robot.playNoteBeat(args.NOTE, args.OCTAVE, args.BEAT, resolve);
		});
	}
	
	uoRestFor(args) {
		return new Promise(resolve => {
			const robot = this.getRobot(args);
			if(robot) robot.restBeat(args.BEAT, resolve);
		});
	}
	
	uoChangeTempoBy(args) {
		const robot = this.getRobot(args);
		if(robot) robot.changeTempo(args.BPM);
	}
	
	uoSetTempoTo(args) {
		const robot = this.getRobot(args);
		if(robot) robot.setTempo(args.BPM);
	}
	
	uoLeftProximity(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getLeftProximity() : 0;
	}
	
	uoRightProximity(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getRightProximity() : 0;
	}
	
	uoAccelerationX(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getAccelerationX() : 0;
	}
	
	uoAccelerationY(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getAccelerationY() : 0;
	}
	
	uoAccelerationZ(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getAccelerationZ() : 0;
	}
	
	uoTouch(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getTouch() : 0;
	}
	
	uoOid(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getOid() : -1;
	}
	
	uoPositionX(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getPositionX() : -1;
	}
	
	uoPositionY(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getPositionY() : -1;
	}
	
	uoLight(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getLight() : 0;
	}
	
	uoTemperature(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getTemperature() : 0;
	}
	
	uoSignalStrength(args) {
		const robot = this.getRobot(args);
		return robot ? robot.getSignalStrength() : 0;
	}
	
	uoWhenHandFound(args) {
		const robot = this.getRobot(args);
		return robot ? robot.checkHandFound() : false;
	}
	
	uoWhenTouchState(args) {
		const robot = this.getRobot(args);
		return robot ? robot.checkTouchEvent(args.EVENT) : false;
	}
	
	uoWhenOid(args) {
		const robot = this.getRobot(args);
		return robot ? robot.checkOid(args.VALUE) : false;
	}
	
	uoWhenTilt(args) {
		const robot = this.getRobot(args);
		return robot ? robot.checkTilt(args.TILT) : false;
	}
	
	uoHandFound(args) {
		const robot = this.getRobot(args);
		return robot ? robot.checkHandFound() : false;
	}
	
	uoTouchState(args) {
		const robot = this.getRobot(args);
		return robot ? robot.checkTouchEvent(args.EVENT) : false;
	}
	
	uoIsOid(args) {
		const robot = this.getRobot(args);
		return robot ? robot.checkOid(args.VALUE) : false;
	}
	
	uoTilt(args) {
		const robot = this.getRobot(args);
		return robot ? robot.checkTilt(args.TILT) : false;
	}
	
	uoBatteryState(args) {
		const robot = this.getRobot(args);
		return robot ? robot.checkBattery(args.BATTERY) : false;
	}
}

if(!Date.now) {
	Date.now = function() {
		return new Date().getTime();
	};
}

module.exports = UoAlbertExtension;
