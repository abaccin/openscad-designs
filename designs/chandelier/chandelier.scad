// Parametric chandelier reconstruction. Dimensions are millimeters.
// Preview with F5, then render with F6 before exporting.

include <../../include/BOSL2/std.scad>
include <../../include/BOSL2/threading.scad>

/* [Output] */
part = "all"; // [all, base, dome]
layout = "print"; // [print, assembled, source]
// Edge-to-edge spacing in the separated print layout; must be positive.
print_gap = 10;

/* [Base] */
flange_diameter = 63.5;
flange_height = 4;
collar_diameter = 41.5;
base_height = 30;
lower_bore_diameter = 34.204;
lower_bore_height = 2.998;
upper_bore_diameter = 36.504;

/* [Threaded connection] */
thread_pitch = 4;
thread_depth = 1;
// Radial gap per side; the female thread is enlarged, not the male thread.
thread_clearance = 0.25;
thread_axial_clearance = 0.4;
thread_chamfer = 0.25;
minimum_wall = 1.2;

/* [Dome] */
dome_diameter = 60;
// Finished height at the top hole, not the uncut ellipse's apex.
dome_height = 41.2374;
dome_inner_diameter = 55.006;
dome_inner_height = 35;
// Offset of the original elliptical cavity above the bottom.
dome_inner_offset = 1.879;
top_hole_diameter = 10;

/* [Resolution] */
radial_segments = 128; // [24:4:256]
profile_segments = 64; // [8:1:128]

/* [Hidden] */
epsilon = 0.01;
$fn = radial_segments;

function positive_numbers(values) =
    len([for (value = values)
        if (is_num(value) ? value <= 0 : true) value]) == 0;

// Include both radii at a horizontal ledge when checking wall separation.
function radius_at_height(profile, z) =
    max([for (i = [0 : len(profile) - 2])
        let(a = profile[i], b = profile[i + 1])
        if (z >= a[1] && z <= b[1])
            b[1] == a[1] ? max(a[0], b[0]) :
                a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1])]);

function collar_height() = base_height - flange_height;
function socket_depth() = collar_height() + thread_axial_clearance;
function female_mask_radius() =
    collar_diameter / 2 / cos(180 / radial_segments) + thread_clearance;

function outer_dome_profile() =
    let(
        radius = dome_diameter / 2,
        hole = top_hole_diameter / 2,
        angle = acos(hole / radius),
        height = dome_height / sin(angle)
    )
    [for (i = [0 : profile_segments])
        i == profile_segments ? [hole, dome_height] :
            [radius * cos(angle * i / profile_segments),
                height * sin(angle * i / profile_segments)]];

function inner_dome_profile() =
    let(
        radius = dome_inner_diameter / 2,
        hole = top_hole_diameter / 2,
        angle = acos(hole / radius)
    )
    [for (i = [0 : profile_segments])
        [i == profile_segments ? hole : radius * cos(angle * i / profile_segments),
            dome_inner_offset + dome_inner_height * sin(angle * i / profile_segments)]];

module validate_connection() {
    assert(positive_numbers([
        collar_diameter, base_height, flange_height, upper_bore_diameter,
        thread_pitch, thread_depth, minimum_wall
    ]), "Connection dimensions must be positive numbers.")
    assert(len([for (value = [thread_clearance, thread_axial_clearance, thread_chamfer])
        if (is_num(value) ? value < 0 : true) value]) == 0,
        "Thread clearances and chamfer must be nonnegative numbers.")
    assert(thread_depth < thread_pitch / 2,
        "Thread depth must be less than half the pitch to retain flat crests.")
    assert(collar_height() > 2 * thread_pitch + 2 * thread_chamfer,
        "Collar must accommodate at least two thread pitches plus chamfers.")
    assert(thread_chamfer <= thread_depth,
        "Thread chamfer must not exceed the thread depth.")
    assert(collar_diameter / 2 - thread_depth - thread_chamfer -
        upper_bore_diameter / 2 >= minimum_wall,
        "Thread roots and male lead-in must retain the minimum wall around the bore.")
    children();
}

module connection_thread(internal = false) {
    // BOSL2 adds 2*$slop per side and shifts internal profiles by half a turn.
    $slop = internal ? thread_clearance / 2 : 0;
    $fn = radial_segments;
    trapezoidal_threaded_rod(
        d = collar_diameter,
        l = collar_height(),
        pitch = thread_pitch,
        thread_depth = thread_depth,
        thread_angle = 90,
        starts = 1,
        internal = internal,
        spin = internal ? 180 : 0,
        anchor = BOTTOM,
        blunt_start = true,
        bevel1 = internal ? thread_chamfer : false,
        bevel2 = internal ? false : thread_chamfer
    );
}

module base() {
    $fn = radial_segments;
    assert(positive_numbers([
        flange_diameter, flange_height, collar_diameter, base_height,
        lower_bore_diameter, lower_bore_height, upper_bore_diameter
    ]), "Base dimensions must be positive numbers.");
    assert(flange_diameter >= collar_diameter,
        "Flange diameter must be at least the collar diameter.");
    assert(collar_diameter > upper_bore_diameter &&
        upper_bore_diameter >= lower_bore_diameter,
        "Base bores must satisfy lower <= upper < collar diameter.");
    assert(flange_height < base_height && lower_bore_height < flange_height,
        "Base heights must satisfy lower bore < flange < overall height.");
    validate_connection()
    difference() {
        union() {
            cylinder(d = flange_diameter, h = flange_height);
            cylinder(
                d = collar_diameter - 2 * thread_depth,
                h = flange_height + epsilon
            );
            translate([0, 0, flange_height])
                connection_thread();
        }
        translate([0, 0, -epsilon])
            cylinder(d = lower_bore_diameter, h = base_height + 2 * epsilon);
        translate([0, 0, lower_bore_height])
            cylinder(
                d = upper_bore_diameter,
                h = base_height - lower_bore_height + epsilon
            );
    }
}

module dome() {
    $fn = radial_segments;
    assert(positive_numbers([
        dome_diameter, dome_height, dome_inner_diameter, dome_inner_height,
        dome_inner_offset, top_hole_diameter
    ]), "Dome dimensions must be positive numbers.")
    assert(top_hole_diameter < dome_inner_diameter &&
        dome_inner_diameter < dome_diameter,
        "Dome diameters must satisfy hole < interior < outside.")
    validate_connection()
    let(
        hole_radius = top_hole_diameter / 2,
        outer_profile = outer_dome_profile(),
        inner_curve = inner_dome_profile(),
        inner_top = inner_curve[len(inner_curve) - 1][1]
    )
    assert(inner_top < dome_height,
        "Dome cavity must terminate below the finished height.")
    assert(socket_depth() >= dome_inner_offset,
        "Threaded socket must reach the upper cavity's height offset.")
    assert(socket_depth() + epsilon < inner_top,
        "Threaded socket and axial clearance must end below the upper cavity.")
    assert(radius_at_height(outer_profile, socket_depth() + epsilon) -
        female_mask_radius() >= minimum_wall &&
        dome_diameter / 2 - female_mask_radius() - thread_chamfer >= minimum_wall,
        "Dome must retain the minimum wall around the socket and its entrance.")
    let(inner_profile = concat(
        [[radius_at_height(inner_curve, socket_depth()), socket_depth()]],
        [for (point = inner_curve) if (point[1] > socket_depth()) point],
        [[hole_radius, dome_height]]
    )) {
        // Positive separation at every height knot keeps the linear segments apart.
        for (point = concat(outer_profile, inner_profile))
            if (point[1] >= socket_depth() && point[1] < dome_height)
                assert(radius_at_height(outer_profile, point[1]) >
                    radius_at_height(inner_profile, point[1]),
                    str("Dome wall must remain positive at Z=", point[1], "."));

        difference() {
            rotate_extrude(convexity = 10)
                polygon(concat(outer_profile, [[0, dome_height], [0, 0]]));
            union() {
                connection_thread(internal = true);
                translate([0, 0, -epsilon])
                    cylinder(
                        r = female_mask_radius() + thread_chamfer,
                        h = 2 * epsilon
                    );
                translate([0, 0, collar_height() - epsilon])
                    cylinder(
                        r = female_mask_radius(),
                        h = thread_axial_clearance + 2 * epsilon
                    );
                rotate_extrude(convexity = 10)
                    polygon(concat(
                        inner_profile,
                        [[hole_radius, dome_height + epsilon],
                            [0, dome_height + epsilon], [0, socket_depth()]]
                    ));
            }
        }
    }
}

assert(part == "all" || part == "base" || part == "dome",
    "Unknown part: select all, base, or dome.");
assert(layout == "print" || layout == "assembled" || layout == "source",
    "Unknown layout: select print, assembled, or source.");
assert(is_num(radial_segments) ?
    radial_segments >= 24 && radial_segments == floor(radial_segments) : false,
    "Radial segments must be an integer of at least 24.");
assert(is_num(profile_segments) ?
    profile_segments >= 8 && profile_segments == floor(profile_segments) : false,
    "Profile segments must be an integer of at least 8.");

if (part == "base") {
    base();
} else if (part == "dome") {
    dome();
} else if (layout == "source") {
    translate([-11.25, -44.2495, 0]) base();
    translate([-63, -2, 0]) dome();
} else if (layout == "assembled") {
    base();
    translate([0, 0, flange_height]) dome();
} else {
    assert(is_num(print_gap) ? print_gap > 0 : false,
        "Print gap must be positive so the parts remain separate.");
    dome_x = flange_diameter / 2 + print_gap + dome_diameter / 2;
    base();
    translate([dome_x, 0, 0]) dome();
}
