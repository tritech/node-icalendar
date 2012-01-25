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

var types = require('./types');
var parser = require('./parser');

var format_value = exports.format_value = types.format_value;
var parse_value = exports.parse_value = types.parse_value;
var RRule = exports.RRule = require('./recur').RRule;

// Maximum number of octets in a single iCalendar line
var MAX_LINE = 75;

exports.PRODID = '-//Tri Tech Computers//node-icalendar//EN';

exports.parse_calendar = parser.parse_calendar;


var CalendarObject = exports.CalendarObject = function(calendar, element) {
    this.calendar = calendar;
    this.element = element;
    this.components = {};
    this.properties = {};
}

CalendarObject.prototype.addProperty = function(prop, value, parameters) {
    if(!(prop instanceof CalendarProperty))
        prop = new CalendarProperty(prop, value, parameters);

    // TODO: What about multiple occurances of the same property?
    this.properties[prop.name] = prop;
    return prop;
}

CalendarObject.prototype.addComponent = function(comp) {
    if(!(comp instanceof CalendarObject)) {
        var factory = (schema[comp] || {}).factory;
        comp = factory !== undefined
                 ? new factory(this.calendar)
                 : new CalendarObject(this.calendar, comp);
    }

    this.components[comp.element] = this.components[comp.element] || [];
    this.components[comp.element].push(comp);
    comp.calendar = this.calendar;
    return comp;
}

CalendarObject.prototype.getProperty = function(prop) {
    return this.properties[prop];
}

CalendarObject.prototype.getPropertyValue = function(prop) {
    return (this.properties[prop] || {}).value;
}

CalendarObject.prototype.toString = function() {
    // Make sure output always includes a VCALENDAR object
    var output;
    if(this.element == 'VCALENDAR')
        output = this.format();
    else {
        var ical = new iCalendar();
        ical.addComponent(this);
        output = ical.format()
    }

    output.push(''); // <-- Add empty element to ensure trailing CRLF
    return output.join('\r\n');
}

CalendarObject.prototype.format = function() {
    var lines = ['BEGIN:'+this.element];
    for(var i in this.properties)
        lines.push.apply(lines, this.properties[i].format());

    for(var comp in this.components) {
        var comp = this.components[comp];
        for(var i=0; i < comp.length; ++i)
            lines.push.apply(lines, comp[i].format());
    }

    lines.push('END:'+this.element);
    return lines;
}




var CalendarProperty = exports.CalendarProperty = function(name, value, parameters) {
    var propdef = properties[name];

    this.type = propdef && propdef.type ? propdef.type : 'TEXT';
    this.name = name;
    this.value = value;
    this.parameters = parameters || {};
}

CalendarProperty.prototype.getParameter = function(param) {
    return this.parameters[param];
}

CalendarProperty.prototype.format = function() {
    var data = new Buffer(this.name+':'+format_value(this.type, this.value));
    var pos = 0, len;
    var output = [];
    while(true) {
        len = MAX_LINE;
        if(pos+len >= data.length)
            len = data.length-pos;

        // We're in the middle of a unicode character if the high bit is set and
        // the next byte is 10xxxxxx (or 0x80).  Don't split it in half.
        // Wind backward until we find the start character...
        while((data[pos+len] & 0xc0) == 0x80)
            len--;

        output.push(data.toString('utf8', pos, pos+len));

        if(pos+len >= data.length)
            break;

        // Insert the space for the start of the next line...
        pos += len-1;
        data[pos] = 0x20;
    }

    return output;
}



var iCalendar = exports.iCalendar = function(empty) {
    CalendarObject.call(this, this, 'VCALENDAR');
    this.calendar = this;

    if(!empty) {
        this.addProperty('PRODID', exports.PRODID);
        this.addProperty('VERSION', '2.0');
    }
}
util.inherits(iCalendar, CalendarObject);

iCalendar.parse = parser.parse_calendar;

iCalendar.prototype.events = function() { return this.components['VEVENT'] || []; }

iCalendar.prototype.timezone = function(tzid) {
    for(var i=0; i<this.components['VTIMEZONE'].length; ++i) {
        var tz = this.components['VTIMEZONE'][i];
        if(tz.getPropertyValue('TZID') == tzid)
            return tz;
    }
}


var VEvent = exports.VEvent = function(calendar, uid) {
    if(!(calendar instanceof iCalendar)) {
        uid = calendar;
        calendar = null;
    }
    CalendarObject.call(this, calendar, 'VEVENT');

//    TODO: Move validation to its own method
//    if(uid === undefined)
//        throw Error("UID is a required parameter");

    if(uid !== undefined) {
        this.addProperty('DTSTAMP', new Date());
        this.addProperty('UID', uid);
    }
}
util.inherits(VEvent, CalendarObject);

VEvent.prototype.setSummary = function(summ) {
    this.addProperty('SUMMARY', summ);
}

VEvent.prototype.setDescription = function(desc) {
    this.addProperty('DESCRIPTION', desc);
}

VEvent.prototype.setDate = function(start, end) {
    this.addProperty('DTSTART', start);
    if(end instanceof Date)
        this.addProperty('DTEND', end);
    else
        this.addProperty('DURATION', end);
}

VEvent.prototype.inTimeRange = function(start, end) {
    // TODO: Add support for RRULEs here

    var dtstart = this.getPropertyValue('DTSTART');
    var dtend = this.getPropertyValue('DTEND');

    if(!dtend) {
        var duration = this.getPropertyValue('DURATION');
        if(duration === 0)
            // Special case for zero-duration, as per RFC4791
            return (!start || start <= dtstart) && (!end || end > dtstart);

        else if(duration)
            dtend = new Date(dtstart.valueOf() + this.getPropertyValue('DURATION')*1000);
        else 
            dtend = new Date(dtstart.valueOf() + 24*60*60*1000); // +1 day
    }

    return (!start || start < dtend) && (!end || end > dtstart);
}



var VTimezone = exports.VTimezone = function(calendar, tzid) {
    CalendarObject.call(this, calendar, 'VTIMEZONE');
    this.addProperty('TZID', tzid);
}
util.inherits(VTimezone, CalendarObject);

VTimezone.prototype.getOffsetForDate = function(dt) {
    // Right now we're only supporting a single element
    assert.equal(1, this.components['STANDARD'].length);
    assert.equal(1, this.components['DAYLIGHT'].length);

    var std = this.components['STANDARD'][0];
    var dst = this.components['DAYLIGHT'][0];
    var next_std = std.getPropertyValue('RRULE').nextOccurs(std.getPropertyValue('DTSTART'), dt);
    var next_dst = dst.getPropertyValue('RRULE').nextOccurs(dst.getPropertyValue('DTSTART'), dt);

    // TODO: Using prevOccurs would be a better solution
    if(next_std < next_dst)
        return dst.getPropertyValue('TZOFFSETTO');
    return std.getPropertyValue('TZOFFSETTO');
}

// Convert a parsed date in localtime to a UTC date object
VTimezone.prototype.fromLocalTime = function(dtarray) {
    // Create a slightly inaccurate date object
    var dt = new Date(dtarray[0], dtarray[1]-1, dtarray[2],
                        dtarray[3], dtarray[4], dtarray[5]);
    var hrs = this.getOffsetForDate(dt);
    var min = hrs % 100;
    hrs = (hrs-min) / 100;

    return new Date(Date.UTC(dtarray[0], dtarray[1]-1, dtarray[2],
                    dtarray[3]-hrs, dtarray[4]-min, dtarray[5]));
}


// iCalendar schema, required prop
var schema = exports.schema = {
    VCALENDAR: {
        valid_properties: [],
        required_properties: ['PRODID','VERSION'],
        valid_children: ['VEVENT'],
        required_children: []
    },
    VEVENT: {
        factory: VEvent,
        valid_properties: [],
        required_properties: ['DTSTAMP','UID'],
        valid_children: [],
        required_children: []
    },
    VTODO: {
        required_properties: ['DTSTAMP','UID']
    },
    VJOURNAL: {
        required_properties: ['DTSTAMP','UID']
    },
    VFREEBUSY: {
        required_properties: ['DTSTAMP','UID']
    },
    VALARM: {
        required_properties: ['ACTION','TRIGGER']
    },
    VTIMEZONE: {
        factory: VTimezone,
    }
};

var properties = exports.properties = {
    DTSTAMP: {
        type: 'DATE-TIME'
    },
    DTSTART: {
        params: ['TZID'],
        type: 'DATE-TIME'
    },
    DTEND: {
        type: 'DATE-TIME'
    },
    DURATION: {
        type: 'DURATION'
    },
    RRULE: {
        type: 'RECUR'
    },
    VERSION: { },
    PRODID: { }
};


