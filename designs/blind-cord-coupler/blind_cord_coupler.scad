// Round six-to-one cord coupler with a knot cover. Dimensions are millimeters.
// Prototype only: not a certified blind-cord breakaway safety connector.

include <../../include/BOSL2/std.scad>
include <../../include/BOSL2/threading.scad>
use <../../include/assertions.scad>

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
        assertion_message("Part must be all, body, or cover.", [["part", part]]));
    assert(layout == "print" || layout == "assembled",
        assertion_message("Layout must be print or assembled.", [["layout", layout]]));
    assert(print_gap > 0, assertion_message("Print gap must be positive.", [["print_gap", print_gap]]));
    assert(coupler_diameter > 0 && floor_thickness > 0,
        assertion_message("Coupler diameter and floor thickness must be positive.",
            [["coupler_diameter", coupler_diameter], ["floor_thickness", floor_thickness]]));
    assert(thin_cord_diameter > 0 && pull_cord_diameter > 0,
        assertion_message("Both cord diameters must be positive.",
            [["thin_cord_diameter", thin_cord_diameter], ["pull_cord_diameter", pull_cord_diameter]]));
    assert(hole_clearance >= 0, assertion_message("Hole clearance must be nonnegative.", [["hole_clearance", hole_clearance]]));
    assert(hole_circle_diameter > 0,
        assertion_message("Hole circle diameter must be positive.", [["hole_circle_diameter", hole_circle_diameter]]));
    assert(mouth_chamfer >= 0 && 2 * mouth_chamfer < floor_thickness,
        assertion_message("Mouth chamfer must be nonnegative and leave a straight bore section.",
            [["mouth_chamfer", mouth_chamfer], ["floor_thickness", floor_thickness]]));
    assert(minimum_wall > 0, assertion_message("Minimum wall must be positive.", [["minimum_wall", minimum_wall]]));
    assert(radial_segments >= 48 && radial_segments % 4 == 0,
        assertion_message("Radial segments must be a multiple of four and at least 48.", [["radial_segments", radial_segments]]));
    assert(cover_height > 0 && cover_top_thickness >= minimum_wall,
        assertion_message("Cover height must be positive and its closed top must retain minimum_wall.",
            [["cover_height", cover_height], ["cover_top_thickness", cover_top_thickness], ["minimum_wall", minimum_wall]]));
    assert(central_seat_height >= 0 && central_seat_height < knot_chamber_height,
        assertion_message("Central seat height must be nonnegative and below the cover ceiling.",
            [["central_seat_height", central_seat_height], ["cover_height", cover_height],
             ["cover_top_thickness", cover_top_thickness], ["knot_chamber_height", knot_chamber_height]]));
    assert(thread_diameter > 0 && thread_length > 0 && thread_pitch > 0 && thread_depth > 0,
        assertion_message("Thread diameter, length, pitch, and depth must be positive.",
            [["thread_diameter", thread_diameter], ["thread_length", thread_length], ["thread_pitch", thread_pitch], ["thread_depth", thread_depth]]));
    assert(thread_clearance >= 0 && thread_axial_clearance >= 0,
        assertion_message("Thread clearances must be nonnegative.",
            [["thread_clearance", thread_clearance], ["thread_axial_clearance", thread_axial_clearance]]));
    assert(thread_depth < thread_pitch / 2,
        assertion_message("Thread depth must be less than half the pitch to retain flat crests.",
            [["thread_depth", thread_depth], ["thread_pitch", thread_pitch], ["maximum depth (exclusive)", thread_pitch / 2]]));
    assert(thread_length >= 2 * thread_pitch,
        assertion_message("Thread length must accommodate at least two full pitches.",
            [["thread_length", thread_length], ["thread_pitch", thread_pitch], ["minimum length", 2 * thread_pitch]]));
    assert(thread_length + thread_axial_clearance < knot_chamber_height,
        assertion_message("Thread socket must end below the knot chamber ceiling.",
            [["thread_length", thread_length], ["thread_axial_clearance", thread_axial_clearance], ["cover_height", cover_height],
             ["cover_top_thickness", cover_top_thickness], ["socket top", thread_length + thread_axial_clearance],
             ["knot_chamber_height", knot_chamber_height]]));
    assert(cavity_diameter > 0
        && thread_diameter / 2 - thread_depth - cavity_diameter / 2 >= minimum_wall,
        assertion_message("Male thread roots must retain minimum_wall around the knot cavity.",
            [["cavity_diameter", cavity_diameter], ["thread_diameter", thread_diameter], ["thread_depth", thread_depth],
             ["minimum_wall", minimum_wall], ["remaining wall", thread_diameter / 2 - thread_depth - cavity_diameter / 2]]));
    assert(coupler_diameter / 2 - female_mask_radius() >= minimum_wall,
        assertion_message("Cover must retain minimum_wall outside the female thread.",
            [["coupler_diameter", coupler_diameter], ["thread_diameter", thread_diameter], ["thread_clearance", thread_clearance],
             ["radial_segments", radial_segments], ["minimum_wall", minimum_wall], ["female_mask_radius()", female_mask_radius()],
             ["remaining wall", coupler_diameter / 2 - female_mask_radius()]]));
    assert(cavity_diameter / 2 >= hole_circle_diameter / 2 + thin_mouth_radius,
        assertion_message("All six thin-hole mouths must open inside the knot cavity.",
            [["cavity_diameter", cavity_diameter], ["hole_circle_diameter", hole_circle_diameter],
             ["thin_cord_diameter", thin_cord_diameter], ["hole_clearance", hole_clearance], ["mouth_chamfer", mouth_chamfer],
             ["thin_mouth_radius", thin_mouth_radius], ["minimum cavity diameter", hole_circle_diameter + 2 * thin_mouth_radius]]));
    assert(hole_circle_diameter / 2 - thin_mouth_radius - pull_mouth_radius >= minimum_wall,
        assertion_message("Thin holes must leave minimum_wall around the central pull hole.",
            [["hole_circle_diameter", hole_circle_diameter], ["thin_cord_diameter", thin_cord_diameter],
             ["pull_cord_diameter", pull_cord_diameter], ["hole_clearance", hole_clearance], ["mouth_chamfer", mouth_chamfer],
             ["thin_mouth_radius", thin_mouth_radius], ["pull_mouth_radius", pull_mouth_radius], ["minimum_wall", minimum_wall],
             ["remaining wall", hole_circle_diameter / 2 - thin_mouth_radius - pull_mouth_radius]]));
    assert(hole_circle_diameter / 2 - 2 * thin_mouth_radius >= minimum_wall,
        assertion_message("Adjacent thin holes must retain minimum_wall between their mouths.",
            [["hole_circle_diameter", hole_circle_diameter], ["thin_cord_diameter", thin_cord_diameter],
             ["hole_clearance", hole_clearance], ["mouth_chamfer", mouth_chamfer], ["thin_mouth_radius", thin_mouth_radius],
             ["minimum_wall", minimum_wall], ["remaining wall", hole_circle_diameter / 2 - 2 * thin_mouth_radius]]));
    assert(central_seat_height == 0
        || hole_circle_diameter / 2 - thin_mouth_radius > central_seat_radius,
        assertion_message("Raised central seat must not cover the six thin-hole mouths.",
            [["central_seat_height", central_seat_height], ["hole_circle_diameter", hole_circle_diameter],
             ["thin_cord_diameter", thin_cord_diameter], ["pull_cord_diameter", pull_cord_diameter], ["hole_clearance", hole_clearance],
             ["mouth_chamfer", mouth_chamfer], ["minimum_wall", minimum_wall], ["thin_mouth_radius", thin_mouth_radius],
             ["central_seat_radius", central_seat_radius], ["available radius", hole_circle_diameter / 2 - thin_mouth_radius]]));
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
