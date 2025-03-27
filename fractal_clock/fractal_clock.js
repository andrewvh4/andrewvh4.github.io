const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

//Global Constants
HOUR_UNIT_LEN = 0.5
MINUTE_UNIT_LEN = 1
SECOND_UNIT_LEN = 1

RECURSION_SCALE = 0.5

DRAW_CLOCK = true;
DRAW_BRANCHES = false;
BASE_SIZE=200;
RECURSION_LIM = 13;

HAND_COLOR = "white";

log_str = '';
function log(str){
    log_str += str + '\n';
}

function hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function set_color(){
    const h = 0.5+0.5*Math.cos(11*now / 100000); // Hue (0-1)
    const s = 0.75+0.25*Math.cos(3*now / 100000); // Hue (0-1);   // Saturation (0-1)
    const v = 0.75+0.25*Math.cos(7*now / 100000);;   // Value (0-1)

    const rgb = hsvToRgb(h, s, v);
    ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function scaleClock(clock, scale){
    function scalePoint(point, scale){
        return {x: point.x * scale, y: point.y * scale, n: point.n};
    }
    return {h: scalePoint(clock.h, scale),
            m: scalePoint(clock.m, scale),
            s: scalePoint(clock.s, scale)};
}

function rotateClock(clock, rotation){
    function rotatePoint(point, rotation){
        return {x: point.x * Math.cos(rotation) - point.y * Math.sin(rotation),
                y: point.x * Math.sin(rotation) + point.y * Math.cos(rotation),
                n: point.n + rotation};
    }
    return {h: rotatePoint(clock.h, rotation),
            m: rotatePoint(clock.m, rotation),
            s: rotatePoint(clock.s, rotation)};
}


function drawClock(origin, clock){
    // Draw the paths of the clock
    // Note the x and y is swaped here since we need to translate from the unit circle representation
    // H
    ctx.moveTo(clock.h.y + origin.x, -clock.h.x + origin.y);
    ctx.lineTo(origin.x, origin.y);

    // M
    ctx.lineTo(clock.m.y + origin.x, -clock.m.x + origin.y);

    // S
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(clock.s.y + origin.x, -clock.s.x + origin.y);
}

function drawLine(origin, clock){
    // Draw the s hand of the clock only
    // At small scales, the hands are too small to see anyway
    // Note the x and y is swaped here since we need to translate from the unit circle representation
    // H
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x+.1, origin.y+.1);
}

function getUnitClock(h, m, ms){
    function timeTohand(value, unit_len, base){
        // Represent clock points on the unit circle, so noon is right, 3 is down, 6 is left, 9 is up
        // This makes the math easier, we translate the points to the desired location later
        point = {x: unit_len * Math.cos(value*2*Math.PI/base), y: unit_len * Math.sin(value*2*Math.PI/base)};
        point.n = Math.atan2(point.y, point.x);
        return point;
    }

    // Get the points for all hands of the clock
    var h_point = timeTohand(h, HOUR_UNIT_LEN, 12);
    var m_point = timeTohand(m, MINUTE_UNIT_LEN, 60);
    var s_point = timeTohand(ms, SECOND_UNIT_LEN, 60000);

    return {h: h_point, m: m_point, s: s_point};
}


function drawRecursive(recursion_depth, center, rotation){
    // Draw the clock recursively
    if(recursion_depth > RECURSION_LIM){
        return
    }

    var draw_clock = rotateClock(clock_translations[recursion_depth], rotation);
    // var draw_clock = clock_translations[recursion_depth];

    if(DRAW_BRANCHES){
        // Draw the branches
        drawClock(center, draw_clock);
    }
    else if (recursion_depth == RECURSION_LIM){
        // Draw the leaves
        drawLine(center, draw_clock);
    }

    
    function drawOnHand(point){
        // Draw a smaller version of the clock on the hand of the clock
        // Scale by the current step
        // Rotate to align with the hand normal
        var new_center = {x: center.x + point.y, y: center.y - point.x};
        drawRecursive(recursion_depth+1, new_center, point.n);
    }


    // Draw clocks on all fingers
    drawOnHand(draw_clock.s);
    drawOnHand(draw_clock.m);
    drawOnHand(draw_clock.h);

    return;
}

// Precompute clock translations
function precomputeTranslations(){
    clock_translations = Array(RECURSION_LIM);
    for (var i = 0; i <= RECURSION_LIM; i++){
        clock_translations[i] = scaleClock(UNIT_CLOCK, BASE_SIZE * Math.pow(RECURSION_SCALE, i));
    }
}


function draw(){
    // Clear Canvas
    ctx.fillStyle = 'black';
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Get start time and other variables
    now = new Date();
    utc_time = now.getTime();
    timezone_offset = now.getTimezoneOffset();
    ms_time = utc_time - timezone_offset * 60 * 1000;
    final_points = []

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    CENTER = {x: canvas.width/2, y: canvas.height/2};

    

    
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    UNIT_CLOCK = getUnitClock(ms_time / (1000*60*60), ms_time / (1000*60), now);

    precomputeTranslations(UNIT_CLOCK, BASE_SIZE);

    ctx.beginPath();
    set_color();
    drawRecursive(0, CENTER, 0, BASE_SIZE);
    ctx.stroke();

    if(DRAW_CLOCK){
        // Draw the clock
        ctx.beginPath();
        ctx.strokeStyle = HAND_COLOR;
        drawClock(CENTER, clock_translations[0]);
        ctx.stroke();
    }

    //Get runtime
    var end_time = new Date();
    delta_time = end_time - now;

    //Modify recursion
    if (delta_time > 90){
        RECURSION_LIM -= 1;
    }

    //Debug Text
    ctx.fillStyle = "white";
    ctx.fillText("H:" + now.getHours().toString() + " M:" + now.getMinutes().toString() + " S:" + now.getSeconds().toString() + " m:" + now.getMilliseconds().toString(), 10, 10);
    ctx.fillText("dt: " + delta_time.toString() + "ms", 10, 20);
    ctx.fillText("Recursion: " + RECURSION_LIM.toString(), 10, 30);
    ctx.fillText(log_str, 10, 40);
    log_str = '';
}

setInterval(draw, 33);