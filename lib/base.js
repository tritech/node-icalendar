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

var format_value = require('./types').format_value;

var schema = exports.schema = { };

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



// Maximum number of octets in a single iCalendar line
var MAX_LINE = 75;



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
             : new CalendarObject(calendar, element));
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
        var ical = new (require('./icalendar').iCalendar)();
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

CalendarProperty.prototype.setParameter = function(param, value) {
    this.parameters[param] = value;
}

CalendarProperty.prototype.format = function() {
    var data = new Buffer(this.name+':'+format_value(this.type, this.value, this.parameters));
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
