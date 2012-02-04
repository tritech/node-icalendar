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
exports.ParseError = parser.ParseError;


var CalendarObject = exports.CalendarObject = function(calendar, element) {
    this.calendar = calendar;
    this.element = element;
    this.components = {};
    this.properties = {};
}

// Create an element of the correct type
CalendarObject.create = function(element, calendar) {
    var factory = (schema[element] || {}).factory;
    return (factory !== undefined
             ? new factory(calendar)
             : new CalendarObject(calendar, comp));
}

// Recursively generates a clone of some calendar object
CalendarObject.prototype.clone = function() {
    var obj = CalendarObject.create(this.element, this.calendar);

    for(var prop in this.properties)
        obj.addProperty(this.properties[prop]);

    var comp = this.getComponents();
    for(var i=0; i<comp.length; ++i)
        obj.addComponent(comp[i]);

    return obj;
}

CalendarObject.prototype.addProperty = function(prop, value, parameters) {
    if(!(prop instanceof CalendarProperty))
        prop = new CalendarProperty(prop, value, parameters);
    else
        prop = prop.clone();

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

    // Create a copy of the component if it's from a different
    // calendar object to prevent changes from one place happening 
    // somewhere else as well
    if(comp.calendar && comp.calendar !== this.calendar)
        comp = comp.clone();

    this.components[comp.element] = this.components[comp.element] || [];
    this.components[comp.element].push(comp);
    comp.calendar = this.calendar;
    return comp;
}

CalendarObject.prototype.getComponents = function(type) {
    if(type === undefined) {
        var all = [];
        for(var c in this.components)
            all = all.concat(this.components[c]);

        return all;
    }

    return this.components[type] || [];
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

CalendarProperty.prototype.clone = function() {
    var obj = new CalendarProperty(this.name, this.value);
    obj.type = this.type;

    // TODO: Copy type and value instances in the case of objects, dates, arrays
    for(var param in this.parameters)
        obj.parameters[param] = this.parameters[param];

    return obj;
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
    var dtstart = this.getPropertyValue('DTSTART');
    var dtend = this.getPropertyValue('DTEND');
    var rr = this.getPropertyValue('RRULE');
    if(rr) {
        rr = new RRule(rr, dtstart, dtend);
        var next = rr.next(start);
        return (next !== null && (!end || next <= end));
    }

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

VTimezone.prototype.getRRule = function(section) {
    var comp = this.getComponents(section)[0];
    if(!comp || !comp.getPropertyValue('RRULE'))
        return null;

    return new RRule(comp.getPropertyValue('RRULE'),
        comp.getPropertyValue('DTSTART'),
        comp.getPropertyValue('DTEND'));
}

// Find the UTC offset for this timezone for a given date, which can
// be supplied as a Date object or an array of date components.
//
// NB: Supplying the parameter as a Date object can lead to problems, as there
//     is no way to represent 0200 on the day DST comes into effect.
VTimezone.prototype.getOffsetForDate = function(dt) {
    if(!this.getComponents('DAYLIGHT').length)
        return this.getComponents('STANDARD').getPropertyValue('TZOFFSETTO');

    // Right now we're only supporting a single element
    assert.equal(1, this.components['STANDARD'].length);
    assert.equal(1, this.components['DAYLIGHT'].length);

    var next_std = this.getRRule('STANDARD').next(dt);
    var next_dst = this.getRRule('DAYLIGHT').next(dt);

    // TODO: Using prevOccurs would be a better solution
    // If the NEXT DST/STD crossover after `dt` is DST,
    //   then `dt` must be in STD and vice-versa
    return this.getComponents(next_dst < next_std ? 'STANDARD' : 'DAYLIGHT')[0]
            .getPropertyValue('TZOFFSETTO');
}

// Convert a parsed date in localtime to a UTC date object
VTimezone.prototype.fromLocalTime = function(dtarray) {
    var hrs = this.getOffsetForDate(dtarray);
    var min = hrs % 100;
    hrs = (hrs-min) / 100;

    return new Date(Date.UTC(dtarray[0], dtarray[1]-1, dtarray[2],
                    dtarray[3]-hrs, dtarray[4]-min, dtarray[5]));
}


// iCalendar schema, required prop
var schema = exports.schema = {
    VCALENDAR: {
        factory: iCalendar,
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


