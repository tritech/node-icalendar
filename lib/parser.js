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

PROP_NAME = 0;
PARAM_NAME = 1;
PARAM_VALUE = 2;
MAYBE_QUOTED_PARAM = 3;
QUOTED_PARAM_VALUE = 4;
PARAM_OR_VALUE = 5;
PROP_VALUE = 6;

function parse_record(rec) {
    var propname;
    var params = {};
    var state = PROP_NAME;
    var lastpos = 0;

    var current_param;

    // Switch state and bookmark the current position
    function newstate(s) {
        state = s;
        lastpos = i+1;
    }
    
    // Return the accumulated string since the last state change
    function str() {
        return rec.substr(lastpos, i - lastpos);
    }

    var i=0, j=rec.length;
    for(; i<j; ++i) {
        var ch = rec[i];
        switch(state) {
        case PROP_NAME:
            if(ch == ':' || ch == ';') {
                propname = str();
                state = PARAM_OR_VALUE;
                --i; // Re-evaluate
            }
            break;

        case PARAM_OR_VALUE:
            if(ch == ':')
                newstate(PROP_VALUE);
            else if(ch == ';')
                newstate(PARAM_NAME);
            else
                throw new Error("Parse error");
            break;

        case PARAM_NAME:
            if(ch == '=') {
                current_param = str();
                newstate(MAYBE_QUOTED_PARAM);
            }
            break;

        case MAYBE_QUOTED_PARAM:
            if(ch == '"')
                newstate(QUOTED_PARAM_VALUE);
            else
                state = PARAM_VALUE;

            break;

        case PARAM_VALUE:
            if(ch == ':' || ch == ';') {
                params[current_param] = str();
                state = PARAM_OR_VALUE;
                --i; // Re-evaluate
            }
            break;

        case QUOTED_PARAM_VALUE:
            if(ch == '"') {
                params[current_param] = str();
                state = PARAM_OR_VALUE;
            }
            break;

        case PROP_VALUE:
            // Done...
            i=j;
            break;

        default:
            throw new Error("Invalid parser state");
        }
    }

    return [ propname, str(), params ];
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
            
        if(state === undefined)
            throw new ParseError("Mismatched BEGIN/END tags");

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

        state = state.apply(null, parse_record(record));
    }

    if(state !== undefined)
        throw new ParseError("Unable to parse calendar data; END:VCALENDAR not found!");

    return calendar;
}
