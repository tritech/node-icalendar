/* jshint node:true */

'use strict';

// Copyright (C) 2011 Tri Tech Computers Ltd.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
//

var util           = require('util');
var CalendarObject = require('./base').CalendarObject;
var schema         = require('./base').schema;

var validateRequired = function(prop){
  if (this.getProperties(prop).length === 0){
    throw new Error(prop + ' property is required.');
  }
};

var validateExactlyOne = function(prop){
  if (this.getProperties(prop).length !== 1){
    throw new Error(prop + ' property is required and must not occur more than once.');
  }
};

var validateNoMoreThanOne = function(prop){
  if (this.getProperties(prop).length > 1){
    throw new Error(prop + ' property must not occur more than once.');
  }
};

var validateBonded = function(props){
  var nonExistingProperties = [];
  var existingProperties    = [];

  props.forEach(function(prop, index){
    (this.getPropertyValue(prop) !== undefined ? existingProperties : nonExistingProperties).push(prop);
  }.bind(this));

  if (existingProperties.length > 0 && nonExistingProperties.length > 0){
    throw new Error('Properties [\'' + existingProperties.join('\', \'') + '\'] exists but properties [\'' + nonExistingProperties.join('\', \'') + '\'] are not present.');
  }

};

var VAlarm = exports.VAlarm = function(calendar, action, trigger){
  CalendarObject.call(this, calendar, 'VALARM');

  if (action !== undefined){
    this.addProperty('ACTION', action);
  }

  if (trigger !== undefined){
    this.addProperty('TRIGGER', trigger);
  }
};

util.inherits(VAlarm, CalendarObject);

VAlarm.prototype.setAction = function(action){
  this.addProperty('ACTION', action);
};

VAlarm.prototype.setTrigger = function(trigger){
  this.addProperty('TRIGGER', trigger);
};

VAlarm.prototype.setAttach = function(uri){
  this.addProperty('ATTACH', uri);
};

VAlarm.prototype.setSummary = function(summ){
  this.addProperty('SUMMARY', summ);
};

VAlarm.prototype.setAttendee = function(attendee){
  this.addProperty('ATTENDEE', attendee);
};

VAlarm.prototype.setRepeat = function(repeat){
  this.addProperty('REPEAT', repeat);
};

VAlarm.prototype.setDuration = function(duration){
  this.addProperty('DURATION', duration);
};

VAlarm.prototype.setDescription = function(desc){
  this.addProperty('DESCRIPTION', desc);
};

VAlarm.prototype.validate = function(){
  VAlarm.super_.prototype.validate.apply(this);

  validateExactlyOne.bind(this)('ACTION');
  validateExactlyOne.bind(this)('TRIGGER');
  validateNoMoreThanOne.bind(this)('DURATION');
  validateNoMoreThanOne.bind(this)('REPEAT');
  validateBonded.bind(this)([ 'DURATION', 'REPEAT' ]);

  var action  = this.getPropertyValue('ACTION');
  var trigger = this.getPropertyValue('TRIGGER');

  switch(action){
    case 'AUDIO':
      validateNoMoreThanOne.bind(this)('ATTACH');
      break;

    case 'DISPLAY':
      validateExactlyOne.bind(this)('DESCRIPTION');
      break;

    case 'EMAIL':
      validateExactlyOne.bind(this)('DESCRIPTION');
      validateExactlyOne.bind(this)('SUMMARY');
      validateRequired.bind(this)('ATTENDEE');
      break;

    default:
      throw new Error('Invalid ACTION value for VALARM');
  }

};

schema.VALARM = {
  factory: VAlarm,
  valid_properties: [],
  required_properties: [ 'ACTION', 'TRIGGER' ],
  valid_children: [],
  required_children: []
};
