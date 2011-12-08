// Copyright 2010 Tri Tech Computers Ltd. All Rights Reserved.
// 
// Implement RFC5545 (iCalendar)
// see: http://tools.ietf.org/html/rfc5545
//
//

var RRule = require('./recur').RRule;

function pad(n,d) {
    d = d || 2;
    neg = n < 0;
    if(neg) n *= -1;
    n = n.toString();

    var zeroes = '000000000000000000';
    return (neg ? '-' : '')+zeroes.substr(0,d-n.length)+n;
}

var _types = {
    'BINARY': {
        format: function(value) {
            var base64 = require('base64');
            return base64.encode(value);
        },
        parse: function(value) {
            var base64 = require('base64');
            return base64.decode(value);
        }
    },
    'BOOLEAN': {
        format: function(value) {
            return value ? "TRUE" : "FALSE";
        },
        parse: function(value) {
            return value.toUpperCase() == "TRUE";
        }
    },
    'CAL-ADDRESS': {
        format: function(value) { return value.toString(); }
    },
    'DATE': {
        format: function(value) {
            return value.getFullYear()
                    +pad(value.getMonth()+1)
                    +pad(value.getDate());
        },
        parse: function(value) {
            return new Date(
                        parseInt(value.substr(0,4), 10),
                        parseInt(value.substr(4,2), 10)-1,
                        parseInt(value.substr(6,2), 10), 0,0,0);
        }
    },
    'DATE-TIME': {
        // YYYYMMDDTHHMMSS
        //  TODO: Support UTC and TZ values
        format: function(value) {
            return format_value('DATE', value)+'T'+format_value('TIME', value);
        },
        parse: function(value, parameters, calendar) {
            var tz = parameters['TZID'];
            var d = [parseInt(value.substr(0,4), 10),
                         parseInt(value.substr(4,2), 10),
                         parseInt(value.substr(6,2), 10),
                         parseInt(value.substr(9,2), 10),
                         parseInt(value.substr(11,2), 10),
                         parseInt(value.substr(13,2), 10)];

            if(tz !== undefined) {
                tz = calendar.timezone(tz);
                return tz.fromLocalTime(d);
            }

            return new Date(d[0], d[1]-1, d[2], d[3], d[4], d[5]);
        }
    },
    'DURATION': {
        format: function(value) {
            // Duration values from JS should be an integer number of seconds
            var neg = value < 0;
            if(neg) value *= -1;

            var w = Math.floor(value/(60*60*24*7)); value -= w*60*60*24*7;
            var d = Math.floor(value/(60*60*24));   value -= d*60*60*24;
            var h = Math.floor(value/(60*60));      value -= h*60*60;
            var m = Math.floor(value/60);           value -= m*60;
            var s = value;

            var dur = ['P'];
            if(neg) dur.push('-');
            if(w) dur.push(w+'W');
            if(d) dur.push(d+'D');
            if((h||m||s)) dur.push('T');
            if(h) dur.push(h+'H');
            if(m) dur.push(m+'M');
            if(s) dur.push(s+'S');
            return dur.join('');
        }
    },
    'FLOAT': {
        format: function(value) { return value.toString(); },
    },
    'INTEGER': {
        format: function(value) { return value.toString(); },
    },
    'PERIOD': {
        format: function(value) {
            var start = format_value('DATE-TIME', value[0]);
            var end = format_value(value[1] instanceof Date ? 'DATE-TIME' : 'DURATION', value[1]);
            return start+'/'+end;
        }
    },
    'RECUR': {
        format: function(value) {
            return (value instanceof RRule ? value : new RRule(value)).toString();
        },
        parse: function(value) { return RRule.parse(value); }
    },
    'TEXT': {
        format: function(value) {
            return value.toString().replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
        }
    },
    'TIME': {
        format: function(value) {
            // TODO: Right now we always use pure local time
            //   That means the timezone is ignored and times are always local
            return pad(value.getHours())
                    +pad(value.getMinutes())
                    +pad(value.getSeconds());
        },
        parse: function(value) {
            return new Date(0,0,0,
                        parseInt(value.substr(0, 2), 10),
                        parseInt(value.substr(2, 2), 10),
                        parseInt(value.substr(4, 2), 10));
        }
    },
    'URI': {
        format: function(value) { return value.toString(); },
    },
    'UTC-OFFSET': {
        format: function(value) {
            var west = value < 0;
            if(west) value *= -1;
            return (west ? '-' : '+')+pad(value, 4);
        }
    }
};


var format_value = exports.format_value = function(type, value) {
    if(value === undefined)
        return '';

    var fmt = _types[type || 'TEXT'];
    if(fmt === undefined)
        throw Error("Invalid iCalendar datatype: "+type);

    return fmt.format(value);
}

var parse_value = exports.parse_value = function(type, value, parameters, calendar) {
    var fmt = _types[type || 'TEXT'];
    if(fmt === undefined)
        throw Error("Invalid iCalendar datatype: "+type);

    return fmt.parse ? fmt.parse(value, parameters || {}, calendar) : value;
}
