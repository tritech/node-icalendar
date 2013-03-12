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
// 
// Implement RFC5545 (iCalendar)
// see: http://tools.ietf.org/html/rfc5545
//

var assert = require('assert');
var util = require('util');

var CalendarObject = require('./base').CalendarObject;
var CalendarProperty = require('./base').CalendarProperty;
var schema = require('./base').schema;



var iCalendar = exports.iCalendar = function(empty) {
    CalendarObject.call(this, this, 'VCALENDAR');
    this.calendar = this;

    if(!empty) {
        this.addProperty('VERSION', '2.0');
        this.addProperty('PRODID', require('./index').PRODID);      
    }
}
util.inherits(iCalendar, CalendarObject);

iCalendar.prototype.events = function() { return this.components['VEVENT'] || []; }

iCalendar.prototype.timezone = function(tzid) {
    for(var i=0; i<this.components['VTIMEZONE'].length; ++i) {
        var tz = this.components['VTIMEZONE'][i];
        if(tz.getPropertyValue('TZID') == tzid)
            return tz;
    }
}



schema.VCALENDAR = {
    factory: iCalendar,
    valid_properties: [],
    required_properties: ['PRODID','VERSION'],
    valid_children: ['VEVENT'],
    required_children: []
};

// Unimplemented components...
schema.VTODO = {
    required_properties: ['DTSTAMP','UID']
};
schema.VJOURNAL = {
    required_properties: ['DTSTAMP','UID']
};
schema.VFREEBUSY = {
    required_properties: ['DTSTAMP','UID']
};
schema.VALARM = {
    required_properties: ['ACTION','TRIGGER']
};
