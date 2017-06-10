@{%
  const empty = d => null;
  const nth = i => (d => d[i]);
  const notnull = d => d != null;
  const v = i => (d => i)
%}


# Main Structure
program ->
  line (nl line {% nth(1) %}):* {% d => [d[0]].concat(d[1]).filter(notnull) %}

line ->
    _ command eol       {% nth(1) %}
  | _ section eol       {% d => ({node: 'section', name: d[1]}) %}
  | _ label eol         {% d => ({node: 'label', name: d[1]}) %}
  | eol                 {% empty %}


command ->
    "ramp" __ float sep integer          {% ([,,time,,amount]) => ({node: 'ramp', time: time, steps: amount}) %}
  | "wait" __ float                      {% ([,,time]) => ({node: 'ramp', time: time, steps: 0}) %}
  | "branch" __ integer sep labelname    {% d => ({node: 'branch', count: d[2], target: d[4]}) %}
  | "set_pwm" __ integer                 {% ([,,value]) => ({node: 'pwm', value: value}) %}
  | "start"                              {% d => ({node: 'start'}) %}
  | "trigger" __ waittarget              {% d=> ({node: 'trigger', send: 0, wait: d[2]}) %}
  | "trigger" __ sendtarget
                (sep waittarget          {% nth(1) %}
                ):?                      {% d => ({node: 'trigger', send: d[2] ? d[2] : 0, wait: d[3] ? d[3] : 0})%}
  | "end" (__ interruptsignal
            (sep interruptsignal         {% nth(1) %}
            ):?                          {% d => {const s = [d[1], d[2]]; return {reset: s.includes('r'), int: s.includes('i')}}%}
          ):?                            {% d => (Object.assign({node: 'end', reset: false, int: false}, d[1])) %}

# Line Fragments
sep         -> _ "," _            {% empty %}
eol         -> _ comment:?        {% empty %}
comment     -> "#" [^\r\n]:*      {% empty %}
label       -> labelname ":"      {% id %}
labelname   -> [._a-zA-Z0-9]:+    {% d => d[0].join('') %}

# Literals
interruptsignal ->
    [rR] {% v("r") %}
  | [iI] {% v("i") %}

sendtarget ->
  [sS] target {% nth(1) %}

waittarget -> 
  [wW] target {% nth(1) %}

target ->
    "1"   {% v(0b001) %}
  | "2"   {% v(0b010) %}
  | "3"   {% v(0b100) %}
  | "12"  {% v(0b011) %}
  | "13"  {% v(0b101) %}
  | "23"  {% v(0b110) %}
  | "123" {% v(0b111) %}
  
section ->
    ".ENGINE1" {% v("engine1") %}
  | ".ENGINE2" {% v("engine2") %}
  | ".ENGINE3" {% v("engine3") %}

# Numbers
integer     -> [0-9]:+              {% d => parseInt(d[0].join("")) %}
float       -> integer mantissa:?   {% d => d[0] + d[1] %}
mantissa    -> "." [0-9]:*          {% d => parseFloat("0"+d.join('')) %}

# Whitespace
__  -> ws:+         {% empty %}
_   -> ws:*         {% empty %}
ws  -> [ \t]        {% empty %}
nl  -> "\r":? "\n"  {% empty %}
