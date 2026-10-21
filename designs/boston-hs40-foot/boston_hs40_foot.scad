// Boston HS 40 speaker foot. All dimensions are millimeters.

include <../../include/BOSL2/std.scad>
use <../../include/assertions.scad>

/* [Outline] */
overall_length = 118.4;
body_width = 30;
base_width = 40;
plate_thickness = 5;
// Distance down from the very top tip.
flare_start_from_top = 90;
// Rise of the bottom edge's center above the two lowest points.
bottom_rise = 3;
// Unmeasured contour choice; adjust to match the original toes.
toe_radius = 5;

/* [Outer edge chamfer] */
// Equal perimeter setback and depth on both faces; zero keeps sharp edges.
edge_chamfer = 0.5;

/* [Side-profile bend] */
// Distance down from the rounded top tip to the start of the bend.
bend_start_from_top = 87;
// Provisional midplane tip offset; positive bends toward the recessed face.
// Set to zero for the original flat profile, or negative to reverse the bend.
bend_tip_offset = 3;

/* [Large through-hole] */
large_hole_diameter = 12;
large_hole_from_top = 56;

/* [Recess and small through-holes] */
recess_width = 12.5;
// Total capsule length, including both rounded ends.
recess_length = 28;
recess_depth = 3;
// Distance down from the very top tip to the recess's upper edge.
recess_start_from_top = 8;
small_hole_diameter = 6.3;

/* [Hidden] */
epsilon = 0.01;
curve_steps = 48;
bend_steps = 48;
$fn = 96;

top_radius = body_width / 2;
top_center_y = overall_length - top_radius;
flare_y = overall_length - flare_start_from_top;
flare_run = flare_y - toe_radius;
toe_center_x = base_width / 2 - toe_radius;
bend_y = overall_length - bend_start_from_top;
bend_direction = sign(bend_tip_offset);
bend_radius = bend_tip_offset == 0 ? 0
    : (bend_y^2 + bend_tip_offset^2) / (2 * abs(bend_tip_offset));
large_hole_y = overall_length - large_hole_from_top;
recess_hole_ys = [
    overall_length - recess_start_from_top - recess_width / 2,
    overall_length - recess_start_from_top - recess_length + recess_width / 2
];

assert(body_width > 0 && overall_length > top_radius,
    assertion_message("Body width must be positive and overall length must exceed the top radius.",
        [["body_width", body_width], ["overall_length", overall_length], ["top_radius", top_radius]]));
assert(plate_thickness > 0 && base_width >= body_width,
    assertion_message("Plate thickness must be positive and base width must be at least body width.",
        [["plate_thickness", plate_thickness], ["base_width", base_width], ["body_width", body_width]]));
assert(toe_radius > 0 && toe_radius < base_width / 2,
    assertion_message("Toe radius must be positive and smaller than half the base width.",
        [["toe_radius", toe_radius], ["base_width", base_width], ["maximum radius (exclusive)", base_width / 2]]));
assert(flare_y > toe_radius && flare_y < top_center_y,
    assertion_message("Flare must start below the top cap and above the rounded toes.",
        [["flare_start_from_top", flare_start_from_top], ["overall_length", overall_length], ["body_width", body_width],
         ["toe_radius", toe_radius], ["flare_y", flare_y], ["top_center_y", top_center_y]]));
assert(bottom_rise >= 0 && bottom_rise < toe_radius,
    assertion_message("Bottom rise must be nonnegative and smaller than the toe radius.",
        [["bottom_rise", bottom_rise], ["toe_radius", toe_radius]]));
assert(curve_steps >= 8 && curve_steps % 2 == 0,
    assertion_message("Curve steps must be an even integer of at least 8.", [["curve_steps", curve_steps]]));
assert(large_hole_diameter > 0 && large_hole_diameter < body_width,
    assertion_message("Large hole diameter must be positive and smaller than the body width.",
        [["large_hole_diameter", large_hole_diameter], ["body_width", body_width]]));
assert(large_hole_from_top - large_hole_diameter / 2 > top_radius
    && large_hole_from_top + large_hole_diameter / 2 < overall_length - toe_radius,
    assertion_message("Large hole must stay below the top cap and above the toe region.",
        [["large_hole_from_top", large_hole_from_top], ["large_hole_diameter", large_hole_diameter], ["overall_length", overall_length],
         ["body_width", body_width], ["top_radius", top_radius], ["toe_radius", toe_radius],
         ["hole extent from top", [large_hole_from_top - large_hole_diameter / 2, large_hole_from_top + large_hole_diameter / 2]]]));
assert(recess_width > 0 && recess_width < body_width
    && recess_length > recess_width,
    assertion_message("Recess width must fit the body and capsule length must exceed its width.",
        [["recess_width", recess_width], ["body_width", body_width], ["recess_length", recess_length]]));
assert(recess_depth > 0 && recess_depth < plate_thickness,
    assertion_message("Recess depth must be positive and leave a solid floor.",
        [["recess_depth", recess_depth], ["plate_thickness", plate_thickness]]));
assert(recess_start_from_top > 0
    && recess_start_from_top + recess_length < overall_length - toe_radius,
    assertion_message("Recess must stay below the top tip and above the toe region.",
        [["recess_start_from_top", recess_start_from_top], ["recess_length", recess_length], ["overall_length", overall_length],
         ["toe_radius", toe_radius], ["recess end", recess_start_from_top + recess_length],
         ["toe region starts", overall_length - toe_radius]]));
assert(small_hole_diameter > 0 && small_hole_diameter < recess_width,
    assertion_message("Small hole diameter must be positive and smaller than the recess width.",
        [["small_hole_diameter", small_hole_diameter], ["recess_width", recess_width]]));
assert(recess_length - recess_width > small_hole_diameter,
    assertion_message("Small holes must remain separate at the capsule's end-circle centers.",
        [["recess_length", recess_length], ["recess_width", recess_width], ["small_hole_diameter", small_hole_diameter],
         ["hole spacing", recess_length - recess_width]]));
assert(large_hole_from_top + large_hole_diameter / 2 < recess_start_from_top
    || large_hole_from_top - large_hole_diameter / 2
        > recess_start_from_top + recess_length,
    assertion_message("Large hole must not overlap the capsule recess.",
        [["large_hole_from_top", large_hole_from_top], ["large_hole_diameter", large_hole_diameter],
         ["recess_start_from_top", recess_start_from_top], ["recess_length", recess_length],
         ["hole extent from top", [large_hole_from_top - large_hole_diameter / 2, large_hole_from_top + large_hole_diameter / 2]],
         ["recess extent from top", [recess_start_from_top, recess_start_from_top + recess_length]]]));
assert(bend_steps >= 8 && bend_steps % 2 == 0,
    assertion_message("Bend steps must be an even integer of at least 8.", [["bend_steps", bend_steps]]));
assert(bend_tip_offset == 0 || (bend_y > toe_radius && bend_y < top_center_y),
    assertion_message("Bend must start below the top cap and above the rounded toes.",
        [["bend_tip_offset", bend_tip_offset], ["bend_start_from_top", bend_start_from_top], ["overall_length", overall_length],
         ["body_width", body_width], ["toe_radius", toe_radius], ["bend_y", bend_y], ["top_center_y", top_center_y]]));
assert(bend_tip_offset == 0 || abs(bend_tip_offset) < bend_y,
    assertion_message("Tip offset must be smaller than the bent section's projected length.",
        [["bend_tip_offset", bend_tip_offset], ["bend_start_from_top", bend_start_from_top],
         ["overall_length", overall_length], ["bend_y", bend_y]]));
assert(bend_tip_offset == 0 || bend_radius - plate_thickness / 2 > bend_y,
    assertion_message("Bend is too tight to preserve the plate thickness.",
        [["bend_tip_offset", bend_tip_offset], ["bend_start_from_top", bend_start_from_top], ["overall_length", overall_length],
         ["plate_thickness", plate_thickness], ["bend_radius", bend_radius], ["bend_y", bend_y]]));
assert(bend_tip_offset == 0 || max(
    large_hole_from_top + large_hole_diameter / 2,
    recess_start_from_top + recess_length
) < bend_start_from_top,
    assertion_message("Mounting holes and recess must stay above the bend; set bend_tip_offset=0 for a flat profile.",
        [["bend_tip_offset", bend_tip_offset], ["bend_start_from_top", bend_start_from_top], ["large_hole_from_top", large_hole_from_top],
         ["large_hole_diameter", large_hole_diameter], ["recess_start_from_top", recess_start_from_top], ["recess_length", recess_length],
         ["lowest feature", max(large_hole_from_top + large_hole_diameter / 2, recess_start_from_top + recess_length)]]));
assert(edge_chamfer >= 0 && edge_chamfer < plate_thickness / 2
    && edge_chamfer < toe_radius,
    assertion_message("Edge chamfer must be nonnegative and smaller than half the thickness and the toe radius.",
        [["edge_chamfer", edge_chamfer], ["plate_thickness", plate_thickness], ["toe_radius", toe_radius],
         ["maximum chamfer (exclusive)", min(plate_thickness / 2, toe_radius)]]));
assert(large_hole_diameter + 2 * edge_chamfer < body_width
    && recess_width + 2 * edge_chamfer < body_width
    && recess_start_from_top > edge_chamfer,
    assertion_message("Chamfer must leave full-width rims around the mounting holes and recess.",
        [["large_hole_diameter", large_hole_diameter], ["edge_chamfer", edge_chamfer], ["body_width", body_width],
         ["recess_width", recess_width], ["recess_start_from_top", recess_start_from_top],
         ["chamfered hole width", large_hole_diameter + 2 * edge_chamfer], ["chamfered recess width", recess_width + 2 * edge_chamfer]]));

function cubic_bezier(points, t) =
    (1 - t)^3 * points[0]
    + 3 * (1 - t)^2 * t * points[1]
    + 3 * (1 - t) * t^2 * points[2]
    + t^3 * points[3];

// Vertical tangents join the straight sides to the quarter-circle toes.
function flare_point(t) = cubic_bezier([
    [body_width / 2, flare_y],
    [body_width / 2, flare_y - flare_run / 2],
    [base_width / 2, toe_radius + flare_run / 2],
    [base_width / 2, toe_radius]
], t);

function outline_points() = concat(
    [for (i = [0 : curve_steps])
        [top_radius * cos(180 * i / curve_steps),
         top_center_y + top_radius * sin(180 * i / curve_steps)]],
    [[-body_width / 2, flare_y]],
    [for (i = [1 : curve_steps])
        let(p = flare_point(i / curve_steps)) [-p[0], p[1]]],
    [for (i = [1 : curve_steps])
        let(angle = 180 + 90 * i / curve_steps)
        [-toe_center_x + toe_radius * cos(angle),
         toe_radius + toe_radius * sin(angle)]],
    [for (i = [1 : curve_steps])
        [-toe_center_x + 2 * toe_center_x * i / curve_steps,
         bottom_rise * (1 - cos(360 * i / curve_steps)) / 2]],
    [for (i = [1 : curve_steps])
        let(angle = 270 + 90 * i / curve_steps)
        [toe_center_x + toe_radius * cos(angle),
         toe_radius + toe_radius * sin(angle)]],
    [for (i = [1 : curve_steps]) flare_point(1 - i / curve_steps)]
);

// Concentric circular faces preserve thickness normal to the curved profile.
function profile_z(y, depth) = bend_tip_offset == 0 || y >= bend_y
    ? depth
    : plate_thickness / 2 + bend_direction * (bend_radius - sqrt(
        (bend_radius - bend_direction * (depth - plate_thickness / 2))^2
            - (bend_y - y)^2
    ));

function side_profile_points() = concat(
    [for (i = [0 : bend_steps])
        let(y = bend_y * i / bend_steps) [y, profile_z(y, 0)]],
    [[overall_length, 0], [overall_length, plate_thickness]],
    [for (i = [bend_steps : -1 : 0])
        let(y = bend_y * i / bend_steps) [y, profile_z(y, plate_thickness)]]
);

module sharp_plate_body() {
    if (bend_tip_offset == 0) {
        linear_extrude(height = plate_thickness)
            polygon(outline_points());
    } else {
        min_z = min(0, profile_z(0, 0));
        max_z = max(plate_thickness, profile_z(0, plate_thickness));
        intersection() {
            translate([0, 0, min_z - epsilon])
                linear_extrude(height = max_z - min_z + 2 * epsilon)
                    polygon(outline_points());

            rotate([90, 0, 90])
                linear_extrude(height = base_width + 2 * epsilon, center = true)
                    polygon(side_profile_points());
        }
    }
}

module plate_body() {
    if (edge_chamfer == 0) {
        sharp_plate_body();
    } else {
        beveled = offset_sweep(
            outline_points(), height = plate_thickness, cp = [0, 0, 0],
            ends = os_chamfer(width = edge_chamfer, height = edge_chamfer),
            offset = "delta"
        );
        // Refine broad faces before applying the nonlinear bend.
        refined = bend_tip_offset == 0 ? beveled
            : vnf_slice(beveled, "Y",
                [for (i = [1 : bend_steps]) bend_y * i / bend_steps]);
        triangles = vnf_triangulate(refined);
        polyhedron(
            points = [for (p = triangles[0]) [p.x, p.y, profile_z(p.y, p.z)]],
            faces = triangles[1], convexity = 10
        );
    }
}

module through_hole(y, diameter) {
    translate([0, y, -epsilon])
        cylinder(d = diameter, h = plate_thickness + 2 * epsilon);
}

module recess_outline() {
    hull()
        for (y = recess_hole_ys)
            translate([0, y])
                circle(d = recess_width);
}

module speaker_foot() {
    difference() {
        plate_body();

        through_hole(large_hole_y, large_hole_diameter);
        for (y = recess_hole_ys)
            through_hole(y, small_hole_diameter);

        translate([0, 0, plate_thickness - recess_depth])
            linear_extrude(height = recess_depth + epsilon)
                recess_outline();
    }
}

speaker_foot();
