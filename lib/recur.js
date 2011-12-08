// Copyright 2010 Tri Tech Computers Ltd. All Rights Reserved.
//
// NB: All calculations here happen using the UTC portion of a datetime object
//   as if it were the local time. This is done to reuse the TZ-agnostic date
//   calculations provided to us. Without this, performing date calculations
//   across local DST boundaries would yield surprising results.
//

var WKDAYS = ['SU','MO','TU','WE','TH','FR','SA'];

function to_utc_date(dt) {
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(),
        dt.getHours(), dt.getMinutes(), dt.getSeconds(), dt.getMilliseconds()));
}

function from_utc_date(dt) {
    return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(),
        dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds(), dt.getUTCMilliseconds());
}

// Return only the whole number portion of a number
function trunc(n) {
    return n < 0 ? Math.ceil(n) : Math.floor(n);
}

// These are more comfy to type...
function y(dt)   {  return dt.getUTCFullYear(); }
function m(dt)   {  return dt.getUTCMonth()+1;  }
function d(dt)   {  return dt.getUTCDate();     }
function hr(dt)  {  return dt.getUTCHours();    }
function min(dt) {  return dt.getUTCMinutes();  }
function sec(dt) {  return dt.getUTCSeconds();  }

function set_y(dt, v)   {  dt.setUTCFullYear(v); }
function set_m(dt, v)   {  dt.setUTCMonth(v-1);  }
function set_d(dt, v)   {  dt.setUTCDate(v);     }
function set_hr(dt, v)  {  dt.setUTCHours(v);    }
function set_min(dt, v) {  dt.setUTCMinutes(v);  }
function set_sec(dt, v) {  dt.setUTCSeconds(v);  }

function add_y(dt, v)   {  set_y(dt, y(dt)+v);      }
function add_m(dt, v)   {  set_m(dt, m(dt)+v);      }
function add_d(dt, v)   {  set_d(dt, d(dt)+v);      }
function add_hr(dt, v)  {  set_hr(dt, hr(dt)+v);    }
function add_min(dt, v) {  set_min(dt, min(dt)+v);  }
function add_sec(dt, v) {  set_sec(dt, sec(dt)+v);  }

// Day of week (0-6)
function wkday(dt) {  return dt.getUTCDay();  }

// Return the number of days between dt1 and dt2
function daydiff(dt1, dt2) {
    return (dt2-dt1)/(1000*60*60*24);
}

// Week of year
function wk(dt)  {  
    var jan1 = new Date(Date.UTC(y(dt), 0, 1));
    return trunc(daydiff(jan1, dt)/7);
}


var RRule = exports.RRule = function(rule) {
    this.rule = rule || {};
    for(var i in this.rule)
        this.rule[i] = RULE_PARTS[i]
                ? RULE_PARTS[i].parse(this.rule[i])
                : this.rule[i];
}

RRule.parse = function(value) {
    var parts = value.split(/=|;/);
    var rrule = {};
    for(var i=0; i<parts.length; i+=2) {
        rrule[parts[i]] = parts[i+1];
    }
    return new RRule(rrule);
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

RRule.prototype.getDates = function(until_or_count) {
}


// Return the next occurrence after dt
RRule.prototype.nextOccurs = function(start, after, end) {
    // Degenerate case; events don't occur before they start...
    if(start > after) return null;

    start = to_utc_date(start);
    after = to_utc_date(after);

    var freq = FREQ[this.rule.FREQ];
    var next = freq.next(this.rule, start, after);

    // Date is off the end of the spectrum...
    if(end !== undefined && next > to_utc_date(end))
        return null;

    return from_utc_date(next);
}

var RULE_PARTS = {
    FREQ: {
        parse: function(v) { return v; },
    },
    BYMONTH: {
        parse: function(v) { return parseInt(v,10); },
    },
    BYDAY: {  // 2TH (second thursday) -> [2,4]
        parse: function(v) {
            var m = v.match(/([+-]?\d)?(SU|MO|TU|WE|TH|FR|SA)/);
            return [parseInt(m[1],10)||0, WKDAYS.indexOf(m[2])];
        },
        format: function(v) {
            return (v[0] || '')+WKDAYS[v[1]];
        }
    }
};

var FREQ = {
    SECONDLY: {},
    MINUTELY: {},
    HOURLY: {},
    DAILY: {},
    WEEKLY: {},
    MONTHLY: {},
    YEARLY: {
        next: function(rule, start, after) {
            // Occurs every N years...
            var next = new Date(after);
            var interval = rule.INTERVAL || 1;

            var mod_year = (y(after) - y(start)) % interval;
            if(mod_year)
                // We're not in a valid year, move to the next valid year
                add_y(next, interval - mod_year);


            for(var i=0; i<2; ++i) {
                bymonth(rule.BYMONTH || m(start), next, i);
                byday(rule.BYDAY, next, i);

                // TODO: Add actual byhour/minute/second methods
                set_hr(next, hr(start));
                set_min(next, min(start));
                set_sec(next, sec(start));

                // Don't loop back again if we found a new date
                if(after.valueOf() != next.valueOf())
                    break;

                add_y(next, interval);
            }

            return next;
        }
    }
};

// Advance to the next month that satisfies the rule...
function bymonth(rule, dt) {
    if(!rule) return;
    var delta = rule-m(dt);
    add_m(dt, delta < 0 ? delta + 12 : delta);
    
    // If the month changed, move to the first of the month
    if(delta) set_d(dt, 1);
}


// Advance to the next day that satisfies the byday rule...
function byday(rule, dt) {
    if(!rule) return;
    var ord = rule[0], day = rule[1];
    if(ord > 0) {
        // First, second, third, etc...

        // Line us up with the correct day of week
        var delta = day-wkday(dt);
        add_d(dt, delta < 0 ? delta + 7 : delta);

        var delta2 = (ord - (Math.floor(d(dt)/7)+1)) * 7;
        add_d(dt, delta2);
    }
    else {
        // Last, second to last, etc...
    }

}

// BYSECOND
// BYMINUTE
// BYHOUR
// BYDAY
// BYMONTHDAY
// BYYEARDAY
// BYWEEKNO
// BYMONTH
