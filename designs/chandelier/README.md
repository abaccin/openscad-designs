# Chandelier

[All designs](../../README.md)

A parametric adaptation of the supplied chandelier STL: a flanged base with a
stepped through-bore and a hollow ellipsoidal dome with a central top opening.
The cylinder screws into an integrated female-threaded socket inside the dome.
The reference's separate thin ring is removed. The script does **not** import
or require the original STL. Its **BOSL2** thread library is bundled with the
repository.

Dimensions are interpreted as millimeters because STL does not encode units.
Measured defaults preserve the reference's exterior dimensions, while smoother
circular and elliptical profiles replace its coarse facets and small export
irregularities. This is not an exact reproduction of the original triangles.
The dome is elliptical, not spherical, and its wall thickness varies. Its
lower cavity is intentionally reshaped into a threaded socket; it no longer
reproduces the original oversized bottom opening.

## Bundled BOSL2

[BOSL2](https://github.com/BelfrySCAD/BOSL2) is included under the repository's
root `include\BOSL2` folder. The source references its `std.scad` and
`threading.scad` using paths relative to `chandelier.scad`. All their
transitive includes are bundled, so neither a separate BOSL2 installation nor
an `OPENSCADPATH` setting is needed, in the GUI or on the command line.
Keep the repository's folder structure intact when moving the design.

The bundled files are unmodified from revision `d6d18450` and retain the
upstream BSD-2-Clause license. See [include documentation](../../include/README.md)
for provenance. This design was checked with OpenSCAD 2021.01; it uses
`trapezoidal_threaded_rod()`, including blunt starts and numeric end bevels.

## Output and resolution

| Parameter | Default | Meaning |
| --- | --- | --- |
| `part` | `"all"` | `"all"`, `"base"`, or `"dome"`. Individual parts are centered at the origin with their bottom at Z=0, regardless of `layout`. There is no ring output. |
| `layout` | `"print"` | `"print"` separates the two bodies along X at Z=0; `"assembled"` seats the dome on the flange; `"source"` retains the original base/dome positions. Used only for `part="all"`. |
| `print_gap` | `10` | Edge-to-edge spacing in the print layout; must be positive to keep the bodies separate. |
| `radial_segments` | `128` | Circular resolution; an integer of at least 24. Multiples of four include the exact cardinal-axis bounds. |
| `profile_segments` | `64` | Segments along each elliptical dome profile; an integer of at least 8. |

The assembled layout places the dome at Z=`flange_height` so the cylinder
enters its socket and the dome's lower rim seats on the flange. It is a visual
assembly check, **not an export layout for printing the parts together**.
Export `"base"` and `"dome"` separately, or use the default print layout.

The source layout places the base at `[-11.25, -44.2495, 0]` and the dome at
`[-63, -2, 0]`. This is a reference arrangement, not an assembly. Substantial
dimension changes can make bodies overlap in this fixed layout; use the
adaptive print layout for resized designs.

## Dimensions

Edit the source settings or use the OpenSCAD Customizer.

| Parameter | Default (mm) | Meaning |
| --- | --- | --- |
| `flange_diameter` | `63.5` | Base flange outside diameter. |
| `flange_height` | `4` | Base flange thickness. |
| `collar_diameter` | `41.5` | Major diameter of the cylinder's external thread. |
| `base_height` | `30` | Overall base height, including the flange. |
| `lower_bore_diameter` | `34.204` | Through-opening diameter below the bore shoulder. |
| `lower_bore_height` | `2.998` | Height of the shoulder above the bottom. |
| `upper_bore_diameter` | `36.504` | Bore diameter above the shoulder. |
| `dome_diameter` | `60` | Dome outside diameter at the bottom. |
| `dome_height` | `41.2374` | Finished height at the top opening, not the uncut ellipse's apex. |
| `dome_inner_diameter` | `55.006` | Horizontal diameter of the original interior ellipse; only the portion above the socket remains. |
| `dome_inner_height` | `35` | Interior ellipse vertical semiaxis before truncation by the top hole. |
| `dome_inner_offset` | `1.879` | Height offset of the interior ellipse. |
| `top_hole_diameter` | `10` | Diameter of the continuous central top opening. |

The outer ellipse's vertical semiaxis is derived from `dome_height` and the
top-hole radius so that higher resolution does not increase the finished
height. The original upper elliptical cavity and the top hole remain open
above the new socket.

## Coarse thread and printing tolerance

The thread uses BOSL2's 90-degree trapezoidal profile, giving 45-degree flanks
for vertical printing, flat crests, and blunt thread starts. It is a custom
printed joint, not a standard metal fastener. The right-handed, single-start
thread extends along the cylinder's 26 mm height above the flange.

| Parameter | Default (mm) | Meaning |
| --- | --- | --- |
| `thread_pitch` | `4` | Axial spacing between turns. A single-start thread advances 4 mm per revolution. Larger values mean a coarser thread. |
| `thread_depth` | `1` | Radial crest-to-root depth. Kept shallower than half the pitch to preserve the hollow cylinder's wall. |
| `thread_clearance` | `0.25` | Radial clearance per side, added to the female thread only. This adds 0.5 mm diametrically, plus BOSL2's polygonal-hole compensation. |
| `thread_axial_clearance` | `0.4` | Extra cavity depth beyond the cylinder's end when the dome is seated on the flange. |
| `thread_chamfer` | `0.25` | 45-degree chamfer on the male tip and female entrance, in addition to BOSL2's blunt-start lead-ins. |
| `minimum_wall` | `1.2` | Minimum nominal radial wall at male roots/tip and around the female socket; not a strength rating. |

Both parts use the same pitch, diameter, depth, and handedness. BOSL2 applies
`2*$slop` radially to internal thread masks, so the model passes
`$slop=thread_clearance/2`. The internal profile is rotated 180 degrees to
match the male helix. Neither part is scaled to introduce clearance.

Increasing pitch does not automatically deepen the thread. A 4 mm pitch with
1 mm depth leaves about 1.498 mm of wall at the male roots and 1.248 mm at the
chamfered tip with the saved 36.504 mm bore. The female receiver is integrated
into the dome, with a short clearance pocket above its threads so the tip
does not bottom out before the rim reaches the flange.

Invalid output choices or dimensions cause explicit assertion errors.
For the base, keep `lower bore <= upper bore < collar <= flange` diameters
and `lower bore < flange < overall` heights. The thread roots, tip chamfer,
and female socket must retain `minimum_wall`, the depth must be less than
half the pitch, and the cylinder must have room for two pitches plus chamfers.
For the dome, keep `hole < interior < outside` diameters; the socket must
reach `dome_inner_offset`, and its tip clearance must end below the upper
cavity's top. Shared connection settings are checked for either individual
part so both exports remain compatible.

The hidden `epsilon=0.01` extends cuts beyond coincident faces.
It is not a manufacturing clearance and does not change bore diameters.

## Preview and export

Open `designs\chandelier\chandelier.scad` in OpenSCAD 2021.01 or later.
Preview with **F5**, adjust the dimensions, then render with **F6** before
exporting STL. The bundled `include` folder must remain at the repository
root; no fonts or original STL assets are needed.

From the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force designs\chandelier\exports | Out-Null
& 'C:\Program Files\OpenSCAD\openscad.com' `
  -o designs\chandelier\exports\chandelier.stl `
  designs\chandelier\chandelier.scad
```

Use `openscad.com` for synchronous Windows console commands, or `openscad`
on systems where it is on PATH. To export a single body, add
`-D 'part="dome"'` or `-D 'part="base"'`.
For the seated assembly preview, use `-D 'layout="assembled"'`.
For the original reference arrangement, add `-D 'layout="source"'`.
For example:

```powershell
& 'C:\Program Files\OpenSCAD\openscad.com' `
  -D 'part="dome"' -D 'thread_clearance=0.3' `
  -o designs\chandelier\exports\dome.stl `
  designs\chandelier\chandelier.scad
```

Generated files under `exports` are ignored by Git.

## Printing and fit

The default print layout places both parts on the bed, with the thread axes
vertical. The socket is part of the dome; there are no separate rings or nuts.
Inspect the slicer for thread flanks, wall continuity, and the male tip.

Start with the saved **0.25 mm per-side clearance**, then calibrate using the
same material, nozzle, layer height, and orientation as the final parts.
For example, try 0.2 mm for a tighter fit or 0.3 mm for a looser fit; do not
assume either will fit your printer. Export both parts using identical joint
settings, changing only the clearance on the female side as implemented.
Do not scale one part in the slicer, since scaling changes the pitch too.
Smaller layer heights may reproduce the flanks better; compensate for
elephant's foot so the dome's entrance is not pinched.

For a shorter trial joint, set `base_height=16` **for both exports**, giving
a 12 mm threaded cylinder, then restore 30 mm for the final pair. The dome's
outside size stays unchanged. A digital interference check does not establish
physical fit, durability, retention under vibration, or load-bearing strength.
Do not force a cross-threaded joint. Tighten until the rim meets the flange,
without relying on the tip as a stop.

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

Checks cover bundled include completeness, two watertight print bodies,
exterior bounds, the stepped base bore, helical pitch/depth, measured
male/female radial clearance, the dome's
upper cavity and opening, print/source/assembled layouts, resizing, and
explicit invalid-input failures. Solid-intersection checks exercise seated
and partially unscrewed positions, while a deliberately misphased connection
must interfere. The flange's intended planar seat contact is excluded from
thread interference checks.
Every render uses an isolated library search path to verify that the bundled
includes work without an external BOSL2 checkout.
Representative original outer cross-section samples must lie within
**0.15 mm** of the reconstructed radial surface.
Cylindrical bounds use a 0.02 mm tolerance, and the dome's finished height
uses 0.05 mm. These are geometric regression tolerances, not print allowances.
