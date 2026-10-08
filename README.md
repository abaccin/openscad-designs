# OpenSCAD designs

A collection of parametric OpenSCAD designs for 3D printing. Each design has
its own folder, source, assets, and usage guide. Dimensions are in millimeters;
OpenSCAD 2021.01 or later is required. The drawer box and pipe clamp need no
external libraries; the chandelier uses [BOSL2](https://github.com/BelfrySCAD/BOSL2).

## Designs

| Design | Source | Description |
| --- | --- | --- |
| [Drawer box](designs/drawer-box/README.md) | [round_box_drawer.scad](designs/drawer-box/round_box_drawer.scad) | Rounded organizer with dividers, stacking, sliding or magnetic lids, and optional multi-color decoration. |
| [Pipe clamp](designs/pipe-clamp/README.md) | [pipe_clamp.scad](designs/pipe-clamp/pipe_clamp.scad) | Split circular clamp with tightening tabs and a transverse screw hole; defaults to a 20 mm pipe bore. |
| [Chandelier](designs/chandelier/README.md) | [chandelier.scad](designs/chandelier/chandelier.scad) | Flanged base and ellipsoidal dome joined by coarse, clearance-adjustable BOSL2 threads, with print and assembled layouts. |

Open a design's `.scad` file, adjust its settings, preview with **F5**, then
render with **F6** before exporting. Keep any referenced assets beside the
source. See each design's README for fit, printing, and export instructions.

## Repository layout

```text
designs\
  drawer-box\
    README.md
    round_box_drawer.scad
    ab-logo-monochrome.svg
    robot-relief.svg
    scripts\
    tests\
  pipe-clamp\
    README.md
    pipe_clamp.scad
    tests\
  chandelier\
    README.md
    chandelier.scad
    tests\
tests\
  helpers\
    mesh.mjs
```

Design-specific scripts and tests live with their design. Reusable mesh
checks live in the root `tests\helpers` directory. Generated files belong in
an `exports` directory within the relevant design; `exports` directories
are ignored by Git.

**Migrating from the drawer-box-only layout:** the original model, SVGs,
export scripts, and guide now live in `designs\drawer-box`. The model's saved
settings and geometry are unchanged. Run the existing commands from that
directory:

```powershell
Set-Location designs\drawer-box
node scripts\export-3mf.mjs
```

The default project is now `designs\drawer-box\exports\drawer-box.3mf`.
These exporters remain specific to the drawer box, not to every design.

## Checks

Tests require Node.js 18+ and OpenSCAD 2021.01+; no npm install is needed.
From the repository root, run an individual design's checks or the full collection:

```powershell
$env:OPENSCAD='C:\Program Files\OpenSCAD\openscad.exe'
node --test designs\pipe-clamp\tests\model.test.mjs
$env:OPENSCADPATH='C:\src' # Parent of the BOSL2 folder; see the chandelier guide.
node --test designs\chandelier\tests\model.test.mjs
node --test
```

Set `OPENSCAD` to your installation, or omit it if `openscad` is on PATH.
The full drawer-box geometry suite can take several minutes and includes
PNG previews requiring a working display. Its optional Bambu Studio
round-trip checks are skipped when Bambu Studio is unavailable.

## Adding a design

Create `designs\<design-name>` with a descriptive `.scad` filename and a
README covering parameters, units, dependencies, and printing guidance.
Keep design-specific assets and optional tools there, add regression checks
under its `tests` directory, and add an entry to the catalog above.
Do not commit generated exports.

## Contributions

All updates to `main` must go through a pull request. Create a feature
branch, make and check the changes there, push that branch, and open a PR.
Do not push changes directly to `main` or bypass branch protection.

## Licensing

A license has not yet been specified for the source or artwork. Public
availability alone does not grant a license to reuse or redistribute them.
