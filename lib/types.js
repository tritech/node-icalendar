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

var RRule = require('./rrule').RRule;

function pad(n,d) {
    d = d || 2;
    var neg = n < 0;
    if(neg) n *= -1;
    n = n.toString();

    var zeroes = '000000000000000000';
    return (neg ? '-' : '')+zeroes.substr(0,d-n.length)+n;
}

var _types = {
    'BINARY': {
        format: function(value) {
            return value.toString('base64');
        },
        parse: function(value) {
            return new Buffer(value, 'base64');
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
            if(!(value instanceof Date))
                value = new Date(value);

            return value.getFullYear()
                    +pad(value.getMonth()+1)
                    +pad(value.getDate());
        },
        parse: function(value) {
            var dt = new Date(
                        parseInt(value.substr(0,4), 10),
                        parseInt(value.substr(4,2), 10)-1,
                        parseInt(value.substr(6,2), 10), 0,0,0);
            dt.date_only = true;
            return dt;
        }
    },
    'DATE-TIME': {
        // YYYYMMDDTHHMMSS
        //  TODO: Support local time with TZID values
        format: function(value, parameters) {
            if(!(value instanceof Date))
                value = new Date(value);

            if(value.date_only || parameters['VALUE'] === 'DATE')
                return format_value('DATE', value);

            return value.getUTCFullYear()
                    +pad(value.getUTCMonth()+1)
                    +pad(value.getUTCDate())
                    +'T'+format_value('TIME', value);
        },
        parse: function(value, parameters, calendar) {
            if(parameters['VALUE'] === 'DATE' || value.length <= 8)
                return _types['DATE'].parse(value);

            var tz = parameters['TZID'];
            var d = [parseInt(value.substr(0,4), 10),
                         parseInt(value.substr(4,2), 10),
                         parseInt(value.substr(6,2), 10),
                         parseInt(value.substr(9,2), 10),
                         parseInt(value.substr(11,2), 10),
                         parseInt(value.substr(13,2), 10)];
            var utc = value.length > 15 ? value[15] === 'Z' : false;

            if(tz !== undefined) {
                var tzobj = calendar.timezone(tz);
                if(!tzobj)
                    throw new Error("Unable to load TZ data for "+tz);
                return tzobj.fromLocalTime(d);
            }

            // Adjust month to make JS date happy...
            d[1] -= 1;

            if(utc)
                return new Date(Date.UTC.apply(null, d));
            else
                return new Date(d[0], d[1], d[2], d[3], d[4], d[5]);
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
            if(neg) dur.unshift('-');
            if(w) dur.push(w+'W');
            if(d) dur.push(d+'D');
            if((h||m||s)) dur.push('T');
            if(h) dur.push(h+'H');
            if(m) dur.push(m+'M');
            if(s) dur.push(s+'S');
            return dur.join('');
        },
        parse: function(value) {
            var match = /(-)?P(\d+W)?(\d+D)?(?:T(\d+H)?(\d+M)?(\d+S)?)?/.exec(value).slice(1);
            var mul = [ -1, 60*60*24*7, 60*60*24, 60*60, 60, 1 ];
            var dur = 0;

            for(var i=1; i < match.length; ++i) {
                if(match[i] !== undefined) dur += parseInt(match[i], 10) * mul[i];
            }

            if(match[0] !== undefined) dur *= mul[0];

            return dur;
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
        },
        parse: function(value) {
            return value.replace(/\\([\\,;])/g, "$1")
                        .replace(/\\[nN]/g, '\n');
        }
    },
    'TIME': {
        format: function(value) {
            if(!(value instanceof Date))
                value = new Date(value);

            return pad(value.getUTCHours())
                    +pad(value.getUTCMinutes())
                    +pad(value.getUTCSeconds())
                    +'Z';
        },
        parse: function(value) {
            var utc = value.length > 6 ? value[6] === 'Z' : false;
            if(utc)
                return new Date(Date.UTC(0,0,0,
                        parseInt(value.substr(0, 2), 10),
                        parseInt(value.substr(2, 2), 10),
                        parseInt(value.substr(4, 2), 10)));
            else
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


var format_value = exports.format_value = function(type, value, parameters) {
    if(value === undefined)
        return '';

    var fmt = _types[type || 'TEXT'];
    if(fmt === undefined)
        throw Error("Invalid iCalendar datatype: "+type);

    // PERIOD is a corner case here; it's an array of two values
    if(Array.isArray(value) && type !== 'PERIOD'
            || type === 'PERIOD' && value[0] && Array.isArray(value[0]))
        return value.map(function(v) { return fmt.format(v, parameters || {}); }).join(',');
    else
        return fmt.format(value, parameters || {});
}

var parse_value = exports.parse_value = function(type, value, parameters, calendar, expect_list) {
    if(expect_list)
        return value.split(',').map(function(x) { return parse_value(type, x, parameters, calendar); });

    var fmt = _types[type || 'TEXT'];
    if(fmt === undefined)
        throw Error("Invalid iCalendar datatype: "+type);

    return fmt.parse ? fmt.parse(value, parameters || {}, calendar) : value;
}
