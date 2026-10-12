# Boston HS 40 speaker foot

[All designs](../../README.md)

A parametric replacement foot based on a measured Boston HS 40 speaker foot
and its hand-drawn outline. The default plate is **118.4 mm long, 5 mm thick**,
with a **30 mm-wide body**, a semicircular top, and a **40 mm-wide flared bottom**.
Its side profile bends out of plane starting **87 mm down from the rounded top**.
No external OpenSCAD libraries or assets are required.

The detailed flare curvature, toe radius, and bend amount were not measured.
The smooth contour and **3 mm midplane tip offset** are adjustable modeling
approximations, not an exact tracing of the original part. The bend offset is
provisional and should be checked against the original. Confirmed dimensions
below are modeled directly, without added fit clearance.

## Measurements and parameters

All dimensions are millimeters. Every `*_from_top` distance is measured
**down from the very top tip**, not from where the semicircle meets the sides.
Edit the source settings or use the OpenSCAD Customizer.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `overall_length` | `118.4` | Projected Y length from the top tip to the two lowest bottom points. |
| `body_width` | `30` | Straight body width; the top semicircle radius is half this value. |
| `base_width` | `40` | Maximum width of the flared bottom. |
| `plate_thickness` | `5` | Thickness normal to the straight or curved side profile. |
| `flare_start_from_top` | `90` | Start of the flare, 28.4 mm above the bottom with the default length. |
| `bottom_rise` | `3` | Height of the inward-curving bottom edge at its center. |
| `toe_radius` | `5` | **Unmeasured** rounded-toe radius; adjust to match the original contour. |
| `bend_start_from_top` | `87` | Start of the out-of-plane bend, measured from the rounded top tip. |
| `bend_tip_offset` | `3` | **Provisional** signed midplane offset at the bottom; positive bends toward the recessed face. |
| `large_hole_diameter` | `12` | Diameter of the large through-hole. |
| `large_hole_from_top` | `56` | Large-hole center position. |
| `recess_width` | `12.5` | Capsule width and diameter of its circular ends. |
| `recess_length` | `28` | Total capsule length, including both rounded ends. |
| `recess_depth` | `3` | Depth cut into the front face, leaving a 2 mm floor by default. |
| `recess_start_from_top` | `8` | Uppermost edge of the recess, measured from the rounded top tip. |
| `small_hole_diameter` | `6.3` | Diameter of both small through-holes in the recess floor. |

All holes and the recess are centered across the face. The two small holes
follow the recess's end-circle centers automatically. With the defaults, their
centers are **14.25 and 29.75 mm down from the top**, **15.5 mm apart**.
The recess extends from **8 to 36 mm down from the rounded top tip**.

The recess is toward the rounded top, **above the large hole**, matching the
sketch. Its position remains adjustable.

X runs across the face, Y runs upward from the bottom, and Z runs through the
thickness. The straight mounting section's back is at Z=0 and its recessed
front is at Z=5 by default.
The large-hole center is at Y=62.4. The recess spans Y=82.4 to Y=110.4, with its
small-hole centers at Y=88.65 and Y=104.15.

The hidden `curve_steps=48` samples the smooth outline, `bend_steps=48`
samples the curved side profile, `$fn=96` controls hole and recess resolution,
and `epsilon=0.01` extends cutters beyond exterior faces.
Epsilon is a numerical overlap, not a manufacturing tolerance. Circular curves
are tessellated in exported meshes.

The flare uses cubic curves tangent to the straight body and quarter-circle
toes. The bottom edge rises smoothly between the toes. Changing the flare
position, widths, toe radius, or bottom rise changes this approximate contour.

## Side-profile bend

The bend starts at Y=31.4, which is **87 mm down from the top**, just before
the face outline starts flaring at 90 mm. These are separate features.
The lower profile follows a circular arc tangent to the straight section.
Concentric front and back arcs preserve the 5 mm thickness normal to the bend,
rather than thinning the plate by merely shifting vertical slices.

With `bend_tip_offset=3`, the middle of the thickness at the two bottom tips
is displaced 3 mm toward the recessed face. This amount and direction are
estimated from the sketch, not measured. Set a measured offset to match the
original, use a negative offset to bend away from the recessed face, or set
it to **zero to restore the flat profile**.
With a zero offset, the bend-start setting has no effect.

The broad-face silhouette and its 118.4 mm projected length are unchanged;
the curved surface is slightly longer than its Y projection. The default
overall Z height is approximately 8.047 mm, even though the plate itself
remains 5 mm thick. All mounting features stay in the straight section, so
the 8 mm recess offset, hole positions, diameters, and 2 mm recess floor
remain unchanged.

## Valid settings

Invalid settings stop rendering with an explanatory assertion instead of
silently changing a dimension:

- The base cannot be narrower than the body. The flare must start below
  the semicircular cap and above the rounded toes.
- The toe radius must be positive and smaller than half the base width.
  The bottom rise may be zero but must be smaller than the toe radius.
- The large hole and recess must fit inside the body width, stay above
  the toe region, and not overlap each other. The large hole must stay below
  the top cap. The recess may extend into the cap but must stay below the
  top tip; it may be positioned above or below the large hole.
- The capsule length must exceed its width. Its depth must be positive
  and less than the plate thickness.
- Small holes must be narrower than the recess and remain separate.
  Their center spacing is `recess_length - recess_width`.
- For an enabled bend, its start must be below the top cap and above the toes.
  The tip offset must be smaller than the bent section's projected length,
  and the bend must be gentle enough to preserve the full plate thickness.
  Mounting holes and the entire recess must stay above the bend. Disable the
  bend with `bend_tip_offset=0` to use mounting features farther down the plate.
- Outline and bend resolutions must be even integers of at least 8.

These checks keep the features in a conservative interior region; they do not
establish the part's mechanical strength or real-world fit.

## Preview and export

Open `designs\boston-hs40-foot\boston_hs40_foot.scad` in OpenSCAD 2021.01 or later.
Press **F5** to preview, adjust dimensions, then press **F6** and export as STL.
View from above to see the outline, through-holes, and rounded recess, and
from the side to inspect the out-of-plane bend.

Alternatively, from the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force designs\boston-hs40-foot\exports | Out-Null
& 'C:\Program Files\OpenSCAD\openscad.exe' `
  -o designs\boston-hs40-foot\exports\boston-hs40-foot.stl `
  designs\boston-hs40-foot\boston_hs40_foot.scad
```

Use your OpenSCAD executable path, or `openscad` if it is on PATH.
For a parameter override, add a definition such as `-D 'toe_radius=4'`.
Generated files belong in this design's ignored `exports` directory.

## Printing and fit

With the default positive bend, place the straight back section on the bed
and the recessed face upward. The holes remain vertical and the recess is
open upward, but the lifted underside of the bent end may require support.
Inspect it in your slicer rather than assuming the whole back is flat.
A negative bend extends below Z=0 and needs appropriate placement and support.
With `bend_tip_offset=0`, the back is flat and the modeled features need no
support in the original orientation.

Test the mounting-hole fit, bend amount and direction, and approximate bottom
contour against the original before putting the speaker on the replacement.
There is no automatic shrinkage
or hole compensation. Adjust the relevant diameter explicitly if a test print
needs clearance. No printed fit, load capacity, or speaker stability has been
physically verified.

## Regression checks

From the repository root, with Node.js 18+ and OpenSCAD installed:

```powershell
$env:OPENSCAD='C:\Program Files\OpenSCAD\openscad.exe'
node --test designs\boston-hs40-foot\tests\model.test.mjs
```

Checks render the defaults, a resized model, a reversed bend, and flat-profile
variants with mounting features above and below the large hole. They verify
one connected watertight shell, projected outline dimensions, the exact bend
start, bent-tip positions, normal plate thickness, the semicircular top, body
and flare widths, rounded toes, bottom rise, hole positions and diameters,
capsule ends and footprint, recess depth, and remaining floor. They also check
rejected settings and that rendering preserves the saved source. These are
geometry checks, not mechanical qualification.
