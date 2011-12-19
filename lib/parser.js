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

var ics = require('./icalendar');

var format_value = exports.format_value = types.format_value;

var ParseError = exports.ParseError = function() {
    Error.apply(this, arguments);
}
util.inherits(ParseError, Error);



function expect(expect_element, expect_value, next_state) {
    // Return a function that expects a certain element and value
    return function(element, value, parameters) {
        if(element != expect_element)
            throw ParseError("Expected "+expect_element+" got "+element);

        if(expect_value && expect_value != value)
            throw ParseError("Expected "+expect_value+" got "+value);
       
        return next_state;
    }
}

function parse_component(component, next_state) {
    // Parse an icalendar object
    var cal = component.calendar;
    return function this_state(element, value, parameters) {
        if(element == 'BEGIN') {
            var factory = (ics.schema[value] || {}).factory;
            var child = factory !== undefined
                    ? new factory(cal)
                    : new ics.CalendarObject(cal, value);

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
            value = ics.parse_value((ics.properties[element] || {}).type,
                value, parameters, cal);
            component.addProperty(element, value, parameters);
            return this_state;
        }
    }
}


exports.parse_calendar = function(data) {
    data = data.split(/\r?\n/);
    var calendar = new ics.iCalendar(true);
    var state = expect("BEGIN", "VCALENDAR", parse_component(calendar));

    for(var i=0; i<data.length-1; ++i) {
        if(!data[i].length)
            continue;

        // Peek ahead to find line continuations...
        var j = i;
        while(j+1<data.length && data[j+1][0] == ' ')
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
            throw ParseError("Mismatched BEGIN/END tags");

        state = state(propname, element[2], parameters);
    }

    if(state !== undefined)
        throw ParseError("Unable to parse calendar data; END:VCALENDAR not found!");

    return calendar;
}
