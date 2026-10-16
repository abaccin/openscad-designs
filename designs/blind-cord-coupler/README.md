# Blind cord coupler

[All designs](../../README.md)

A one-piece, parametric **six-thin-cords to one thicker pull-cord** connector.
It is a rounded plate with six small through-holes in two rows of three and
one larger hole at the opposite end. Each cord is retained by its own exposed
stopper knot. There are no covers, screws, clips, or glue.

The default plate is **28 x 36 x 6 mm**. Cord diameters of **1 mm and 3 mm** are
provisional, not measurements of your blind. With the default 0.4 mm diametral
clearance, the straight bores are **1.4 mm and 3.4 mm** across. Both mouths of
each hole have a 0.4 mm, 45-degree chamfer.

## Important safety limits

**This is an untested rigid prototype, not a certified blind-cord breakaway
safety connector.** The missing original connector may have served a safety
function. Check the blind manufacturer's requirements first; use a compatible
manufacturer-approved replacement if a safety/breakaway connector is required.
Do not replace or bypass required safety devices with this plate.

Accessible blind cords and loops can strangle children. Do not create a
continuous pull loop, and keep cords out of children's reach using the blind
manufacturer's approved cord-management arrangements. This design does not
establish compliance with blind-cord safety standards.

Printed strength, knot security, cord wear, release behavior, and operation on
an actual blind have not been physically verified. Dimensional guards are
geometry checks, not a load rating or safety certification.

## Restoring the missing travel

If the old connector hits the top cord lock/headrail before the blind reaches
the bottom, **adding length only below it to the thick pull cord will not
help**. Each of the six short thin cords needs a suitable extension so the
new connector can sit farther below the mechanism.

This model supplies the connector, not the extra cord. Obtain six suitable
thin-cord extensions, a thicker pull cord, and a cord-compatible joining method
recommended by the blind/cord supplier. The supplier's knot or splice guidance
takes precedence; this design does not validate a particular joining method.

**Every extension joint, knot, and the plate must remain outside and clear of
the cord lock/headrail throughout the entire travel**, including fully lowered.
If an original cord end or a joint must enter the lock, replace/rethread the
lift cord instead of forcing a splice or knot through the mechanism.

## Parameters

All dimensions are millimeters. Edit the source or use OpenSCAD's Customizer.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `thin_cord_diameter` | `1` | Measured diameter of each of the six thin cords. |
| `pull_cord_diameter` | `3` | Measured diameter of the single thicker pull cord. |
| `hole_clearance` | `0.4` | Added to each cord's diameter, not radius; does not include chamfers. |
| `plate_width` | `28` | Overall X dimension. |
| `plate_length` | `36` | Overall Y dimension. |
| `plate_thickness` | `6` | Overall Z dimension; the bottom face is at Z=0. |
| `corner_radius` | `3` | Outline corner radius; zero gives square corners. |
| `thin_column_spacing` | `8` | Center-to-center X spacing; columns are at minus this value, zero, and plus this value. |
| `thin_row_spacing` | `6` | Center-to-center Y spacing of the two thin-cord rows. |
| `thin_edge_distance` | `6` | Distance from the positive-Y edge to the upper row's centers. |
| `pull_edge_distance` | `8` | Distance from the negative-Y edge to the pull hole's center. |
| `mouth_chamfer` | `0.4` | Equal depth and radial widening at both mouths; zero disables chamfers. |
| `minimum_wall` | `2` | Minimum nominal material between hole mouths or from a mouth to the rounded perimeter. Not a strength guarantee. |

In the default layout, thin-hole centers are X=-8, 0, 8 at Y=12 and Y=6.
The pull-hole center is X=0, Y=-10. The plate is centered on X=0, Y=0.

The straight bore diameter is `cord_diameter + hole_clearance`; the face
opening diameter additionally includes `2 * mouth_chamfer`. The straight
section's length is `plate_thickness - 2 * mouth_chamfer`.

Assertions reject nonpositive sizes/spacing, negative clearances, corner
radii reaching half either plate dimension, chamfers consuming the straight
bore, and insufficient material between mouths or around the actual rounded
outline. Increase the plate size or adjust hole layout when increasing cord
sizes. Clearances are nominal; printed dimensions and knot sizes still need
checking. Hole positions do not allow for the size of knots themselves: make
sure adjacent knots do not crowd or displace one another.

## Preview and export

Open `designs\blind-cord-coupler\blind_cord_coupler.scad` in OpenSCAD 2021.01
or later. Preview with **F5**, adjust dimensions, then render with **F6** and
export as STL. No fonts, assets, or external libraries are required.

From the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force designs\blind-cord-coupler\exports | Out-Null
& 'C:\Program Files\OpenSCAD\openscad.exe' `
  -o designs\blind-cord-coupler\exports\blind-cord-coupler.stl `
  designs\blind-cord-coupler\blind_cord_coupler.scad | Out-Host
```

Use your executable path, or `openscad` if it is on PATH. For other cord sizes,
add definitions such as `-D 'thin_cord_diameter=1.4'` and
`-D 'pull_cord_diameter=4'` before the source argument. Generated exports are
ignored by Git. Piping to `Out-Host` makes PowerShell wait for the Windows
OpenSCAD executable to finish.

## Printing and fitting

Print flat with a broad face on the bed, as modeled, with the seven bores
vertical. The outline and 45-degree mouth chamfers are intended to print
without support. PETG is a starting material choice; for a 0.4 mm nozzle, start
with 0.2 mm layers, at least four perimeters, and a solid plate. These settings
are not a load rating. Inspect the sliced small holes and both mouth chamfers;
printer accuracy can close small holes or leave rough edges.

Print a fit sample first using the actual cord and intended knots. The default
plate itself is small enough to use as that sample. Adjust `hole_clearance`
for your printer rather than assuming a nominal 1.4 mm hole will fit.
Remove brim/support remnants and deburr/smooth both faces of every hole without
enlarging the straight bore enough to let its tightened stopper knot pull
through. Chamfers reduce sharp edges but do not guarantee freedom from wear.

## Threading and adjustment

Only proceed if a rigid connector is appropriate under the manufacturer's
safety requirements.

1. Support the bottom rail and release the existing connector without allowing
   the cords to retract or the blind to fall. Do not cut the original cords
   shorter. Establish the full lowered position with the rail level.
2. Extend each thin cord separately using suitable cord and the supplier's
   joining instructions. Set the new connector position far enough below the
   headrail that all six joints and the connector stay clear at full lowering.
3. Pass each thin extension through its own small hole from face A to face B,
   then tie a suitable stopper knot on face B. Adjust the six effective lengths
   individually while the supported rail is level. Do not assume the original
   cords or their extensions must all be cut to identical lengths.
4. Pass the thick pull cord through the large hole from face B to face A and
   tie its stopper knot on face A. This leaves its free pull end on face B;
   the six incoming thin cords are on face A. Do not join free ends into a loop.
5. Check that every tightened knot is larger than its bore and cannot pull
   through, that knots do not interfere with one another, and that no cord is
   pinched or rubbing a rough edge. Leave tails appropriate to the cord and
   joining method; do not rely on an untested knot or glue.
6. With the rail supported, check retention and move carefully through the
   entire raise/lower range. Stop at slipping knots, uneven movement, catching,
   cracking, or abrasion. Never force a connector or joint into the cord lock.
   If full travel cannot be achieved with all joints outside the mechanism,
   replace/rethread the lift cords or use the approved replacement hardware.

Do not consider the installation proven by a successful print. Inspect cords,
knots, and the plate for wear during use, and discontinue use if damaged.

## Regression checks

From the repository root, with Node.js 18+ and OpenSCAD installed:

```powershell
$env:OPENSCAD='C:\Program Files\OpenSCAD\openscad.exe'
node --test designs\blind-cord-coupler\tests\model.test.mjs
```

Checks render the default, resized, unchamfered, and large-corner layouts.
They verify one connected watertight mesh, bounds and corner radii, all seven
bores, both mouth chamfers, retained straight bore sections, and solid
ligaments. Invalid-parameter checks cover overlapping holes, rounded-perimeter
clearance, and chamfer limits. Rendering must not modify the saved source.
These checks do not validate the physical installation or mechanical safety.
