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

var assert = require('assert');
var util = require('util');

var CalendarObject = require('./base').CalendarObject;
var schema = require('./base').schema;

var RRule = require('./rrule').RRule;



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
        return this.getComponents('STANDARD')[0].getPropertyValue('TZOFFSETTO');

    // Right now we're only supporting a single element
    assert.equal(1, this.components['STANDARD'].length);
    assert.equal(1, this.components['DAYLIGHT'].length);

    var next_std = this.getRRule('STANDARD');
    var next_dst = this.getRRule('DAYLIGHT'); 
    if (next_std === null || next_dst === null) {
        var comp = this.getComponents('STANDARD')[0];
        return comp.getPropertyValue('TZOFFSETTO');
    }

    next_std = next_std.next(dt);
    next_dst = next_dst.next(dt);

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


schema.VTIMEZONE = {
    factory: VTimezone,
}
