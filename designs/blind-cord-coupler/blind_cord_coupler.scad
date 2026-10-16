// Six thin cords to one pull cord. All dimensions are millimeters.
// Prototype only: not a certified blind-cord breakaway safety connector.

/* [Cords] */
thin_cord_diameter = 1;
pull_cord_diameter = 3;
// Added to each cord diameter, not to its radius.
hole_clearance = 0.4;

/* [Plate] */
plate_width = 28;
plate_length = 36;
plate_thickness = 6;
corner_radius = 3;

/* [Hole layout] */
thin_column_spacing = 8;
thin_row_spacing = 6;
// Distance from the positive-Y edge to the upper row's hole centers.
thin_edge_distance = 6;
// Distance from the negative-Y edge to the pull hole's center.
pull_edge_distance = 8;

/* [Hole edges] */
// 45-degree chamfer depth and radial setback on both faces; zero disables it.
mouth_chamfer = 0.4;
// Nominal material between chamfer mouths and the perimeter or another mouth.
minimum_wall = 2;

/* [Hidden] */
epsilon = 0.01;
$fn = 64;

thin_hole_diameter = thin_cord_diameter + hole_clearance;
pull_hole_diameter = pull_cord_diameter + hole_clearance;
holes = concat(
    [for (row = [0:1], column = [-1:1])
        [
            column * thin_column_spacing,
            plate_length / 2 - thin_edge_distance - row * thin_row_spacing,
            thin_hole_diameter
        ]
    ],
    [[0, -plate_length / 2 + pull_edge_distance, pull_hole_diameter]]
);

assert(plate_width > 0 && plate_length > 0 && plate_thickness > 0,
    "Plate width, length, and thickness must be positive.");
assert(thin_cord_diameter > 0 && pull_cord_diameter > 0,
    "Both cord diameters must be positive.");
assert(hole_clearance >= 0,
    "Hole clearance must be nonnegative.");
assert(corner_radius >= 0 && 2 * corner_radius < min(plate_width, plate_length),
    "Corner radius must be nonnegative and smaller than half either plate dimension.");
assert(thin_column_spacing > 0 && thin_row_spacing > 0,
    "Thin-hole column and row spacing must be positive.");
assert(thin_edge_distance > 0 && pull_edge_distance > 0,
    "Hole-center edge distances must be positive.");
assert(mouth_chamfer >= 0 && 2 * mouth_chamfer < plate_thickness,
    "Mouth chamfer must be nonnegative and leave a straight bore section.");
assert(minimum_wall > 0,
    "Minimum wall must be positive.");

// Signed-distance clearance includes the rounded corners, not just the bounds.
function perimeter_clearance(point) =
    let(q = [
        abs(point[0]) - (plate_width / 2 - corner_radius),
        abs(point[1]) - (plate_length / 2 - corner_radius)
    ])
    corner_radius - norm([max(q[0], 0), max(q[1], 0)])
        - min(max(q[0], q[1]), 0);

for (hole = holes)
    assert(perimeter_clearance(hole) >= hole[2] / 2 + mouth_chamfer + minimum_wall,
        "Hole mouths must leave minimum_wall around the rounded perimeter.");

for (i = [0:len(holes) - 2], j = [i + 1:len(holes) - 1])
    assert(
        norm([holes[i][0] - holes[j][0], holes[i][1] - holes[j][1]])
            >= (holes[i][2] + holes[j][2]) / 2 + 2 * mouth_chamfer + minimum_wall,
        "Hole mouths must remain separate with minimum_wall between them."
    );

module cord_hole(diameter) {
    radius = diameter / 2;
    translate([0, 0, -epsilon])
        cylinder(d = diameter, h = plate_thickness + 2 * epsilon);

    if (mouth_chamfer > 0) {
        translate([0, 0, -epsilon])
            cylinder(
                r1 = radius + mouth_chamfer + epsilon,
                r2 = radius,
                h = mouth_chamfer + epsilon
            );
        translate([0, 0, plate_thickness - mouth_chamfer])
            cylinder(
                r1 = radius,
                r2 = radius + mouth_chamfer + epsilon,
                h = mouth_chamfer + epsilon
            );
    }
}

difference() {
    linear_extrude(height = plate_thickness)
        if (corner_radius == 0)
            square([plate_width, plate_length], center = true);
        else
            offset(r = corner_radius)
                square([
                    plate_width - 2 * corner_radius,
                    plate_length - 2 * corner_radius
                ], center = true);

    for (hole = holes)
        translate([hole[0], hole[1], 0])
            cord_hole(hole[2]);
}
