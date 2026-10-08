# Shared includes

This folder contains the third-party OpenSCAD libraries required by the
designs. Models reference these files using paths relative to their own source
files; no separate installation or `OPENSCADPATH` setting is required.
Keep this folder at the repository root.

## BOSL2

- Upstream: [BelfrySCAD/BOSL2](https://github.com/BelfrySCAD/BOSL2).
- Revision: `d6d184505210c8b7bee76c4195905a34e7ded1a5`.
- License: [BSD-2-Clause](BOSL2/LICENSE), with upstream notices preserved.
- Used by: [Chandelier](../designs/chandelier/README.md).

`BOSL2` contains unmodified copies of `std.scad`, `threading.scad`, and every
file they transitively include or use: 33 SCAD files in total. Unrelated
optional modules, examples, documentation, and upstream tests are not bundled.

To update, copy both entry points and their complete transitive include/use
dependencies from one upstream revision, preserve the license and source
notices, update the revision above, and run the chandelier regression checks.
Do not edit individual vendored files or mix revisions.
