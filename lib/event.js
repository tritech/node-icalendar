"use strict";
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

var util = require('util');

var CalendarObject = require('./base').CalendarObject;
var schema = require('./base').schema;

var iCalendar = require('./icalendar').iCalendar;

var RRule = require('./rrule').RRule;



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

VEvent.prototype.rrule = function() {
    var rr = this.getPropertyValue('RRULE');
    if(!rr) return null;

    var exceptions = [];
    var ex, i=0;
    while(ex = this.getPropertyValue('EXDATE', i++))
        exceptions.push.apply(exceptions, ex);

    return new RRule(rr, {
        DTSTART: this.getPropertyValue('DTSTART'),
        DTEND: this.getPropertyValue('DTEND'),
        EXDATE: exceptions
    });
}

VEvent.prototype.inTimeRange = function(start, end) {
    var rr = this.rrule();
    if(rr) {
        var next = rr.next(start);
        return (next !== null && (!end || next <= end));
    }

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


schema.VEVENT = {
    factory: VEvent,
    valid_properties: [],
    required_properties: ['DTSTAMP','UID'],
    valid_children: [],
    required_children: []
};
