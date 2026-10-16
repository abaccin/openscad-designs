# Blind cord coupler

[All designs](../../README.md)

A **15 mm outside-diameter round cord coupler** with **six small holes equally
spaced around one larger central hole**, plus a separate screw-on cover that
encloses all seven stopper knots. The body and cover have the same 15 mm
outside diameter; the cover does not increase the finished width.

The default assembled height is **14.5 mm**. Provisional cord diameters are
**1 mm for the six thin cords and 3 mm for the central pull cord**, giving
1.4 mm and 3.4 mm straight bores with the default clearance. Thin-hole centers
are on an 8.2 mm diameter circle at 60-degree intervals.

**Routing choice:** all seven cords pass from the flat exterior face into the
body, and all seven knots are inside the covered chamber. The cover is closed,
with no cord exit. This is not an opposite-end-entry cord condenser. A raised
central seat places the thicker cord's knot above the six smaller knots to
reduce crowding in the compact enclosure. Actual knot sizes still need checking.

The body is the load-bearing cord attachment; the threaded cover shields the
knots and can be removed for adjustment. No glue or separate fasteners are needed.
The model uses the already bundled [BOSL2](../../include/README.md) thread library.

## Important safety limits

**This is an untested rigid prototype, not a certified blind-cord breakaway
safety connector.** The missing original part may have had a safety function.
Check the blind manufacturer's requirements first and use a compatible
manufacturer-approved replacement where required. Do not replace or bypass a
required safety device with this coupler.

Accessible blind cords and loops can strangle children. Do not create a
continuous pull loop. Keep cords out of children's reach with the manufacturer's
approved cord-management arrangements. Concealing the knots does not remove
cord-entanglement hazards or establish compliance with safety standards.

Printed strength, thread retention, knot security, abrasion, and operation on
the actual blind remain physically unverified. The 15 mm diameter requires
thin walls: the default male thread root wall is nominally **0.85 mm**, and the
female thread's minimum outside wall is approximately **0.84 mm**. These are
geometry dimensions, not a load rating.

## Cord extensions and fitting

If the existing connector hits the headrail before the blind fully lowers,
extend **each of the six thin cords**, not just the thicker pull cord. Obtain
suitable extension cord and follow the blind/cord supplier's joining guidance.
The printed parts do not supply the missing cord length.

Support the bottom rail, establish a fully lowered and level position, and
adjust the six effective lengths individually. Do not assume the original
cords should be cut to equal lengths or cut them shorter to fit this part.
Keep every extension joint, knot, and the complete coupler below and clear of
the cord lock/headrail throughout the full travel. If an original end or joint
must enter the lock, replace/rethread the lift cord instead.

With the cover removed, pass all cords through the body from its flat bottom
face into the open chamber. Pass each thin cord through a peripheral hole and
the thick cord through the center and raised seat. Tie supplier-appropriate
stopper knots on the chamber side, larger than their straight bores. Adjust
the lengths with the rail supported and level.

Check the tightened knots and their tails fit freely before screwing on the
cover. The chamber is **10.8 mm across**, with **10 mm height above the floor**
and **7 mm above the raised central seat**. The six small knots must fit below
and around the larger central knot; these are available cavity dimensions, not
guaranteed knot capacities. Keep knots and tails out of the thread and never
use the cover to crush them into place. Increase enclosure dimensions if the
actual knots do not fit. Do not shorten required knot tails just to close it.

Close the cover by hand without forcing it or twisting the attached cords.
With the rail supported, check retention and the whole raise/lower range.
Stop at slipping knots, catching, uneven travel, cracking, loosening, or wear.
Do not force a joint or the coupler into the cord lock. A successful print is
not proof of a safe installation; inspect the parts and cords during use.

## Parameters

All dimensions are millimeters. Edit the source or use OpenSCAD's Customizer.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `part` | `"all"` | Both components, `"body"`, or `"cover"`. |
| `layout` | `"print"` | Parts on the bed, or `"assembled"` for a closed preview. |
| `print_gap` | `4` | Edge-to-edge spacing between parts in the print layout. |
| `thin_cord_diameter` | `1` | Diameter of each thin cord; measure before printing. |
| `pull_cord_diameter` | `3` | Diameter of the central pull cord; measure before printing. |
| `hole_clearance` | `0.4` | Added to cord diameters, not radii. |
| `coupler_diameter` | `15` | Finished outside diameter of the flange and cover. |
| `floor_thickness` | `3` | Body floor thickness. |
| `hole_circle_diameter` | `8.2` | Circle through the six peripheral hole centers. |
| `mouth_chamfer` | `0.2` | 45-degree depth/widening on both ends of each bore; zero disables it. |
| `central_seat_height` | `3` | Height of the raised large-knot seat above the floor; zero disables it. |
| `cover_height` | `11.5` | Cover height; assembled height is this plus the body floor thickness. |
| `cover_top_thickness` | `1.5` | Thickness of the cover's closed top. |
| `cavity_diameter` | `10.8` | Inside diameter of the knot chamber and body collar. |
| `thread_diameter` | `13` | Male thread's major diameter. |
| `thread_length` | `3.6` | Collar height above the body floor; three default pitches. |
| `thread_pitch` | `1.2` | Single-start trapezoidal thread pitch. |
| `thread_depth` | `0.25` | Crest-to-root radial depth. |
| `thread_clearance` | `0.15` | Radial clearance per side, added to the female thread only. |
| `thread_axial_clearance` | `0.2` | Empty pocket beyond the male thread tip. |
| `minimum_wall` | `0.8` | Nominal minimum thread/root and hole-separation wall. Not a strength guarantee. |
| `radial_segments` | `64` | Circular resolution; a multiple of four, at least 48. |

The central seat's radius is derived from the large mouth radius plus
`minimum_wall`. Central bore length is `floor_thickness + central_seat_height`;
each small bore is only `floor_thickness` long. Mouth diameters are straight
bore diameters plus `2 * mouth_chamfer`.

Assertions reject overlapping bores, holes outside the cavity, a seat covering
small holes, insufficient male/female thread walls, excessive socket depth,
and invalid sizes, layouts, or chamfers. Increasing clearance may require
changing other dimensions to retain walls. Defaults at 15 mm are compact;
increase the overall diameter if larger cords, knots, or printer tolerances
cannot fit. Circular tessellation contributes a small additional female thread
allowance, matching the repository's chandelier thread construction.

**Migrating from the rectangular version:** the plate width/length, corner
radius, and row/column layout settings have been replaced by the circular
dimensions above. Re-export the model; old plate STLs are not compatible with
this cover. Knot routing has changed so that all knots are on the covered side.

## Preview, printing, and export

Open `designs\blind-cord-coupler\blind_cord_coupler.scad` in OpenSCAD 2021.01
or later. The default print layout shows both components separately. The body
rests on its flat cord-entry face; the cover rests on its closed top with its
opening upward. Preview with **F5**, render with **F6**, then export.
Select `layout="assembled"` to view the closed result, not to export a
print-in-place assembly.

No library installation or `OPENSCADPATH` configuration is needed. From the
repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force designs\blind-cord-coupler\exports | Out-Null
& 'C:\Program Files\OpenSCAD\openscad.exe' `
  -o designs\blind-cord-coupler\exports\blind-cord-coupler.stl `
  designs\blind-cord-coupler\blind_cord_coupler.scad | Out-Host

& 'C:\Program Files\OpenSCAD\openscad.exe' `
  -D 'part="body"' `
  -o designs\blind-cord-coupler\exports\blind-cord-coupler-body.stl `
  designs\blind-cord-coupler\blind_cord_coupler.scad | Out-Host

& 'C:\Program Files\OpenSCAD\openscad.exe' `
  -D 'part="cover"' `
  -o designs\blind-cord-coupler\exports\blind-cord-coupler-cover.stl `
  designs\blind-cord-coupler\blind_cord_coupler.scad | Out-Host
```

Use your executable path, or `openscad` if it is on PATH. `Out-Host` makes
PowerShell wait for the Windows executable. Exports are ignored by Git.
The combined STL contains two separated printable parts; the individual
exports each contain just the selected component, resting at Z=0.

PETG is a starting material choice, not a safety rating. Start with a 0.4 mm
nozzle, 0.15 mm layers, two continuous wall lines, and solid floors/top.
Inspect the sliced thin thread walls and small bores. The open-up cover avoids
bridging its entire roof, and 45-degree thread flanks and mouth chamfers are
intended to print without support. Do a fit print first; fine threads and
small bores may need printer-specific adjustment.

Deburr the cord-contact mouths without enlarging bores enough for knots to
pull through. Check the cover turns freely without cross-threading or
loosening, and do not use glue to conceal poor fit. These settings do not
establish printed strength, knot retention, or a reliable thread fit.

## Regression checks

```powershell
$env:OPENSCAD='C:\Program Files\OpenSCAD\openscad.exe'
node --test designs\blind-cord-coupler\tests\model.test.mjs
```

Node.js 18+ and OpenSCAD are required. Tests check two separate watertight
printable components, the default 15 mm envelope, all six 60-degree peripheral
holes and the central hole, chamfers, raised seat, enclosed knot space, resized
dimensions, and individual-part exports. They also check mating poses for solid
interference and deliberately misphase the threads to verify actual engagement.
Invalid-input checks assert the intended diagnostics, and rendering must leave
saved settings unchanged. Physical operation and mechanical safety are not tested.
