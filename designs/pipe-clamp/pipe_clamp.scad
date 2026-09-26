// Split pipe clamp. All dimensions are millimeters.
// Preview with F5, then render with F6 before exporting.

/* [Clamp] */
// Radius of the pipe bore; add any desired fit allowance here.
pipe_radius = 10;
clamp_height = 12;
// Radial material thickness, not the outside radius.
wall_thickness = 20;
// Radius of the transverse screw hole.
screw_radius = 3.5;
slit_width = 1.5;

/* [Tabs] */
tab_length = 14;
// Tab extent on each side of the slit centerline.
tab_depth = 10;
tab_overlap = 2;

/* [Hidden] */
epsilon = 0.01;
$fn = 50;

outer_radius = pipe_radius + wall_thickness;
screw_x = outer_radius + (tab_length - tab_overlap) / 2;
cut_height = clamp_height + 2 * epsilon;

difference() {
    union() {
        cylinder(r = outer_radius, h = clamp_height);

        translate([outer_radius - tab_overlap, -tab_depth, 0])
            cube([tab_length, 2 * tab_depth, clamp_height]);
    }

    translate([0, 0, -epsilon])
        cylinder(r = pipe_radius, h = cut_height);

    translate([0, -slit_width / 2, -epsilon])
        cube([
            outer_radius + tab_length + epsilon,
            slit_width,
            cut_height
        ]);

    translate([screw_x, 0, clamp_height / 2])
        rotate([90, 0, 0])
            cylinder(
                r = screw_radius,
                h = 2 * tab_depth + 2 * epsilon,
                center = true
            );
}
