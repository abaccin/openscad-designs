// Parametric chandelier reconstruction. Dimensions are millimeters.
// Preview with F5, then render with F6 before exporting.

/* [Output] */
part = "all"; // [all, base, ring, dome]
layout = "print"; // [print, source]
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

/* [Ring] */
ring_outer_diameter = 34.2;
ring_inner_diameter = 33.004;
ring_height = 1.8;

/* [Dome] */
dome_diameter = 60;
// Finished height at the top hole, not the uncut ellipse's apex.
dome_height = 41.2374;
dome_inner_diameter = 55.006;
dome_inner_height = 35;
// The elliptical cavity starts above a short cylindrical bottom opening.
dome_opening_height = 1.879;
dome_opening_diameter = 54.45;
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

module base() {
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

    difference() {
        union() {
            cylinder(d = flange_diameter, h = flange_height);
            cylinder(d = collar_diameter, h = base_height);
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

module ring() {
    assert(positive_numbers([
        ring_outer_diameter, ring_inner_diameter, ring_height
    ]), "Ring dimensions must be positive numbers.");
    assert(ring_outer_diameter > ring_inner_diameter,
        "Ring outside diameter must exceed its inside diameter.");

    difference() {
        cylinder(d = ring_outer_diameter, h = ring_height);
        translate([0, 0, -epsilon])
            cylinder(d = ring_inner_diameter, h = ring_height + 2 * epsilon);
    }
}

module dome() {
    assert(positive_numbers([
        dome_diameter, dome_height, dome_inner_diameter, dome_inner_height,
        dome_opening_height, dome_opening_diameter, top_hole_diameter
    ]), "Dome dimensions must be positive numbers.");
    assert(top_hole_diameter < dome_opening_diameter &&
        dome_opening_diameter <= dome_inner_diameter &&
        dome_inner_diameter < dome_diameter,
        "Dome diameters must satisfy hole < opening <= interior < outside.");

    outer_radius = dome_diameter / 2;
    inner_radius = dome_inner_diameter / 2;
    hole_radius = top_hole_diameter / 2;
    outer_angle = acos(hole_radius / outer_radius);
    inner_angle = acos(hole_radius / inner_radius);
    // Terminate the outer curve exactly at the requested finished height.
    outer_height = dome_height / sin(outer_angle);
    inner_top = dome_opening_height + dome_inner_height * sin(inner_angle);
    assert(inner_top < dome_height,
        "Dome cavity must terminate below the finished height.");

    outer_profile = [for (i = [0 : profile_segments])
        i == profile_segments ? [hole_radius, dome_height] :
            [outer_radius * cos(outer_angle * i / profile_segments),
                outer_height * sin(outer_angle * i / profile_segments)]];
    inner_curve = [for (i = [0 : profile_segments])
        i == profile_segments ? [hole_radius, inner_top] :
            [inner_radius * cos(inner_angle * i / profile_segments),
                dome_opening_height +
                    dome_inner_height * sin(inner_angle * i / profile_segments)]];
    inner_profile = concat(
        [[dome_opening_diameter / 2, 0],
            [dome_opening_diameter / 2, dome_opening_height]],
        inner_curve,
        [[hole_radius, dome_height]]
    );
    // Positive separation at every height knot keeps the linear segments apart.
    for (point = concat(outer_profile, inner_profile))
        if (point[1] < dome_height)
            assert(radius_at_height(outer_profile, point[1]) >
                radius_at_height(inner_profile, point[1]),
                str("Dome wall must remain positive at Z=", point[1], "."));

    rotate_extrude(convexity = 10)
        polygon(concat(
            outer_profile,
            [for (i = [len(inner_profile) - 2 : -1 : 0]) inner_profile[i]]
        ));
}

assert(part == "all" || part == "base" || part == "ring" || part == "dome",
    "Unknown part: select all, base, ring, or dome.");
assert(layout == "print" || layout == "source",
    "Unknown layout: select print or source.");
assert(is_num(radial_segments) ?
    radial_segments >= 24 && radial_segments == floor(radial_segments) : false,
    "Radial segments must be an integer of at least 24.");
assert(is_num(profile_segments) ?
    profile_segments >= 8 && profile_segments == floor(profile_segments) : false,
    "Profile segments must be an integer of at least 8.");

if (part == "base") {
    base();
} else if (part == "ring") {
    ring();
} else if (part == "dome") {
    dome();
} else if (layout == "source") {
    translate([-11.25, -44.2495, 0]) base();
    translate([-11.25, -44.2495, 1.1]) ring();
    translate([-63, -2, 0]) dome();
} else {
    assert(is_num(print_gap) ? print_gap > 0 : false,
        "Print gap must be positive so the parts remain separate.");
    dome_x = flange_diameter / 2 + print_gap + dome_diameter / 2;
    ring_x = dome_x + dome_diameter / 2 + print_gap + ring_outer_diameter / 2;
    base();
    translate([dome_x, 0, 0]) dome();
    translate([ring_x, 0, 0]) ring();
}
