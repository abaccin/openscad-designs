// Round six-to-one cord coupler with a knot cover. Dimensions are millimeters.
// Prototype only: not a certified blind-cord breakaway safety connector.

include <../../include/BOSL2/std.scad>
include <../../include/BOSL2/threading.scad>

/* [Output] */
part = "all"; // [all, body, cover]
layout = "print"; // [print, assembled]
print_gap = 4;

/* [Cords] */
thin_cord_diameter = 1;
pull_cord_diameter = 3;
// Added to each cord diameter, not to its radius.
hole_clearance = 0.4;

/* [Round body] */
// Finished outside diameter of both the flange and the cover.
coupler_diameter = 15;
floor_thickness = 3;
// Pitch-circle diameter for the six equally spaced thin-cord holes.
hole_circle_diameter = 8.2;
mouth_chamfer = 0.2;
// Raises the large knot above the six small knots to reduce crowding.
central_seat_height = 3;

/* [Knot cover] */
cover_height = 11.5;
cover_top_thickness = 1.5;
cavity_diameter = 10.8;

/* [Threaded cover fit] */
thread_diameter = 13;
thread_length = 3.6;
thread_pitch = 1.2;
thread_depth = 0.25;
// Radial clearance per side; enlarges the female thread only.
thread_clearance = 0.15;
thread_axial_clearance = 0.2;
minimum_wall = 0.8;

/* [Resolution] */
radial_segments = 64; // [48:16:128]

/* [Hidden] */
epsilon = 0.01;
$fn = radial_segments;

thin_hole_diameter = thin_cord_diameter + hole_clearance;
pull_hole_diameter = pull_cord_diameter + hole_clearance;
thin_mouth_radius = thin_hole_diameter / 2 + mouth_chamfer;
pull_mouth_radius = pull_hole_diameter / 2 + mouth_chamfer;
central_seat_radius = pull_mouth_radius + minimum_wall;
knot_chamber_height = cover_height - cover_top_thickness;
thin_centers = [for (angle = [0:60:300])
    hole_circle_diameter / 2 * [cos(angle), sin(angle)]];

function female_mask_radius() =
    thread_diameter / 2 / cos(180 / radial_segments) + thread_clearance;

module validate_coupler() {
    assert(part == "all" || part == "body" || part == "cover",
        "Part must be all, body, or cover.");
    assert(layout == "print" || layout == "assembled",
        "Layout must be print or assembled.");
    assert(print_gap > 0, "Print gap must be positive.");
    assert(coupler_diameter > 0 && floor_thickness > 0,
        "Coupler diameter and floor thickness must be positive.");
    assert(thin_cord_diameter > 0 && pull_cord_diameter > 0,
        "Both cord diameters must be positive.");
    assert(hole_clearance >= 0, "Hole clearance must be nonnegative.");
    assert(hole_circle_diameter > 0, "Hole circle diameter must be positive.");
    assert(mouth_chamfer >= 0 && 2 * mouth_chamfer < floor_thickness,
        "Mouth chamfer must be nonnegative and leave a straight bore section.");
    assert(minimum_wall > 0, "Minimum wall must be positive.");
    assert(radial_segments >= 48 && radial_segments % 4 == 0,
        "Radial segments must be a multiple of four and at least 48.");
    assert(cover_height > 0 && cover_top_thickness >= minimum_wall,
        "Cover height must be positive and its closed top must retain minimum_wall.");
    assert(central_seat_height >= 0 && central_seat_height < knot_chamber_height,
        "Central seat height must be nonnegative and below the cover ceiling.");
    assert(thread_diameter > 0 && thread_length > 0 && thread_pitch > 0 && thread_depth > 0,
        "Thread diameter, length, pitch, and depth must be positive.");
    assert(thread_clearance >= 0 && thread_axial_clearance >= 0,
        "Thread clearances must be nonnegative.");
    assert(thread_depth < thread_pitch / 2,
        "Thread depth must be less than half the pitch to retain flat crests.");
    assert(thread_length >= 2 * thread_pitch,
        "Thread length must accommodate at least two full pitches.");
    assert(thread_length + thread_axial_clearance < knot_chamber_height,
        "Thread socket must end below the knot chamber ceiling.");
    assert(cavity_diameter > 0
        && thread_diameter / 2 - thread_depth - cavity_diameter / 2 >= minimum_wall,
        "Male thread roots must retain minimum_wall around the knot cavity.");
    assert(coupler_diameter / 2 - female_mask_radius() >= minimum_wall,
        "Cover must retain minimum_wall outside the female thread.");
    assert(cavity_diameter / 2 >= hole_circle_diameter / 2 + thin_mouth_radius,
        "All six thin-hole mouths must open inside the knot cavity.");
    assert(hole_circle_diameter / 2 - thin_mouth_radius - pull_mouth_radius >= minimum_wall,
        "Thin holes must leave minimum_wall around the central pull hole.");
    assert(hole_circle_diameter / 2 - 2 * thin_mouth_radius >= minimum_wall,
        "Adjacent thin holes must retain minimum_wall between their mouths.");
    assert(central_seat_height == 0
        || hole_circle_diameter / 2 - thin_mouth_radius > central_seat_radius,
        "Raised central seat must not cover the six thin-hole mouths.");
    children();
}

module connection_thread(internal = false) {
    // Match the bundled library's internal phase and per-side clearance.
    $slop = internal ? thread_clearance / 2 : 0;
    trapezoidal_threaded_rod(
        d = thread_diameter, l = thread_length, pitch = thread_pitch,
        thread_depth = thread_depth, thread_angle = 90,
        internal = internal, spin = internal ? 180 : 0,
        anchor = BOTTOM, blunt_start = true, bevel1 = false, bevel2 = false
    );
}

module cord_hole(diameter, height) {
    radius = diameter / 2;
    translate([0, 0, -epsilon])
        cylinder(d = diameter, h = height + 2 * epsilon);

    if (mouth_chamfer > 0) {
        translate([0, 0, -epsilon])
            cylinder(
                r1 = radius + mouth_chamfer + epsilon,
                r2 = radius,
                h = mouth_chamfer + epsilon
            );
        translate([0, 0, height - mouth_chamfer])
            cylinder(
                r1 = radius,
                r2 = radius + mouth_chamfer + epsilon,
                h = mouth_chamfer + epsilon
            );
    }
}

module body() {
    validate_coupler()
    difference() {
        union() {
            difference() {
                union() {
                    cylinder(d = coupler_diameter, h = floor_thickness);
                    cylinder(d = thread_diameter - 2 * thread_depth,
                        h = floor_thickness + epsilon);
                    translate([0, 0, floor_thickness])
                        connection_thread();
                }
                translate([0, 0, floor_thickness])
                    cylinder(d = cavity_diameter, h = thread_length + epsilon);
            }
            if (central_seat_height > 0)
                translate([0, 0, floor_thickness - epsilon])
                    cylinder(r = central_seat_radius, h = central_seat_height + epsilon);
        }
        for (center = thin_centers)
            translate([center[0], center[1], 0])
                cord_hole(thin_hole_diameter, floor_thickness);
        cord_hole(pull_hole_diameter, floor_thickness + central_seat_height);
    }
}

// Native cover coordinates have the open end at Z=0.
module cover() {
    validate_coupler()
    difference() {
        cylinder(d = coupler_diameter, h = cover_height);
        connection_thread(internal = true);
        translate([0, 0, -epsilon])
            cylinder(r = female_mask_radius(), h = 2 * epsilon);
        translate([0, 0, thread_length - epsilon])
            cylinder(r = female_mask_radius(), h = thread_axial_clearance + 2 * epsilon);
        translate([0, 0, -epsilon])
            cylinder(d = cavity_diameter, h = knot_chamber_height + epsilon);
    }
}

module positioned_cover() {
    if (layout == "print")
        translate([0, 0, cover_height])
            rotate([180, 0, 0])
                cover();
    else
        translate([0, 0, floor_thickness])
            cover();
}

validate_coupler() {
    if (part == "body")
        body();
    else if (part == "cover")
        positioned_cover();
    else {
        body();
        translate([layout == "print" ? coupler_diameter + print_gap : 0, 0, 0])
            positioned_cover();
    }
}
