# Shared includes

This folder contains shared helpers and the third-party OpenSCAD libraries required by the
designs. Models reference these files using paths relative to their own source
files; no separate installation or `OPENSCADPATH` setting is required.
Keep this folder at the repository root.

## Assertion diagnostics

`assertions.scad` provides the project-authored `assertion_message(message, values)`
function. Use it as the message argument of native `assert()`, including assertions
inside functions. Pass `[name, value]` pairs for the relevant settings and any
calculated bounds:

```openscad
use <../../include/assertions.scad>

assert(cornerRadius > wallThickness + slidingFloorRadius,
    assertion_message("Corner radius must clear the rounded floor.", [
        ["cornerRadius", cornerRadius],
        ["wallThickness", wallThickness],
        ["slidingFloorRadius", slidingFloorRadius],
        ["minimum cornerRadius (exclusive)", wallThickness + slidingFloorRadius]
    ]));
```

Messages retain the rule and append `Values: name=value, ...`. Strings are quoted,
tabs and line breaks are escaped, and lists, booleans, and `undef` retain their
types. This keeps the formatting consistent without changing assertion conditions,
source locations, or geometry. Empty value lists leave the original message unchanged.

## BOSL2

- Upstream: [BelfrySCAD/BOSL2](https://github.com/BelfrySCAD/BOSL2).
- Revision: `d6d184505210c8b7bee76c4195905a34e7ded1a5`.
- License: [BSD-2-Clause](BOSL2/LICENSE), with upstream notices preserved.
- Used by: [Blind cord coupler](../designs/blind-cord-coupler/README.md),
  [Chandelier](../designs/chandelier/README.md), and
  [Boston HS 40 speaker foot](../designs/boston-hs40-foot/README.md).

`BOSL2` contains unmodified copies of `std.scad`, `threading.scad`, and every
file they transitively include or use: 33 SCAD files in total. Unrelated
optional modules, examples, documentation, and upstream tests are not bundled.

To update, copy both entry points and their complete transitive include/use
dependencies from one upstream revision, preserve the license and source
notices, update the revision above, and run the blind-cord-coupler, chandelier,
and speaker-foot regression checks.
Do not edit individual vendored files or mix revisions.
