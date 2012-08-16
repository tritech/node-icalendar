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
// NB: All calculations here happen using the UTC portion of a datetime object
//   as if it were the local time. This is done to reuse the TZ-agnostic date
//   calculations provided to us. Without this, performing date calculations
//   across local DST boundaries would yield surprising results.
//


var types = require('./types');

var SUPPORTED_PARTS = ['FREQ','INTERVAL','COUNT','UNTIL','BYDAY','BYMONTH','BYMONTHDAY'];
var WKDAYS = ['SU','MO','TU','WE','TH','FR','SA'];

function to_utc_date(dt) {
    if(Array.isArray(dt)) {
        dt = dt.slice(0); // Make a copy...
        dt[1]--; // Fixup month for Date.UTC()
    }
    else
        dt = [dt.getFullYear(), dt.getMonth(), dt.getDate(),
        dt.getHours(), dt.getMinutes(), dt.getSeconds(), dt.getMilliseconds()];

    return new Date(Date.UTC.apply(null, dt));
    //udt.date_only = dt.date_only;
    return udt;
}

function from_utc_date(udt) {
    var dt = new Date(udt.getUTCFullYear(), udt.getUTCMonth(), udt.getUTCDate(),
        udt.getUTCHours(), udt.getUTCMinutes(), udt.getUTCSeconds(), udt.getUTCMilliseconds());
    //dt.date_only = udt.date_only;
    return dt;
}

// Return only the whole number portion of a number
function trunc(n) {
    return n < 0 ? Math.ceil(n) : Math.floor(n);
}

// These are more comfy to type...
function y(dt)   {  return dt.getUTCFullYear();     }
function m(dt)   {  return dt.getUTCMonth()+1;      }
function d(dt)   {  return dt.getUTCDate();         }
function hr(dt)  {  return dt.getUTCHours();        }
function min(dt) {  return dt.getUTCMinutes();      }
function sec(dt) {  return dt.getUTCSeconds();      }
function ms(dt)  {  return dt.getUTCMilliseconds(); }

function set_y(dt, v)   {  dt.setUTCFullYear(v);     return dt;  }
function set_m(dt, v)   {  dt.setUTCMonth(v-1);      return dt;  }
function set_d(dt, v)   {  dt.setUTCDate(v);         return dt;  }
function set_hr(dt, v)  {  dt.setUTCHours(v);        return dt;  }
function set_min(dt, v) {  dt.setUTCMinutes(v);      return dt;  }
function set_sec(dt, v) {  dt.setUTCSeconds(v);      return dt;  }
function set_ms(dt, v)  {  dt.setUTCMilliseconds(v); return dt;  }

function add_y(dt, v)   {  return set_y(dt, y(dt)+v);      }
function add_m(dt, v)   {  return set_m(dt, m(dt)+v);      }
function add_d(dt, v)   {  return set_d(dt, d(dt)+v);      }
function add_hr(dt, v)  {  return set_hr(dt, hr(dt)+v);    }
function add_min(dt, v) {  return set_min(dt, min(dt)+v);  }
function add_sec(dt, v) {  return set_sec(dt, sec(dt)+v);  }

// First of the month
function fst(dt)    {
    return new Date(y(dt), m(dt)-1, 1);
}

// Day of week (0-6), adjust for the start of week
function wkday(dt) {
    return dt.getUTCDay();
}

// Return the number of days between dt1 and dt2
function daydiff(dt1, dt2) {
    return (dt2-dt1)/(1000*60*60*24);
}

// Week of year
function wk(dt)  {  
    var jan1 = new Date(Date.UTC(y(dt), 0, 1));
    return trunc(daydiff(jan1, dt)/7);
}

// Week of month
function m_wk(dt, wkst) {
    return (0 | d(dt)/7) + (d(dt) % 7 === 0 ? 0 : 1);
}


var RRule = exports.RRule = function(rule, options, dtend) {
    if(options instanceof Date)
        options = { DTSTART: options, DTEND: dtend };

    options = options || {};
    this.start = options.DTSTART ? to_utc_date(options.DTSTART) : null;
    this.end = options.DTEND ? to_utc_date(options.DTEND) : null;

    this.exceptions = options.EXDATE || [];

    if(typeof rule === 'string')
        rule = RRule.parse(rule);

    this.rule = {};
    for(var i in (rule||{})) {
        if(SUPPORTED_PARTS.indexOf(i) == -1)
            throw new Error(i+" is not currently supported!");

        this.rule[i] = RULE_PARTS[i]
                ? RULE_PARTS[i].parse(rule[i])
                : rule[i];
    }
}

RRule.parse = function(value) {
    var parts = value.split(/=|;/);
    var rrule = {};
    for(var i=0; i<parts.length; i+=2) {
        rrule[parts[i]] = parts[i+1];
    }
    return rrule;
}

RRule.prototype.setFrequency = function(freq) {
    this.rule.FREQ = freq;
}

RRule.prototype.valueOf = function() { return this.rule; }

RRule.prototype.toString = function() {
    // FREQ comes first, as per spec
    var out = [ 'FREQ='+this.rule.FREQ ];
    for(var k in this.rule) {
        if(k=='FREQ') continue;

        out.push(k+'='+((RULE_PARTS[k] || {}).format
                ? RULE_PARTS[k].format(this.rule[k])
                : this.rule[k]));
    }
    return out.join(';');
}

// Return the next occurrence after dt
RRule.prototype.next = function(after) {
    after = after && to_utc_date(after);

    // Events don't occur before the start or after the end...
    if(!after || after < this.start)
        after = new Date(this.start.valueOf() - 1);
    if(this.end && after > this.end) return null;

    var freq = FREQ[this.rule.FREQ];
    if(!freq)
        throw new Error(this.rule.FREQ+' recurrence is not supported');

    NextOccurs:
    while(true) {
        var next = freq.next(this.rule, this.start, after);

        // Exclude EXDATES
        var nextInLocal = from_utc_date(next);
        for(var i=0; i < this.exceptions.length; i++) {
            var exdate = this.exceptions[i];
            if((exdate.valueOf() == nextInLocal.valueOf())
                    || (exdate.date_only && y(exdate) == y(nextInLocal)
                    && m(exdate) == m(nextInLocal) && d(exdate) == d(nextInLocal))) {
                after = next;
                continue NextOccurs;
            }
        }

        break;
    }

    // Date is off the end of the spectrum...
    if(this.end && next > this.end)
        return null;

    if(this.rule.COUNT && this.count_end !== null) {
        if(this.count_end === undefined) {
            // Don't check this while we're trying to compute it...
            this.count_end = null;
            this.count_end = this.nextOccurences(this.rule.COUNT).pop();
        }

        if(next > this.count_end)
            return null;
    }

    if(this.rule.UNTIL && next > this.rule.UNTIL)
        return null;

    return from_utc_date(next);
}

RRule.prototype.nextOccurences = function(after, count_or_until) {
    if(arguments.length === 1) {
        count_or_until = after;
        after = undefined;
    }

    var arr = [];
    if(count_or_until instanceof Date) {
        while(true) {
            after = this.next(after);
            if(after && after <= count_or_until)
                arr.push(after);
            else
                break;
        }
    }
    else {
        while(count_or_until-- && after !== null) {
            after = this.next(after);
            if(after)
                arr.push(after);
        }
    }
    return arr;
}


var RULE_PARTS = {
    INTERVAL: {
        parse: function(v) { return parseInt(v,10); }
    },
    UNTIL: {
        parse: function(v) {
            if(v instanceof Date) return v;
            return types.parse_value('DATE-TIME', v);
        },
        format: function(v) { return types.format_value('DATE-TIME', v); }
    },
    FREQ: {
        parse: function(v) { return v; },
    },
    BYMONTH: {
        parse: function(v) {
            if(typeof v === 'number') return [v];

            return v.split(',').map(function(mo) {
                return parseInt(mo,10);
            });
        },
        format: function(v) {
            return v.join(',');
        }
    },
    BYDAY: {  // 2TH (second thursday) -> [2,4]
        parse: function(v) {
            var days = v.split(',').map(function(day) {
                var m = day.match(/([+-]?\d)?(SU|MO|TU|WE|TH|FR|SA)/);
                return [parseInt(m[1],10)||0, WKDAYS.indexOf(m[2])];
            });

            days.sort(function(d1, d2) {
                // Sort by week, day of week
                if(d1[0] == d2[0])
                    return d1[1] - d2[1];
                else
                    return d1[0] - d2[0];
            });

            return days;
        },
        format: function(v) {
            return v.map(function(day) {
                return (day[0] || '')+WKDAYS[day[1]];
            }).join(',');
        }
    },
    EXDATE: {
      parse: function(v) {
        return v.split(',').map(function(dt) {
          return dt.length == 8 ? types.parse_value('DATE', dt) : types.parse_value('DATE-TIME', dt);
        });
      },
      format: function(v) {
        return v.map(function(dt) {
            return types.format_value(dt.date_only ? 'DATE' : 'DATE-TIME', dt);
        }).join(',');
      }
    }
};

// These parts use the same format...
RULE_PARTS['BYMONTHDAY'] = RULE_PARTS['BYMONTH'];
RULE_PARTS['COUNT'] = RULE_PARTS['INTERVAL'];

var FREQ = {
    DAILY: {
        next: function(rule, start, after) {
            var next = new Date(after);
            set_hr(next, hr(start));
            set_min(next, min(start));
            set_sec(next, sec(start));
            set_ms(next, ms(start));

            var interval = rule.INTERVAL || 1;

            // Adjust for interval...
            var mod_days = trunc(daydiff(next, start)) % interval;
            if(mod_days)
                add_d(next, interval - mod_days);

            for(var i=0; i<2; ++i) {
                next = byday(rule.BYDAY, next, after);

                if(next.valueOf() > after.valueOf())
                    break;

                add_d(next, interval);
            }

            return next;
        }
    },
    WEEKLY: {
        next: function(rule, start, after) {
            var next = new Date(after);
            set_hr(next, hr(start));
            set_min(next, min(start));
            set_sec(next, sec(start));
            set_ms(next, ms(start));

            var interval = rule.INTERVAL || 1;

            // Adjust for interval...
            var mod_weeks = trunc(daydiff(start, next) / 7) % interval;
            if(mod_weeks)
                add_d(next, (interval - mod_weeks) * 7);

            while(true) {
                next = byday(rule.BYDAY, next, after);

                // Fall back to the start day of the week
                if (!rule.BYDAY || !rule.BYDAY.length) {
                  startDayOfWeek = wkday(start);
                  nextDayOfWeek = wkday(next);

                  // Always move backwards to the start day of week
                  if (nextDayOfWeek > startDayOfWeek)
                    add_d(next, startDayOfWeek - nextDayOfWeek);
                  else if (startDayOfWeek > nextDayOfWeek)
                    add_d(next, startDayOfWeek - nextDayOfWeek - 7);
                }


                if(next.valueOf() > after.valueOf()
                        && check_bymonth(rule.BYMONTH, next))
                    break;

                add_d(next, interval * 7);
            }

            return next;
        }
    },
    MONTHLY: {
        next: function(rule, start, after) {
            var next = new Date(after);
            set_hr(next, hr(start));
            set_min(next, min(start));
            set_sec(next, sec(start));
            set_ms(next, ms(start));

            var interval = rule.INTERVAL || 1;

            // Adjust interval to be correct
            var delta = (m(next) - m(start)) + (y(next) - y(start)) * 12;
            if(delta % interval)
                add_m(next, interval - (delta % interval));


            for(var i=0; i<2; ++i) {
                if (i) set_d(next, 1); // Start at the beginning of the month for subsequent months
                next = byday(rule.BYDAY, next, after);
                next = bymonthday(rule.BYMONTHDAY, next, after);

                // Fall back to the start day of the month
                if ((!rule.BYDAY || !rule.BYDAY.length) && (!rule.BYMONTHDAY || !rule.BYMONTHDAY.length))
                  set_d(next, d(start));

                if(next.valueOf() > after.valueOf())
                    break;

                add_m(next, interval);
            }

            return next;
        }
    },
    YEARLY: {
        next: function(rule, start, after) {
            // Occurs every N years...
            var next = new Date(after);
            // TODO: Add actual byhour/minute/second methods
            set_hr(next, hr(start));
            set_min(next, min(start));
            set_sec(next, sec(start));
            set_ms(next, ms(start));

            var interval = rule.INTERVAL || 1;

            var mod_year = (y(after) - y(start)) % interval;
            if(mod_year)
                // We're not in a valid year, move to the next valid year
                add_y(next, interval - mod_year);


            for(var i=0; i<2; ++i) {
                next = bymonth(rule.BYMONTH, next);
                next = bymonthday(rule.BYMONTHDAY, next, after);
                next = byday(rule.BYDAY, next, after);

                // Fall back the the start month and day of the month
                if (!rule.BYMONTH || !rule.BYMONTH.length)
                  set_m(next, m(start));
                if ((!rule.BYDAY || !rule.BYDAY.length) && (!rule.BYMONTHDAY || !rule.BYMONTHDAY.length))
                  set_d(next, d(start));

                // Don't loop back again if we found a new date
                if(next.valueOf() > after.valueOf())
                    break;

                set_d(set_m(add_y(next, interval), 1), 1);
            }

            return next;
        }
    }
};

function sort_dates(dateary) {
    return dateary.sort(function(dt1, dt2) {
        if(dt1 === null && dt2 === null) return 0;
        if(dt1 === null) return 1;
        if(dt2 === null) return -1;

        return dt1.valueOf() - dt2.valueOf();
    });
}

// Check that a particular date is within the limits
// designated by the BYMONTH rule
function check_bymonth(rules, dt) {
    if(!rules || !rules.length) return true;
    return rules.indexOf(m(dt)) !== -1;
}

// Advance to the next month that satisfies the rule...
function bymonth(rules, dt) {
    if(!rules || !rules.length) return dt;

    var candidates = rules.map(function(rule) {
        var delta = rule-m(dt);
        if(delta < 0) delta += 12;

        var newdt = add_m(new Date(dt), delta);
        set_d(newdt, 1);
        return newdt;
    });
    
    var newdt = sort_dates(candidates).shift();
    return newdt || dt;
}


function bymonthday(rules, dt, after) {
    if(!rules || !rules.length) return dt;

    var candidates = rules.map(function(rule) {
        var newdt = set_d(new Date(dt), rule);
        return (newdt.valueOf() <= after.valueOf() ? null : newdt);
    });

    var newdt = sort_dates(candidates).shift();
    return newdt || dt;
}


// Advance to the next day that satisfies the byday rule...
function byday(rules, dt, after) {
    if(!rules || !rules.length) return dt;

    // Generate a list of candiDATES. (HA!)
    var candidates = rules.map(function(rule) {
        // Align on the correct day of the week...
        var days = rule[1]-wkday(dt);
        if(days < 0) days += 7;
        var newdt = add_d(new Date(dt), days);

        if(rule[0] > 0) {
            var wk = 0 | ((d(newdt) - 1) / 7) + 1;
            if(wk > rule[0]) return null;

            add_d(newdt, (rule[0] - wk) * 7);
        }
        else if(rule[0] < 0) {
            // Find all the matching days in the month...
            var dt2 = new Date(newdt);
            var days = [];
            while(m(dt2) === m(newdt)) {
                days.push(d(dt2));
                add_d(dt2, 7);
            }

            // Then grab the nth from the end...
            set_d(newdt, days.reverse()[(-rule[0])-1]);
        }

        // Ignore if it's a past date...
        if (newdt.valueOf() <= after.valueOf()) return null;

        return newdt;
    });

    // Select the date occurring next...
    var newdt = sort_dates(candidates).shift();
    return newdt || dt;
}
