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
var types = require('./types');

var CalendarObject = require('./base').CalendarObject;
var schema = require('./base').schema;
var properties = require('./base').properties;

var iCalendar = require('./icalendar').iCalendar;

var parse_value = types.parse_value;
var format_value = types.format_value;



var ParseError = exports.ParseError = function() {
    Error.apply(this, arguments);
}
util.inherits(ParseError, Error);



function expect(expect_element, expect_value, next_state) {
    // Return a function that expects a certain element and value
    return function(element, value, parameters) {
        if(element != expect_element)
            throw new ParseError("Expected "+expect_element+" got "+element);

        if(expect_value && expect_value != value)
            throw new ParseError("Expected "+expect_value+" got "+value);
       
        return next_state;
    }
}

function parse_component(component, next_state) {
    // Parse an icalendar object
    var cal = component.calendar;
    return function this_state(element, value, parameters) {
        if(element == 'BEGIN') {
            var factory = (schema[value] || {}).factory;
            var child = factory !== undefined
                    ? new factory(cal)
                    : new CalendarObject(cal, value);

            return parse_component(child, function() {
                component.addComponent(child);
                // Forward this call onto our next state to process
                //  the current input record
                return this_state.apply(this, arguments);
            });
        }

        else if(element == 'END') {
            return next_state;
        }

        else {
            var prop = properties[element] || {};
            value = parse_value(prop.type, value, parameters, cal, prop.list);
            component.addProperty(element, value, parameters);
            return this_state;
        }
    }
}

// Parse iCalendar formatted data and return an iCalendar object
//
// The second argument is an optional calendar object containing VTIMEZONE
// data to aid in the correct conversion of dates
exports.parse_calendar = function(data, timezone) {
    data = data.split(/\r?\n/);
    var calendar = new iCalendar(true);
    if(timezone) {
        if(typeof timezone === 'string')
            timezone = exports.parse_calendar(timezone);

        if(timezone instanceof iCalendar) {
            var tzs = timezone.getComponents('VTIMEZONE');
            for(var i=0; i<tzs.length; ++i)
                calendar.addComponent(tzs[i]);
        }
        else
            calendar.addComponent(tzs[i]);
    }
    var state = expect("BEGIN", "VCALENDAR", parse_component(calendar));

    for(var i=0; i<data.length-1; ++i) {
        if(!data[i].length)
            continue;

        // Peek ahead to find line continuations...
        var j = i;
        while(j+1<data.length && (data[j+1][0] === ' ' || data[j+1][0] === '\t'))
            ++j;

        var record = data[i];
        if(j != i) {
            var d = data.slice(i, j+1);
            for(var k=1; k<d.length; ++k)
                // Strip out the extra space...
                d[k] = d[k].substr(1);
            record = d.join('');
            i = j;
        }

        var element = record.match(/^([^:]+):(.*)/);
        var paramlist = element[1].split(';');
        var propname = paramlist.shift();
        var parameters = {};
        for(var k=0; k<paramlist.length; ++k) {
            var pval = paramlist[k].match(/^([^=]+)=(.*)/);
            parameters[pval[1]] = pval[2];
        }

        if(state === undefined)
            throw new ParseError("Mismatched BEGIN/END tags");

        state = state(propname, element[2], parameters);
    }

    if(state !== undefined)
        throw new ParseError("Unable to parse calendar data; END:VCALENDAR not found!");

    return calendar;
}
