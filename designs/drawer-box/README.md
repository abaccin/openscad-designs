# Parametric drawer box

[All designs](../../README.md)

A rounded, parametric OpenSCAD box for drawer organization, with optional
internal grid divisions, finger-pull ledges, a locating base for lidless
stacking, and optional sliding or magnetic lift-off lids with engraved robot
artwork, a small personal AB logo, and optional custom-font text.
The model uses millimeters and is compatible with OpenSCAD 2021.01.

The saved box is **100 x 95 x 50 mm** (outside length, width, closed height),
with a sliding lid, 2.5 mm walls, five Y dividers, and logo/text engravings.
Its raised side grips add 0.8 mm on each side, making the maximum outside
width **96.6 mm**. An integral snap detent holds the sliding lid closed and
releases when pulled.
With `withLid=false`, its rounded walls reach the full 50 mm height and end
in a flat, slot-free rim: no sliding-lid rails or grooves are generated.
With `withStacking=true`, the bottom 3 mm steps inward to
locate inside another lidless box. Its shoulder rests on the lower rim,
keeping the boxes aligned without changing the outside dimensions.
`pullLedges="both"` adds a ledge inside each short end wall.
For an open interior, set both divider counts to zero and both compartment
size lists to `[]`. Stacking and pull ledges are off in the saved configuration.

## Files

Unless stated otherwise, paths and shell commands in this guide are relative
to this design directory.
From the repository root, start with:

```powershell
Set-Location designs\drawer-box
```

| File | Purpose |
| --- | --- |
| `round_box_drawer.scad` | Parametric stackable box, grid divisions, pull ledges, sliding/magnetic lids, and engravings. |
| `robot-relief.svg` | Robot linework imported for the engraved lid. Keep it next to the SCAD file. |
| `ab-logo-monochrome.svg` | Personal AB logo imported for the small lid engraving. Keep it next to the SCAD file. |
| `README.md` | Parameters, usage, and printing guidance. |
| `scripts/export-3mf.mjs` | One-command Bambu Studio project with the box and decorated lid on separate plates. |
| `scripts/export-lid-3mf.mjs` | Backward-compatible command for the same full box-and-lid project exporter. |
| `scripts/export-lid-stls.mjs` | Automated aligned STL export of the lid body and enabled color inlays. |
| `tests/export-lid-3mf.test.mjs` | Project packaging, palette assignments, and Bambu Studio compatibility checks. |
| `tests/export-lid-stls.test.mjs` | Exporter CLI, failure handling, and real OpenSCAD alignment checks. |
| `tests/model.test.mjs` | OpenSCAD rendering, geometry, and parameter regression checks using Node.js. |
| `tests/sliding.test.mjs` | Sliding rim/skirt geometry, motion, retention, finishing details, and fit-limit checks. |

No external OpenSCAD libraries are required. Each SVG is only needed when
displaying or rendering a lid with its corresponding engraving enabled;
the lidless box imports neither. Set `withLidArtwork=false`,
`withLidLogo=false`, and `withLidText=false` for an undecorated lid.
Text needs an installed font, not an SVG or an external OpenSCAD library.

## OpenSCAD usage

1. Download or clone this repository and open `round_box_drawer.scad` in this
   design directory with OpenSCAD 2021.01 or later,
   leaving both SVGs beside it.
2. Adjust the commented user settings at the top of the source or in the
   Customizer. Everything below `[Hidden]` is implementation, not settings.
   Set divider counts, height, thickness, and optional compartment sizes
   under **Internal divisions**. Press **F5** to preview after changes.
3. For a lidless box, set `withLid=false` and select
   `itemsShown="box"` or `"both"`. Set `withStacking=true` for the locating
   base, or set it to `false` to restore the original full-width flat base.
4. For a sliding-lid box, set `withLid=true` and leave `lidStyle="sliding"`.
   This generates an external rim and a separate, three-sided skirted lid
   that slides over it. The lid prints exterior-face-down, skirt upward.
   Raised grips on both long sides help you pull it open; a small snap detent
   engages when fully closed. Set `withSlidingLock=false` for free sliding.
   With `withLidArtwork=true`, the robot is engraved 0.5 mm into the
   exterior face, not raised; robot artwork is disabled in the saved settings.
   `withLidLogo=true` also adds the small AB engraving opposite the
   opening-end finger recess; the robot automatically fits into the remaining space.
   `itemsShown="both"` lays the box and lid out beside one another.
5. For a magnetic lift-off lid, set `withLid=true` and `lidStyle="magnetic"`.
   The box has a plain rim and four internal magnet pads instead of rails.
   The lid has matching pockets and an inset perimeter lip that fits inside
   the box. Defaults fit
   **eight 3 mm diameter x 3 mm thick round magnets**, glued in after printing.
   The magnetic lid is laid out **exterior-face-down**, with its pockets and
   lip facing up. Artwork, logo, and text are on the opposite, exterior face.
   See [Magnetic lid](#magnetic-lid) before printing.
6. Optionally enable `withLidText=true`, enter `lidText`, and choose
   `lidTextFont` from **Help > Font List**. This works on either lid style,
   independently of artwork and logo. The robot moves into the area left
   after reserving the text band; adjust text size and position, then preview
   the full label.
7. Customize colors for preview and multi-color 3D printing under **Colors**.
   Set `boxColor`, `lidColor`, `robotColor`, `logoColor`, and `textColor` to
   any color name, hex code (`"#RRGGBB"`), or RGB vector (`[r, g, b]`).
   Set `withColorInlay=true` to generate flush solid inlays in the lid cavities.
   For multi-extruder or multi-material printing (e.g. Bambu AMS, Prusa MMU),
   select `colorShown="box"`, `"lid"`, `"robot"`, `"logo"`, or `"text"` and
   export each STL individually at identical world coordinates for single-click
   multi-part alignment in your slicer.
8. For ordinary single-material exports, set `colorShown="all"` and
   `withColorInlay=false`. Select `itemsShown="box"`, press **F6** to
   render, then choose **File > Export > Export as STL**. For a matching
   lid, keep the same dimensions, `withLid=true`, and the same `lidStyle`, select
   `itemsShown="lid"`, render with **F6**, and export another STL.

`itemsShown` accepts `"box"`, `"lid"`, or `"both"`. Selecting `"lid"` while
`withLid=false` intentionally produces no object and prints:

```text
Lid disabled: set withLid=true, or select itemsShown=box or both.
```

To make a matching pair, render the box with `withLid=true` and the matching
`lidStyle` too. A lidless box has neither the sliding rails nor the magnet
pads. The magnetic lid does **not** retrofit an already printed sliding-rail
box: print its matching magnetic box. Check the console for parameter
assertions or import errors before exporting.

## Parameters

All lengths below are in millimeters. Defaults are those in the SCAD file.
Every user setting has a comment immediately above it explaining what
to change; geometry calculations remain below the settings.

### Display and box

| Parameter | Default | Meaning |
| --- | --- | --- |
| `itemsShown` | `"both"` | Display `"box"`, `"lid"`, or `"both"`; lid visibility also requires `withLid=true`. |
| `boxLength` | `100` | Outside length along X, including the closed sliding lid. |
| `boxWidth` | `95` | Nominal outside width along Y, excluding raised sliding grips. |
| `boxHeight` | `50` | Overall closed height including the lid; lidless walls retain this full height. Sliding rim height is `boxHeight - lidThickness - slidingVerticalClearance`; magnetic walls end at `boxHeight - magneticLidThickness`. |
| `cornerRadius` | `5` | Outside corner radius in plan view. |
| `wallThickness` | `2.5` | Main side-wall thickness. Sliding mode reserves part of it for the inset rim and lid skirt. |
| `bottomThickness` | `2` | Floor thickness above the base shoulder when stacking is enabled; otherwise measured from the build plate. |

### Internal divisions

| Parameter | Default | Meaning |
| --- | --- | --- |
| `dividerCountX` | `0` | Number of walls across the inside length, making `dividerCountX + 1` columns along X. |
| `dividerCountY` | `5` | Number of walls across the inside width, making `dividerCountY + 1` rows along Y. |
| `dividerHeight` | `25` | Wall height above the interior floor, shared by both directions. |
| `dividerThickness` | `1.2` | Thickness of all divider walls, independent of the outside walls. |
| `compartmentSizesX` | `[]` | Up to `dividerCountX` leading clear lengths, starting at X=0. Unspecified compartments share the remaining length equally; `[]` makes all equal. |
| `compartmentSizesY` | `[18]` | Up to `dividerCountY` leading clear widths, starting at Y=0. Unspecified compartments share the remaining width equally; `[]` makes all equal. |

Counts describe **walls, not compartments**: `dividerCountX=2` and
`dividerCountY=1` make a **3 by 2 grid (six compartments)**. Zero disables
an axis; both zero give the original undivided box. These are permanent
walls fused into the floor and rounded shell, not removable inserts.

For equal spacing, the clear size on either axis is:

```text
(outside size - 2*wallThickness - divider count*dividerThickness)
/ (divider count + 1)
```

For unequal sizes, provide up to as many entries as divider walls on
that axis. Entries specify **clear compartment sizes**, excluding divider
thickness, measured from the inner face of the wall nearest X=0 or Y=0.
The supplied sizes fix the leading compartments in order. All unspecified
compartments share the remaining clear space equally; the box is not resized.
With `K` supplied sizes, each unspecified compartment receives:

```text
(outside size - 2*wallThickness - divider count*dividerThickness
 - sum(supplied sizes)) / (divider count + 1 - K)
```

If there is one supplied size per divider, only the final compartment is
unspecified and it receives the entire remainder, as before.
For example, with a **160 x 95 mm box and 1 mm walls** in lidless mode
(these are example dimensions, not the saved sliding settings):

```scad
dividerCountX=2;
dividerCountY=1;
dividerHeight=25;
dividerThickness=1.2;
compartmentSizesX=[40,55];
compartmentSizesY=[30];
```

This makes three columns of **40, 55, and 60.6 mm** and two rows of
**30 and 61.8 mm**.

For five dividers (six compartments), shorter lists work on either axis.
Using the same **160 x 95 mm box, 1 mm walls, and 1.2 mm dividers**:

| Divider setting | Size list | Clear compartment sizes (mm) |
| --- | --- | --- |
| `dividerCountY=5` | `compartmentSizesY=[20]` | 20, 13.4, 13.4, 13.4, 13.4, 13.4 |
| `dividerCountY=5` | `compartmentSizesY=[20,15]` | 20, 15, 13, 13, 13, 13 |
| `dividerCountX=5` | `compartmentSizesX=[40]` | 40, 22.4, 22.4, 22.4, 22.4, 22.4 |
| `dividerCountX=5` | `compartmentSizesX=[40,30]` | 40, 30, 20.5, 20.5, 20.5, 20.5 |

Set the size lists back to `[]` for equal spacing. When reducing a divider
count, shorten its size list if necessary so it has no more entries than
the new count; a zero count requires `[]`. Edit these variable-length
lists in the source; OpenSCAD's Customizer has limited support for vectors.
Rounded corners and pull
ledges reduce usable space locally; these measurements are between the
straight wall faces. Dividers intersect as a full grid, not separate
per-row layouts.

The divider height starts at Z=`bottomThickness + stackingDepth` for
stackable lidless boxes, otherwise at Z=`bottomThickness`. Its maximum is:

| Configuration | Maximum `dividerHeight` | Default box |
| --- | --- | --- |
| Lidless, stacking enabled | `boxHeight - bottomThickness - 2*stackingDepth - internalClearance` | `41.5` |
| Sliding lid enabled | `boxHeight - bottomThickness - lidThickness - internalClearance` | `45.5` |
| Magnetic lid enabled | `boxHeight - bottomThickness - magneticLidThickness - magneticLidLocatorDepth - internalClearance` | `40.5` |
| Lidless, stacking disabled | `boxHeight - bottomThickness` | `48` |

Excessive heights are rejected rather than silently shortened. Dividers
can meet the pull ledges and magnetic mounting pads; choose compartment sizes and heights that leave
finger access, or set `pullLedges="none"` when the ledges are not needed.

### Lidless stacking

| Parameter | Default | Meaning |
| --- | --- | --- |
| `withStacking` | `false` | Add a stepped locating base when `withLid=false`. Ignored for either lid style. |
| `stackingDepth` | `3` | Height of the inset base and its insertion depth into the box below. |
| `stackingClearance` | `0.25` | Per-side gap between the locating base and the lower box's inner wall. |

Stack boxes with the same length, width, corner radius, and wall thickness.
The base is inset by `wallThickness + stackingClearance` on every side,
including the rounded corners. The full-width shoulder above it bears on
the lower box's rim; the inset base prevents sideways sliding, not lifting.
No lid or separate stacking part is needed.

The base is solid and lies flat at Z=0 for printing. The interior floor
moves up to `bottomThickness + stackingDepth` (5 mm by default), reducing
usable internal height by `stackingDepth`. The outside height remains
`boxHeight`. Each additional identical box adds
`boxHeight - stackingDepth` to the stack height: two default boxes are
97 mm tall. Leave the top `stackingDepth` of the lower box clear of contents.
Unstack boxes to reach their contents and internal pull ledges.

Stacking geometry is disabled automatically with `withLid=true`, even if
the lid is not displayed. Both lid styles use the full-width flat base,
not the inset locating base. Stacking on a magnetic lid is not supported;
the locating fit is intended only for the lidless configuration.

### Lid

| Parameter | Default | Meaning |
| --- | --- | --- |
| `withLid` | `true` | Enable the selected lid and its matching box geometry. |
| `lidStyle` | `"sliding"` | `"sliding"` or `"magnetic"`; geometry selection only takes effect with `withLid=true`. |
| `lidThickness` | `2` | Sliding plate thickness, excluding the skirt; ignored by magnetic lids. |
| `lidClearance` | `0.2` | Total lateral fit allowance between sliding rim and skirt: 0.1 mm per opposing side by default. Does not shrink the outside lid footprint. |
| `withNotch` | `true` | Finger recess in the sliding skirt's lower edge, or an underside finger recess in the magnetic lid, at X=`boxLength`. |

### Sliding lid

The lid is a shallow, rounded plate with a **three-sided skirt**: two long
sides and the X=`boxLength` end. Grooves inside the skirt capture a matching
external bead on the box's inset upper rim. The skirt is open toward X=0;
the full-width rear wall stops the lid in its closed position. Slide the lid
off toward **positive X**, rather than lifting it or snapping it over the rim.
Both parts have pronounced raised grip ribs on **both long sides**, parallel
to the slide direction and near the opening end. These replace the shallow
short-end grip cuts; the opening-end finger notch is unchanged.
The slide direction stays along X even if `boxWidth` exceeds `boxLength`.

Small bumps on the box rim engage pockets in two flexible lid-skirt tabs when
the lid is fully closed. Pulling the lid cams the tabs outward, releasing the
detent within the first **4.5 mm** of travel. Beyond that, the bumps clear the
open skirt end rather than rubbing along the whole rail. The retaining grooves
remain continuous above the tabs. There is no release button or separate part.

**Print a new matching box and lid to use the snap detent.** Older parts lack
its mating bumps, pockets, and flexible tabs. `withSlidingLock=false` removes
all three and retains the previous rail/skirt fit. Grips and lock can be
disabled independently; magnetic and lidless designs are unchanged.

**This replaces the old flat plate and internal rails. Print a new matching
box and lid together; neither part fits the old sliding design.**
`lidEdgeThickness` is retained only as an ignored legacy setting, hidden from
the Customizer. Magnetic and lidless designs are unchanged.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `slidingSkirtDepth` | `6` | Skirt depth below the plate when closed. |
| `slidingSkirtThickness` | `1.4` | Skirt wall before cutting the internal groove. |
| `slidingRailDepth` | `0.4` | Outward bead projection and matching groove depth. |
| `slidingVerticalClearance` | `0.2` | Vertical fit gap at the plate, shoulder, and groove faces. Independent of lateral fit. |
| `slidingFloorRadius` | `2` | Interior floor-to-wall fillet radius. `0` disables it. |
| `slidingEdgeChamfer` | `0.5` | Chamfer around the box base and exterior lid perimeter. `0` disables it. |
| `withSlidingGrip` | `true` | Raised vertical ribs on both sliding side walls of the box and lid, near the opening end. |
| `slidingGripProjection` | `0.8` | Outward projection per side; adds twice this to the maximum outside width. Ignored when grips are disabled. |
| `withSlidingLock` | `true` | Integral pull-to-release snap detent; disabling it restores free sliding. |
| `slidingLockInterference` | `0.2` | Intended elastic tab deflection beyond `lidClearance/2`. Smaller values ease release. Ignored when the lock is disabled. |

The nominal closed envelope is `boxLength x boxWidth x boxHeight`, including
the lid and its vertical fit allowance. With grips enabled, the maximum width
is `boxWidth + 2*slidingGripProjection`: **100 x 96.6 x 50 mm** with the saved
settings. Interior dimensions and rail clearance do not change. Grip patches
fit the available straight wall sections; their ends ramp into the wall for
printing. Print-layout spacing expands if needed to keep the parts apart.
The rim ends at
`boxHeight - lidThickness - slidingVerticalClearance`. The lower shell's
shoulder is at
`boxHeight - lidThickness - slidingSkirtDepth - slidingVerticalClearance`.
With the saved values these heights are **47.8 mm and 41.8 mm** respectively.
The face-down lid is **8 mm** high, with its exterior at Z=0 and skirt upward.
The floor remains `bottomThickness` above the bed; fillets add material around
its perimeter without thinning it. Clear compartment dimensions apply above
the curved floor transitions.

The inset rim reserves `slidingSkirtThickness + lidClearance/2` from the
outside wall. At least **0.8 mm** must remain in that rim, and at least
**0.8 mm** must remain behind the lid groove and behind each lock pocket.
For the default skirt and lateral fit, `wallThickness` must be at least
**2.3 mm**; historical 1 mm sliding walls are no longer suitable.
`slidingRailDepth` must exceed `lidClearance/2` to retain the lid.
The corner radius must exceed `wallThickness + slidingFloorRadius` and
leave straight side sections. Assertions explain configurations that cannot
fit their rail, skirt, chamfer, floor, dividers, or ledges.

The lock uses 16 mm cantilever sections, 0.6 mm relief slots with rounded ends,
and 0.15 mm pocket clearance. Bump projection is
`lidClearance/2 + slidingLockInterference`, so adjusting sliding clearance
does not silently eliminate retention. The tabs sit below the groove and
away from the grip patches. Short boxes, shallow skirts, excessive interference,
and insufficient pocket/root material are rejected explicitly. Disable the
lock if its geometry cannot fit the chosen dimensions. The conservative
cantilever strain limit is only a geometry guard, not a material rating.

For a small, reference-like open box, use these overrides while retaining the
sliding defaults above (the example does not replace the saved configuration):

```scad
withLid=true;
lidStyle="sliding";
boxLength=76.8;
boxWidth=56.8;
boxHeight=19;
cornerRadius=8;
wallThickness=3.4;
dividerCountX=0;
dividerCountY=0;
compartmentSizesX=[];
compartmentSizesY=[];
pullLedges="none";
withLidArtwork=false;
withLidLogo=false;
withLidText=false;
```

Print a small pair first and adjust `lidClearance` and
`slidingVerticalClearance` for your printer. Tune `slidingLockInterference`
separately: reduce it if the snap is too stiff. Keep relief slots free of
stringing and check that the tabs flex without cracking; a more flexible
filament such as PETG can be preferable to brittle PLA. The tapered grips and
45-degree bead/groove and bump ramps are intended to minimize unsupported
overhangs with the face-down lid. **The open-ended relief slots leave unsupported
tab undersides: use local supports under the free tab tips**, and inspect the
remaining slot span and pocket roofs in your slicer. Remove those supports and
clear the 0.6 mm slots before flexing the tabs; do not assume the lock prints
support-free. Digital checks do not establish printed friction, opening force,
fatigue life, or support-free printing on every machine. The snap is not a
transport lock or a load rating; do not lift a filled box by its lid.
Existing configurations that only set `withLid=true` still select this style.

### Magnetic lid

Set `withLid=true` and `lidStyle="magnetic"` for a lid that lifts vertically
off the box. Four magnet pairs provide retention. The lid has a **rebated
underside with a continuous inset locating lip**, rather than a plain slab
or isolated tabs: the lip enters the opening while the outer flat shoulder
rests on the rim. It follows the rounded walls, detours around the magnet
pads, and clears the finger recess when `withNotch=true`.
There are no sliding rails or snap clips. This is a clearance fit, not a
press fit or a seal; increase `magneticLidClearance` if printed parts bind.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `magneticLidThickness` | `5` | Plate thickness, excluding the inset lip. |
| `magnetDiameter` | `3` | Round magnet diameter; four in the box and four in the lid. |
| `magnetThickness` | `3` | Magnet thickness along the pocket axis. |
| `magnetPocketClearance` | `0.1` | Radial gap per side for magnet fit and adhesive. |
| `magnetRecess` | `0.1` | Extra pocket depth, recessing each fully seated magnet below its mating face. |
| `magneticLidClearance` | `0.3` | Per-side gap between the lip and the walls, magnet pads, and finger recess. |
| `magneticLidLocatorDepth` | `2` | Lip insertion depth below the lid's seating face. |
| `magneticLidLipThickness` | `1.2` | Thickness of the continuous perimeter lip. |

These settings are only evaluated for an enabled magnetic lid. The lid has
the full `boxLength` x `boxWidth` rounded outline. The magnetic box rim is at
`boxHeight - magneticLidThickness`, so the **closed pair** retains the specified
outside dimensions: the default box rim is 45 mm high and the closed pair is
50 mm high. The flat interior floor remains at `bottomThickness` (2 mm).
The separate print-oriented lid is 7 mm tall including its default lip.

Each default pocket is **3.2 mm diameter x 3.1 mm deep**:

```text
pocket diameter = magnetDiameter + 2*magnetPocketClearance
pocket depth    = magnetThickness + magnetRecess
magnet face gap = 2*magnetRecess, when both magnets are fully seated
```

The nominal face gap is 0.2 mm, not an extra gap between the printed seating
surfaces. The rim and mounting pads support the lid; proud magnets or excess
adhesive prevent it from seating. Pocket clearance is independent of lip
clearance, and neither uses `lidClearance`.

Four mounting pads grow inward from the long walls near the corners, with
sloped undersides. They retain at least 1.2 mm around the pocket sides and
1 mm below the blind pocket before the underside slope. The lip is generated
from the actual opening and pad outlines, then inset by
`magneticLidClearance`; its inner edge is inset a further
`magneticLidLipThickness`. The magnet pockets remain outside the lip and
accessible for gluing. Pads and the lip reduce usable space locally.
Their layout must fit between the rounded corners; overly small boxes,
large magnets, large radii, or excessive lip thickness/clearance are rejected.

The plate must retain **at least 1 mm of skin** above the pockets, including
engraving. The check conservatively uses the deepest enabled engraving
even if that decoration does not overlap a pocket:

```text
magneticLidThickness >= magnetThickness + magnetRecess
                       + max(enabled artwork depth, enabled logo depth,
                             enabled text depth, 0) + 1
```

The default combination needs at least 4.6 mm; the 5 mm plate leaves 1.4 mm
after a 3.1 mm pocket and 0.5 mm engraving. It is not automatically thickened.
Increasing the plate or lip depth reduces allowed divider height; increasing
either can also require a larger `pullTopOffset`:

```text
pullTopOffset >= magneticLidThickness + magneticLidLocatorDepth + internalClearance
```

The default minimum is 7.5 mm. `pullTopOffset` is still measured from the
**closed box top**, not the lower magnetic rim. Dividers may join pads and
ledges, but cannot fill the magnet pockets, which are subtracted last.

Print the box floor-down and the magnetic lid **exterior-face-down**, with
pockets and the lip facing up, as displayed. Engravings face the build plate;
check the first layers, bridging over engraved recesses, bed adhesion, and
the resulting finish in your slicer. This orientation does not guarantee
support-free printing. Turn the lid over for assembly.

Before a full-size print, use a small pocket/lip fit sample or a suitably
sized test box with the same tolerances. Dry-fit the magnets, confirm that
the lid lowers freely and all four pairs attract, then bond them with an
adhesive suitable for the print material and magnet coating. Mark/check
polarity before gluing: every matching box/lid pair must attract in the
intended lid orientation. Seat magnets fully, keep glue off mating surfaces
and the lip, and let the adhesive cure before use.

**Holding force is not verified.** It depends on magnet grade, face gap,
adhesive seating, lid size, and print distortion. These small 3 mm magnets
may be weak for a large lid; check actual opening and retention force.
There is no load, transport, or sealing guarantee. Do not lift a filled box
by its lid. Secure magnets against coming loose and keep them away from
children and pets: swallowed magnets can cause serious injury.

### Internal pull ledges

| Parameter | Default | Meaning |
| --- | --- | --- |
| `pullLedges` | `"none"` | `"none"`, `"start"`, `"end"`, or `"both"`. |
| `pullWidth` | `30` | Ledge width along the short wall, centered across Y. |
| `pullProjection` | `6` | Inward projection from the inner wall face. |
| `pullThickness` | `3` | Thickness at the projecting edge, above the sloped underside. |
| `pullTopOffset` | `8` | Distance downward from the box top to the ledge top. |

`"start"` means the short wall at **X=0**; `"end"` means the short wall at
**X=boxLength**. These parametric ledges are entirely internal and do not
increase the outside footprint. Each has a flat top, rounded plan-view
corners, and a 45-degree sloped underside growing out from the wall.
The sloped portion extends below `pullThickness`, so that parameter is
not the ledge's total vertical extent.

The ledges need finger access from inside the box: leave room around and
under them when choosing dimensions or filling the box. Remove the lid
before using them to lift the box. The defaults are not an ergonomic or
load-capacity guarantee.

### Lid artwork

| Parameter | Default | Meaning |
| --- | --- | --- |
| `withLidArtwork` | `false` | Engrave the SVG when a lid is generated. |
| `lidArtworkFile` | `"robot-relief.svg"` | SVG import path, relative to the SCAD file. |
| `lidArtworkDepth` | `0.5` | Engraving depth below the lid's exterior face, which faces the bed when printing. |
| `lidArtworkMargin` | `8` | Artwork margin used when fitting the rotated image to the lid. |
| `lidArtworkLineGrowth` | `0.2` | Expand each side of the linework to improve fine-feature printability. |
| `lidArtworkAspect` | `939/453` | Width/height ratio after rotating the SVG 90 degrees. Change this for replacement artwork with different proportions. |

The artwork is centered in its allocated area, rotated along the lid,
and scaled with its aspect ratio preserved. With the logo enabled, its
strip is reserved first. When text is enabled, its band is reserved along
one long edge beside the logo strip, and the robot is scaled into the
remaining area without occupying either reserved region. Disabling text
and logo restores the original robot layout.

### Personal lid logo

| Parameter | Default | Meaning |
| --- | --- | --- |
| `withLidLogo` | `true` | Engrave the personal AB logo when a lid is generated; independent of `withLidArtwork`. |
| `lidLogoFile` | `"ab-logo-monochrome.svg"` | SVG path relative to the SCAD file. |
| `lidLogoSize` | `25` | Width and height of the square logo in millimeters. Replacement artwork is fitted to this square. |
| `lidLogoDepth` | `0.5` | Engraving depth below the lid surface, not a raised badge. |
| `lidLogoMargin` | `4` | Margin around the logo strip, including the distance from the short edge. |

The small logo is centered across the lid near X=0, opposite the sliding
skirt recess or magnetic finger recess. The reserved strip is `lidLogoSize + 2*lidLogoMargin`
long (33 mm by default). The logo works without the robot and is only
imported when a lid is displayed. The supplied SVG retains its cutout
letters and transparent background.

### Custom lid text

Text, artwork, and logo are independent: use any one, any pair, or all three
on either lid style. They are engraved into the exterior, not raised.
For example:

```scad
withLid=true;
lidStyle="magnetic";
withLidArtwork=true;
withLidLogo=true;
withLidText=true;
lidText="Workshop tools";
lidTextFont="Liberation Sans:style=Bold";
lidTextSize=8;
```

| Parameter | Default | Meaning |
| --- | --- | --- |
| `withLidText` | `true` | Enable the engraved label and reserve its band. |
| `lidText` | `"         Manual Drill"` | Nonempty single-line text; the saved label includes nine leading spaces. No tabs or line breaks. |
| `lidTextFont` | `"Liberation Sans:style=Bold"` | Installed font family and optional style in OpenSCAD's font-name syntax. |
| `lidTextSize` | `8` | OpenSCAD nominal text size in mm; keeps the font's natural proportions. |
| `lidTextDepth` | `0.5` | Engraving depth; magnetic pocket/skin limits also apply. |
| `lidTextBandHeight` | `20` | Space reserved along Y for the label, reducing the robot's available area. |
| `lidTextMargin` | `4` | Empty margin around the reserved text band, including edge/bevel clearance. |
| `lidTextPositionX` | `undef` | Label center from the lid's X=0 edge in mm; `undef` centers it across the active lid length. |
| `lidTextPositionY` | `undef` | Label center from the lid's Y=0 edge in mm; `undef` centers it across the active lid width. |

By default, the label is centered on the active lid in both X and Y. Set
`lidTextPositionX` and `lidTextPositionY` to numeric millimeter coordinates
to place the label center explicitly. Coordinates are measured from the
lid's X=0/Y=0 outer corner before the model applies its display translation
or face-down print rotation:

```scad
// Center the label at X=80 mm, Y=25 mm from the lid's X=0/Y=0 edges.
lidTextPositionX=80;
lidTextPositionY=25;
```

`lidTextBandHeight` still reserves space for artwork at the Y=0 end of the
lid, but no longer restricts text placement. The label can deliberately
overlap artwork or the logo, or extend beyond the lid: preview the complete
label before export. The band must be at least
`1.5*lidTextSize + 2*lidTextMargin` high to allow for ascenders/descenders,
smaller than the lid width, and leave room for the artwork margins when
artwork is enabled. Text depth must be positive and less than the active
plate thickness; the deepest of artwork, logo, and text is used in the
magnetic skin check.

Choose a font listed in **Help > Font List**, for example
`Liberation Mono:style=Regular`, or another font installed on your system.
Use a font name, not a font-file path. Missing fonts may be substituted by
OpenSCAD; the model cannot verify font availability in OpenSCAD 2021.01.

**Text is not automatically fitted or wrapped.** Preview the complete label
before export. Long labels can extend outside their reserved area or be
cut off at the lid edge: reduce `lidTextSize`, shorten the label, or adjust
its position. For unusually tall fonts, also increase `lidTextBandHeight`.
The console prints the requested font, size, and position as a reminder; it
is not an automatic font-metrics, overlap, or overflow check. Prefer
sufficiently bold lettering and check small details in the slicer. Disabled
text does not reserve space or evaluate its text/font/size/position settings.

### Colors and multi-color printing

Personalize visual colors in OpenSCAD and generate multi-part STLs for
multi-material / multi-extrusion slicing (inspired by the Hackaday article
*OpenSCAD In Living Color*).

| Parameter | Default | Meaning |
| --- | --- | --- |
| `boxColor` | `"white"` | Box display color (name, hex `"#RRGGBB"`, or `[r, g, b]` vector). |
| `lidColor` | `"white"` | Lid body display color. |
| `robotColor` | `"black"` | Robot inlay display color. |
| `logoColor` | `"black"` | Personal AB logo inlay display color. |
| `textColor` | `"green"` | Lid label inlay display color. |
| `withColorInlay` | `false` | When `false`, decorations are recessed single-material engravings. When `true`, decorations generate flush solid inlays in lid cavities for multi-color printing. |
| `colorShown` | `"all"` | Multi-material part filter: `"all"`, `"box"`, `"lid"`, `"robot"`, `"logo"`, or `"text"`. |

Colors accept standard OpenSCAD color names (e.g. `"Tomato"`, `"SlateGray"`),
hex color strings (e.g. `"#4A90E2"`), and RGB/RGBA numeric vectors
(e.g. `[0.2, 0.6, 0.9]`); each vector component must be between 0 and 1.
Use color strings in the Customizer; edit vectors in the source. Unknown
color names are reported by OpenSCAD. Colors appear in **F5 preview**;
F6/STL does not retain material colors.
Inlay preview resolves the clipped solids to avoid coplanar color artifacts;
the detailed robot can therefore take several minutes even in F5.
This preview-only resolution is bypassed in F6 so OpenSCAD 2021.01 does not
reuse preview-cached inlay meshes when combining the lid materials. You can
preview with F5 and then render with F6 without changing the inlay settings.
With `withColorInlay=true`, a combined `colorShown="all"` STL is a filled
single-material lid (and the box when selected); use separate component STLs
to retain material assignments in the slicer.

`colorShown="all"` honors `itemsShown`. Any other value selects that
component instead of `itemsShown`, without changing its position.
Lid components still require `withLid=true`; inlays also require
`withColorInlay=true` and their corresponding `withLidArtwork`,
`withLidLogo`, or `withLidText` flag. Disabled selections produce no object
and explain which flag to enable in the console.

The original engraving depths set the inlay thicknesses. Inlays are clipped
to the actual lid outline, chamfers, and recesses, keeping its external dimensions
unchanged. Where decorations overlap, **text takes priority over logo,
then robot**; their exported volumes do not overlap. Out-of-bounds text is
clipped, not fitted. Check placement and layer thickness in your slicer.
These are co-printed material regions, not loose press-fit inserts.

For example, to preview all decorations in personalized colors:

```scad
withLid=true;
withLidArtwork=true;
withLidLogo=true;
withLidText=true;
withColorInlay=true;
itemsShown="both";
colorShown="all";
boxColor="#204060";
lidColor="SlateGray";
robotColor="Gold";
logoColor="White";
textColor="OrangeRed";
```

#### Multi-color slicing workflow

For Bambu Studio, use the [one-command 3MF exporter](#one-command-bambu-studio-project)
instead of the manual steps below.

1. In OpenSCAD, set `withLid=true` and configure your dimensions, lid style,
   enabled decorations, and text. Keep these settings identical for every export.
2. Set `withColorInlay=true` so that the lid engravings become flush solid inlays.
3. For multi-extruder or multi-material systems (for example, Bambu AMS or Prusa MMU):
   - Set `colorShown="lid"`, press **F6**, and export `lid_body.stl`.
   - If robot artwork is enabled, set `colorShown="robot"`, press **F6**, and export `lid_robot.stl`.
   - If logo is enabled, set `colorShown="logo"`, press **F6**, and export `lid_logo.stl`.
   - If text is enabled, set `colorShown="text"`, press **F6**, and export `lid_text.stl`.
4. Import the exported STLs together into your slicer at once. When prompted to load files as a single multi-part object, select **Yes**. Each part aligns automatically at its true coordinate origin.
5. Assign your desired filament colors to each sub-part in your slicer and print.

Export `colorShown="box"` separately for the box. Identical display colors
do not automatically combine components: assign the same filament to
multiple parts when desired. Do not independently center, drop, or auto-arrange
inlay STLs; transform the assembled lid as one object to preserve XYZ alignment.
The magnetic lid remains exterior-face-down; look underneath it in F5 to see
the inlay colors.

This follows the separate-STL approach in
[OpenSCAD In Living Color](https://hackaday.com/2025/10/14/openscad-in-living-color/).
STL stores geometry, not filament colors. After assigning filaments, save a
**3MF project from your slicer** to retain the assignments. Direct multi-part,
colored 3MF export from OpenSCAD is version/feature-dependent and is not
guaranteed by this model, including on OpenSCAD 2021.01.

#### One-command Bambu Studio project

Save your settings in `round_box_drawer.scad`, then run:

```powershell
node scripts\export-3mf.mjs
```

**Open `exports\drawer-box.3mf` in Bambu Studio as a project.**
**Plate 1 contains the box; plate 2 contains the decorated lid.** The lid body
and enabled logo, text, and robot inlays are already assembled and aligned.
There is no manual STL importing or part assembly.
The box uses `boxColor`; the lid uses `lidColor`, `logoColor`, `textColor`,
and `robotColor` from the saved model. Matching colors share one filament
slot across both plates. Box dimensions, dividers, ledges, and the matching
lid interface are generated from the same settings as the lid.

Requires Node.js 18+ and OpenSCAD 2021.01+; no npm install or Bambu Studio
installation is needed to generate the file. The standard Windows OpenSCAD
installation is detected automatically. For other installations, put
`openscad` on PATH or set `OPENSCAD` to its executable.

To regenerate an existing project, run `node scripts\export-3mf.mjs --force`.
Use `--output 'exports\my-box.3mf'` for another filename. The same optional
`-D` overrides as the STL exporter are supported. The SCAD source is not
modified, temporary STLs are cleaned up, and an existing project is only
replaced after the new export succeeds.
The previous `scripts\export-lid-3mf.mjs` command still works, but now also
exports the complete project to `exports\drawer-box.3mf`. Previously generated
lid-only files are not changed. The separate STL exporter remains lid-only.

The project records filament **colors**, not which physical spool is loaded.
It uses generic PLA, a 0.4 mm nozzle, and a generic bed sized to fit the
objects as placeholders, not a tuned printer profile.
Choose your actual printer and filament material in Bambu Studio and
confirm AMS mapping before printing. Preview transparency is ignored for
filament colors. Both objects rest on their own plate at Z=0; the magnetic
lid stays decorated-face-down. The exporter does not generate sliced G-code.

#### Automated lid STL export

With **Node.js 18+** and **OpenSCAD 2021.01+** installed, save your model
settings in `round_box_drawer.scad`, then run from this design directory:

```powershell
$env:OPENSCAD='C:\Program Files\OpenSCAD\openscad.exe'
node scripts\export-lid-stls.mjs
```

Omit `OPENSCAD` if `openscad` is on PATH. No npm install is needed.
The default output directory is `exports\lid-stls` under this design directory
(ignored by Git). You can invoke the script by its full path from another
directory; it always uses the model beside this design's `scripts` folder.

The script automatically sets `withLid=true` and `withColorInlay=true`,
exports only the lid body and enabled decorations, and leaves the SCAD file
unchanged. It evaluates the saved settings with OpenSCAD, so expressions
and overrides determine which decorations are enabled. It preserves all
part coordinates, including the magnetic lid's exterior-face-down orientation.

| Output | When generated |
| --- | --- |
| `lid_body.stl` | Always. |
| `lid_robot.stl` | `withLidArtwork=true`. |
| `lid_logo.stl` | `withLidLogo=true`. |
| `lid_text.stl` | `withLidText=true`. |

Use `--output-dir` for a different destination and repeat `-D` to override
individual settings. Relative destinations are resolved from your current
directory. For example, in PowerShell 7.3+ with standard native argument passing:

```powershell
node scripts\export-lid-stls.mjs --output-dir 'exports\tool-bits' `
  -D 'withLidArtwork=false' -D 'withLidLogo=true' `
  -D 'withLidText=true' -D 'lidText="Tool bits"' -D 'lidTextSize=6'
```

`-D` values are OpenSCAD expressions: strings need the inner double quotes,
booleans use `true`/`false`, and lists use e.g. `-D 'compartmentSizesY=[]'`.
On Windows PowerShell 5.1 or legacy native argument passing, escape inner
double quotes for the native command, e.g. `-D 'lidText=\"Tool bits\"'`,
or edit the saved SCAD settings instead.
`withLid`, `withColorInlay`, `itemsShown`, and `colorShown` are controlled by
the exporter and cannot be passed as `-D` overrides. Use `--help` for usage.

Unsaved OpenSCAD/Customizer edits are not read. Put desired values in the
saved SCAD source or pass them with `-D`; Customizer JSON presets are not
supported. Other saved settings, including lid style, dimensions, engraving
depths, font, and enabled-decoration flags, remain in effect.

The destination must be **new or empty**. Use a different directory for
each export, or move your previous results before rerunning. Rendering is
staged and the complete set is published only after every selected STL has
nonempty, finite geometry. Disabled decorations are reported and skipped;
an enabled decoration that is fully clipped or covered by another material
is an error. Missing tools, OpenSCAD warnings/errors, and render failures
stop the export with diagnostics and a nonzero exit code, without publishing
a partial set. Each OpenSCAD invocation has a ten-minute timeout.

Import **all STLs from the output directory together as one multi-part
object**, then assign a filament to each part in your slicer. Do not center,
drop to the bed, or auto-arrange individual inlays; transform the assembled
lid as a whole. This script does not export the box, automate the slicer,
assign filaments, or generate a 3MF. STL contains geometry only.

### Fit and clearance

| Parameter | Default | Meaning |
| --- | --- | --- |
| `internalClearance` | `0.5` | Positive minimum gap beneath an inserted stacking base, sliding plate, or magnetic lip, and beneath pull ledges/pads. Also keeps logo/text margins clear of the lid edge. |

This is separate from the sliding lateral/vertical fit (`lidClearance`,
`slidingVerticalClearance`) and stacking
side fit (`stackingClearance`), as well as magnetic lip fit
(`magneticLidClearance`) and pocket fit (`magnetPocketClearance`).

### Parameter limits

The source checks that positive wall thickness fits inside the box, that
the positive floor thickness is below the box height, and that the corner
radius exceeds the wall thickness while fitting within the footprint.
Enabled stacking requires positive depth and clearance, room above the
raised floor, and a base inset smaller than the corner radius that leaves
positive base dimensions. The inserted base must clear the lower box's
raised floor by at least `internalClearance` (default 0.5 mm):
`boxHeight >= bottomThickness + 2*stackingDepth + internalClearance`.
Pull ledges must be at least
`stackingDepth + internalClearance` below the rim so the upper box's base clears them.
With a sliding lid enabled, the inset rim, grooved skirt, and floor transitions
must satisfy the skin and clearance limits in [Sliding lid](#sliding-lid).
The legacy `lidEdgeThickness` value is ignored.
Magnetic lids instead validate the pocket walls, residual skin, corner-pad
layout, lip clearance/thickness, and pad/lip depth above the floor, as described in
[Magnetic lid](#magnetic-lid). Invalid settings are rejected, not silently
clamped. Enlarging magnets can require a taller/wider box and thicker lid.

Enabled pull ledges require positive width, projection, thickness, and top
offset. Their width must fit between the rounded end-wall corners. Their
combined projection must leave internal space, and their undersides must
remain at least `internalClearance` above the floor. With a sliding lid enabled,
`pullTopOffset` must be at least
`lidThickness + internalClearance` to clear the sliding plate.
For a magnetic lid, the minimum is
`magneticLidThickness + magneticLidLocatorDepth + internalClearance`.
For stackable boxes, the underside clearance is measured from the raised
interior floor.

Divider counts must be nonnegative integers. Enabled divisions require
positive height and thickness. Size lists must contain only positive numbers
and no more entries than the divider count on that axis. The supplied sizes
plus all divider thicknesses must leave positive space for the remaining
compartments; invalid lists are rejected, not trimmed or rescaled. Dividers must fit
above the floor and below the relevant lid/stacking height limit.

For each lid engraving, the depth must be positive and less than the active
lid thickness (`lidThickness` or `magneticLidThickness`); magnetic lids must
also retain the required 1 mm skin above the pockets and below the finger
recess. Robot margins and line growth must be nonnegative, its
aspect ratio positive, and its allocated area large enough for its margins.
The logo size must be positive, and its size plus twice its margin must
be smaller than both lid dimensions. Its margin must be at least
`slidingEdgeChamfer + internalClearance` to clear the sliding plate's chamfer.
For the flat magnetic lid, `lidLogoMargin >= internalClearance` suffices.
Source assertions catch these constraints, but do not
replace checking the rendered geometry, finger access, and printed fit.

## Printing and fit

Start with the box floor on the build plate. Both lid styles are displayed
**exterior-face-down**, with engraving and color inlays at the bed. Sliding
lids have their skirt upward; magnetic lids have their pockets and lip
upward. See their engraving and assembly guidance
above. Inspect both parts in your slicer before printing. Either lid is
displayed at negative Y in OpenSCAD; center each complete box or assembled
lid on the build plate as needed, never its individual colored inlays.

The sloped ledge and magnetic-pad undersides are intended to ease printing,
but those features and the narrow overhang at the stacking shoulder may still need supports
depending on the printer, material, cooling,
orientation, and slicer settings. Do not assume support-free printing.
Check that the 2.5 mm main walls, thinner rail/groove skins, and fine engraved lines are resolved
well by your nozzle and chosen extrusion widths.

Sliding fit depends on calibration, shrinkage, first-layer expansion, and
surface finish. Try a small fit sample before a full print and tune
`lidClearance` and `slidingVerticalClearance` as necessary. The engraving leaves
`lidThickness - lidArtworkDepth` of material beneath it (1.5 mm by default).
For lidless stacking, tune `stackingClearance` instead; it is a per-side
clearance, so increasing it by 0.1 mm reduces base length and width by
0.2 mm. First-layer expansion can tighten this fit. Check a printed pair
before making a taller stack, and keep stacks low and stable.
Choose adequate perimeters, floor layers, and material for your use.
Dividers grow vertically from the floor; check that their thickness is
resolved by your extrusion width. The 25 mm logo has fine lines and small
letter cutouts; enlarge `lidLogoSize` if your nozzle cannot resolve them.
On a sliding lid, its engraving leaves `lidThickness - lidLogoDepth`
material beneath it. Magnetic lids additionally account for pocket depth
when checking their residual skin. No load rating is specified for the box,
its pull ledges, magnetic closure, or a stack.

## Regression checks

With Node.js 18 or later and OpenSCAD 2021.01 or later installed, run:

```powershell
$env:OPENSCAD='C:\Program Files\OpenSCAD\openscad.exe'
node --test tests\model.test.mjs
node --test tests\sliding.test.mjs
```

On systems where `openscad` is on PATH, `OPENSCAD` can be omitted.
To check both automated exporters separately, with the same prerequisites:

```powershell
node --test tests\export-lid-3mf.test.mjs tests\export-lid-stls.test.mjs tests\zip.test.mjs
```

Exporter checks cover arguments, enabled parts, output protection, error
handling, and cleanup. Real OpenSCAD exports for both lid styles are compared
against direct component exports at their original vertex coordinates,
including SVG and text inlays. These use an explicit valid configuration
and a simple robot-artwork fixture to keep rendering focused.
3MF checks verify archive structure, separate box/lid plates, named parts,
shared palette/extruder assignments, and preservation of triangle coordinates.
The embedded box is compared with a direct OpenSCAD box export.
When Bambu Studio is installed in
its standard Windows location, the suite also imports and saves a real project
with Bambu Studio for both lid styles and checks that both plate memberships,
colors, assignments, and relative part positions survive. Elsewhere, set
`BAMBU_STUDIO` to the full executable path;
that compatibility check is explicitly skipped when Bambu Studio is unavailable.
Project round-trip compatibility was checked with Bambu Studio 2.8.2.

The sliding suite checks multiple size/fit configurations, including a box wider
than it is long and a short grip patch. It checks free travel with the lock
disabled, seated snap clearance, bounded interference confined to flexible tabs
during release, and unobstructed travel afterward. It also covers vertical
capture, the closure stop, tall dividers and ledges, actual grip projection,
expanded print spacing, feature toggles, fillets/chamfers, and invalid fits.
Both model suites use the repository's shared watertightness and
point-containment checks in `tests\helpers\mesh.mjs` at the repository root.
Model checks verify exact divider positions and clear sizes for empty, partial, and
full size lists on both axes. They also render STL meshes for grid (including
partially specified X/Y grids), height, sliding/magnetic lid, and decoration
configurations; inspect watertightness, connected parts and perimeter lips,
pocket dimensions, and actual assembled clearance; and exercise invalid
parameter assertions. Decoration checks cover all artwork/logo/text combinations
on both lid styles, real robot artwork with logo and text, and selected fonts.
Color checks cover enabled/disabled exports, valid and invalid colors,
flush aligned inlays, and non-overlapping material partitions that reconstruct
the original lid even with overlapping or out-of-bounds text.
The 100 x 95 mm logo-and-`Manual Drill` configuration is also exported as an
F5 preview PNG followed by STL in the same OpenSCAD process to check for
preview-cache-dependent non-manifold geometry on both lid styles. These
checks require working OpenSCAD PNG preview support (a display or virtual
display on headless systems).
Magnetic coverage includes the default box, a 300 x 200 x 70 mm example,
non-default magnets/fit, and a boolean interference check with dividers.
Temporary render files are removed automatically.
Detailed robot engraving can take several minutes with OpenSCAD 2021.01;
each render has a ten-minute timeout.

## Contributions

All updates to `main` must go through a pull request. Create a feature
branch, make and check the changes there, push that branch, and open a PR.
Do not push changes directly to `main` or bypass branch protection.

## Licensing

A license has not yet been specified for the source or artwork. Public
availability alone does not grant a license to reuse or redistribute them.
