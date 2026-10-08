# Chandelier

[All designs](../../README.md)

A standalone parametric reconstruction of the supplied chandelier STL: a flanged
base with a stepped through-bore, a thin ring, and a hollow ellipsoidal dome
with a central top opening. All three disconnected bodies from the reference
are retained. The script does **not** import or require the original STL.

Dimensions are interpreted as millimeters because STL does not encode units.
Measured defaults preserve the reference's main dimensions, while smoother
circular and elliptical profiles replace its coarse facets and small export
irregularities. This is not an exact reproduction of the original triangles.
The dome is elliptical, not spherical, and its wall thickness varies.

## Output and resolution

| Parameter | Default | Meaning |
| --- | --- | --- |
| `part` | `"all"` | `"all"`, `"base"`, `"ring"`, or `"dome"`. Individual parts are centered at the origin with their bottom at Z=0, regardless of `layout`. |
| `layout` | `"print"` | `"print"` separates the three bodies along X at Z=0. `"source"` retains their original positions. Used only for `part="all"`. |
| `print_gap` | `10` | Edge-to-edge spacing in the print layout; must be positive to keep the bodies separate. |
| `radial_segments` | `128` | Circular resolution; an integer of at least 24. Multiples of four include the exact cardinal-axis bounds. |
| `profile_segments` | `64` | Segments along each elliptical dome profile; an integer of at least 8. |

The source layout places the base at `[-11.25, -44.2495, 0]`, the ring at
`[-11.25, -44.2495, 1.1]`, and the dome at `[-63, -2, 0]`. The ring remains
inside the base's lower opening, raised above the bed. This is a reference
arrangement, **not an assembled or print-ready configuration**. Substantial
dimension changes can make bodies overlap in this fixed layout; use the
adaptive print layout for resized designs.

## Dimensions

Edit the source settings or use the OpenSCAD Customizer.

| Parameter | Default (mm) | Meaning |
| --- | --- | --- |
| `flange_diameter` | `63.5` | Base flange outside diameter. |
| `flange_height` | `4` | Base flange thickness. |
| `collar_diameter` | `41.5` | Outside diameter of the upright base collar. |
| `base_height` | `30` | Overall base height, including the flange. |
| `lower_bore_diameter` | `34.204` | Through-opening diameter below the bore shoulder. |
| `lower_bore_height` | `2.998` | Height of the shoulder above the bottom. |
| `upper_bore_diameter` | `36.504` | Bore diameter above the shoulder. |
| `ring_outer_diameter` | `34.2` | Thin ring outside diameter. |
| `ring_inner_diameter` | `33.004` | Thin ring through-opening diameter. |
| `ring_height` | `1.8` | Ring thickness along Z. |
| `dome_diameter` | `60` | Dome outside diameter at the bottom. |
| `dome_height` | `41.2374` | Finished height at the top opening, not the uncut ellipse's apex. |
| `dome_inner_diameter` | `55.006` | Maximum elliptical cavity diameter, at the top of the bottom ledge. |
| `dome_inner_height` | `35` | Interior ellipse vertical semiaxis before truncation by the top hole. |
| `dome_opening_height` | `1.879` | Height of the cylindrical bottom opening and start of the elliptical cavity. |
| `dome_opening_diameter` | `54.45` | Through-opening diameter below the interior ledge. |
| `top_hole_diameter` | `10` | Diameter of the continuous central top opening. |

The outer ellipse's vertical semiaxis is derived from `dome_height` and the
top-hole radius so that higher resolution does not increase the finished
height. The interior ellipse starts at `dome_opening_height` and ends where
it meets the top-hole radius. The short cylindrical opening below it preserves
the reference's bottom ledge.

Invalid output choices or dimensions cause explicit assertion errors.
For the base, keep `lower bore <= upper bore < collar <= flange` diameters
and `lower bore < flange < overall` heights. For the dome, keep
`hole < opening <= interior < outside` diameters; the cavity must end below
the finished height and stay inside the outer profile. The ring requires
positive wall thickness. Only the selected bodies' dimensions are checked.

The hidden `epsilon=0.01` extends base/ring cuts beyond coincident faces.
It is not a manufacturing clearance and does not change bore diameters.

## Preview and export

Open `designs\chandelier\chandelier.scad` in OpenSCAD 2021.01 or later.
Preview with **F5**, adjust the dimensions, then render with **F6** before
exporting STL. No external libraries, fonts, or assets are needed.

From the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force designs\chandelier\exports | Out-Null
& 'C:\Program Files\OpenSCAD\openscad.com' `
  -o designs\chandelier\exports\chandelier.stl `
  designs\chandelier\chandelier.scad
```

Use `openscad.com` for synchronous Windows console commands, or `openscad`
on systems where it is on PATH. To export a single body, add
`-D 'part="dome"'`, `-D 'part="base"'`, or `-D 'part="ring"'`.
For the original reference arrangement, add `-D 'layout="source"'`.
For example:

```powershell
& 'C:\Program Files\OpenSCAD\openscad.com' `
  -D 'part="dome"' -D 'top_hole_diameter=12' `
  -o designs\chandelier\exports\dome.stl `
  designs\chandelier\chandelier.scad
```

Generated files under `exports` are ignored by Git.

## Printing and fit

The default print layout places all three pieces on the bed and exposes the
otherwise nested ring. The ring's wall is only about **0.598 mm** radially;
confirm that the slicer actually produces it with your nozzle and settings.

The measured ring-to-base radial clearance is approximately **0.002 mm**.
That nominal relationship is intentionally preserved, not presented as a
usable printing tolerance. Adjust the ring and bore dimensions after a fit
test. No mating, fastening, or load-bearing performance has been verified.

The dome's enclosed curvature and top opening may need support depending on
material, orientation, and printer settings. Inspect the rendered model and
slicer preview, including thin walls, bridging, and support removal.

This reconstruction does not establish compatibility with any particular
lamp or socket standard. It is **not a certified lighting component**:
electrical insulation, heat resistance, flame behavior, and mechanical
suitability have not been evaluated. Do not infer safe service near hot
lamps or mains wiring from geometric similarity.

## Regression checks

From the repository root, with Node.js 18+ and OpenSCAD installed:

```powershell
$env:OPENSCAD='C:\Program Files\OpenSCAD\openscad.exe'
node --test designs\chandelier\tests\model.test.mjs
```

Checks cover separate watertight bodies, measured bounds, the stepped base
bore, thin ring, dome cavity and openings, source and print layouts, resizing,
and explicit invalid-input failures. Representative source cross-section
samples must lie within **0.15 mm** of the reconstructed radial surface.
Cylindrical bounds use a 0.02 mm tolerance, and the dome's finished height
uses 0.05 mm. These are geometric regression tolerances, not print allowances.
