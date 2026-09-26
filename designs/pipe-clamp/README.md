# Pipe clamp

[All designs](../../README.md)

A parametric split circular clamp with two tightening tabs and a screw hole
running across them along Y. The pipe bore runs along Z. The supplied geometry
and defaults are preserved: a **20 mm diameter bore**, **60 mm nominal outside
diameter**, **12 mm height**, and **7 mm diameter screw hole**.
Including the tabs, the footprint is nominally **72 x 60 mm**.
Circular surfaces use 50 facets, so measured mesh bounds can be slightly smaller.

## Parameters

All dimensions are millimeters. Edit the source settings or use the OpenSCAD
Customizer.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `pipe_radius` | `10` | Bore radius; no additional fit clearance is applied. |
| `clamp_height` | `12` | Height along the pipe axis (Z). |
| `wall_thickness` | `20` | Radial thickness; outside radius is `pipe_radius + wall_thickness`. |
| `screw_radius` | `3.5` | Radius of the through-hole along Y, centered halfway up the tabs. |
| `slit_width` | `1.5` | Full gap between the tabs, extending from the bore through the positive-X side. |
| `tab_length` | `14` | Tab length along X, including the overlap into the ring. |
| `tab_depth` | `10` | Extent on either side of Y=0; total tab depth is twice this value. |
| `tab_overlap` | `2` | Distance the tab block starts inside the ring's outside radius. |

The hidden `epsilon=0.01` extends cuts beyond coincident faces, and `$fn=50`
sets circular resolution. Neither is a manufacturing tolerance.
The screw center is at
`X = outer_radius + (tab_length - tab_overlap) / 2`, `Z = clamp_height / 2`.
There are no nut traps, countersinks, or bolt-head recesses.

## Preview and export

Open `designs\pipe-clamp\pipe_clamp.scad` in OpenSCAD 2021.01 or later.
Press **F5** to preview, adjust dimensions, then press **F6** and export as STL.
This design needs no SVGs, fonts, or external OpenSCAD libraries.

Alternatively, from the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force designs\pipe-clamp\exports | Out-Null
& 'C:\Program Files\OpenSCAD\openscad.exe' `
  -o designs\pipe-clamp\exports\pipe-clamp.stl `
  designs\pipe-clamp\pipe_clamp.scad
```

Use your OpenSCAD executable path, or `openscad` if it is on PATH.
For another pipe size, add a definition such as `-D 'pipe_radius=12.5'`.
Exports are ignored by Git.

## Printing and fit

The model rests flat at Z=0, with the pipe opening vertical. The horizontal
screw hole may need bridging or local support depending on the printer and
material. Check it in the slicer and clear any support before assembly.
Choose screw length for the 20 mm tab depth plus the head, nut, and washers.

The supplied **20 mm radial wall is intentionally retained**, not changed
to 2 mm. It produces a thick ring; flexibility and clamping force depend on
dimensions, material, and print settings. Tune bore clearance and screw fit
with a test print rather than assuming nominal dimensions will fit exactly.
No load rating or physical clamping performance has been verified.

When changing dimensions, keep both tabs fused to the ring, leave material
above and below the screw hole, and ensure the slit does not remove the tabs.
Parameters are not automatically clamped or validated; inspect the rendered
geometry before printing.

## Regression checks

From the repository root, with Node.js 18+ and OpenSCAD installed:

```powershell
$env:OPENSCAD='C:\Program Files\OpenSCAD\openscad.exe'
node --test designs\pipe-clamp\tests\model.test.mjs
```

Checks render the saved model and a resized configuration, verify a single
watertight mesh, and check dimensions, bore, slit, tab attachment, and screw
clearance. They do not validate mechanical strength.
