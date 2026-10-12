# Boston HS 40 speaker foot

[All designs](../../README.md)

A parametric replacement foot based on a measured Boston HS 40 speaker foot
and its hand-drawn outline. The default plate is **118.4 mm long, 5 mm thick**,
with a **30 mm-wide body**, a semicircular top, and a **40 mm-wide flared bottom**.
The slight curve is in the broad-face outline; the plate is not bent out of plane.
No external OpenSCAD libraries or assets are required.

The detailed flare curvature and toe radius were not measured. They are smooth
modeling approximations, not an exact tracing of the original part. All confirmed
dimensions below are modeled directly, without added fit clearance.

## Measurements and parameters

All dimensions are millimeters. Every `*_from_top` distance is measured
**down from the very top tip**, not from where the semicircle meets the sides.
Edit the source settings or use the OpenSCAD Customizer.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `overall_length` | `118.4` | Top tip to the two lowest bottom points. |
| `body_width` | `30` | Straight body width; the top semicircle radius is half this value. |
| `base_width` | `40` | Maximum width of the flared bottom. |
| `plate_thickness` | `5` | Constant front-to-back thickness. |
| `flare_start_from_top` | `90` | Start of the flare, 28.4 mm above the bottom with the default length. |
| `bottom_rise` | `3` | Height of the inward-curving bottom edge at its center. |
| `toe_radius` | `5` | **Unmeasured** rounded-toe radius; adjust to match the original contour. |
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
thickness. The back rests at Z=0; the recessed front is at Z=5 by default.
The large-hole center is at Y=62.4. The recess spans Y=82.4 to Y=110.4, with its
small-hole centers at Y=88.65 and Y=104.15.

The hidden `curve_steps=48` samples the smooth outline, `$fn=96` controls hole
and recess resolution, and `epsilon=0.01` extends cutters beyond exterior faces.
Epsilon is a numerical overlap, not a manufacturing tolerance. Circular curves
are tessellated in exported meshes.

The flare uses cubic curves tangent to the straight body and quarter-circle
toes. The bottom edge rises smoothly between the toes. Changing the flare
position, widths, toe radius, or bottom rise changes this approximate contour.

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
- Outline resolution must be an even integer of at least 8.

These checks keep the features in a conservative interior region; they do not
establish the part's mechanical strength or real-world fit.

## Preview and export

Open `designs\boston-hs40-foot\boston_hs40_foot.scad` in OpenSCAD 2021.01 or later.
Press **F5** to preview, adjust dimensions, then press **F6** and export as STL.
View from above to see the outline, through-holes, and rounded recess.

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

Print with the flat back on the bed and the recessed face upward. The holes
are vertical and the recess is open upward, so the modeled features need no
support in this orientation. Inspect the exported model in your slicer.

Test the mounting-hole fit and approximate bottom contour against the original
before putting the speaker on the replacement. There is no automatic shrinkage
or hole compensation. Adjust the relevant diameter explicitly if a test print
needs clearance. No printed fit, load capacity, or speaker stability has been
physically verified.

## Regression checks

From the repository root, with Node.js 18+ and OpenSCAD installed:

```powershell
$env:OPENSCAD='C:\Program Files\OpenSCAD\openscad.exe'
node --test designs\boston-hs40-foot\tests\model.test.mjs
```

Checks render the defaults, a resized model, and a repositioned recess with a
flat bottom. They verify one connected watertight shell, overall dimensions,
the semicircular top, body and flare widths, rounded toes, bottom rise, hole
positions and diameters, capsule ends and footprint, recess depth, and remaining
floor. They also check rejected settings and that rendering preserves the
saved source. These are geometry checks, not mechanical qualification.
