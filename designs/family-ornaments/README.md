# Personalized family ornaments

Create one two-color 3MF project per name from the supplied
`ORNAMENTS_final_with_pet_ornament_final_versionnn (1).3mf` template.
The exporter reuses its actual decoration meshes; it does not approximate the
artwork or just change text metadata while leaving the old letters in place.

The five distinct styles are **bells, bow, mountains, paw, and reindeer**.
The unused bow mesh in the original project is another version of the bow,
not a sixth distinct theme. Styles are shuffled in balanced batches: each
style is used once before another batch begins. `--seed` reproduces an assignment.

Names use the template's **Pacifico** script, fitted vertically to the original
lettering area and resized horizontally so the letters themselves meet the
frame. There are **no straight support bars or end strokes** between the name
and the frame. Tiny connections attach separate letters, dots, and word spaces.
The center stays open, with no backing plate. Decorations remain white and lettering is red throughout the
original approximately 3 mm thickness. Overlapping decoration is subtracted
from the white part to avoid overlapping material volumes.

## Requirements

- Python 3.10+ (standard library only; no pip install).
- OpenSCAD 2021.01+; the usual Windows installation is detected automatically.
  Otherwise set `OPENSCAD` to its executable or put `openscad` on PATH.
- The original 3MF template, passed explicitly with `--template`.

The font is bundled in `fonts`, loaded only for the rendering subprocess, and
does not need to be installed system-wide. It is the unmodified
[Google Fonts Pacifico](https://github.com/google/fonts/tree/main/ofl/pacifico)
`Pacifico-Regular.ttf`, under the [SIL Open Font License 1.1](fonts/OFL.txt).
The template's third-party decoration artwork is **not** bundled in this
repository. Use an authorized copy; this exporter does not grant artwork rights.

## Export

From the repository root, with the template at your chosen local path:

```powershell
python designs\family-ornaments\scripts\export_3mf.py `
  --template 'C:\Models\ORNAMENTS_final_with_pet_ornament_final_versionnn (1).3mf' `
  --names Andrea Migda Phoebe Stefano Alessandro Meri Giulia Davide Lavinia 'Maria Pia' Claudio Milley Luna `
  --output-dir designs\family-ornaments\exports\family `
  --seed 2026 `
  --design Phoebe=paw --design Luna=paw --design Lavinia=reindeer
```

`--design NAME=STYLE` overrides the random assignment for one recipient without
changing the others. Quote the entire argument when a name contains spaces,
for example `--design 'Maria Pia=bow'`. Styles are `bells`, `bow`, `mountains`,
`paw`, and `reindeer`. Explicit overrides can change the balanced distribution.

The output directory must **not already exist**. No previous projects are
overwritten. The default destination is this design's `exports\family`,
independent of the current directory; explicit relative paths use your current
directory. A failure during rendering leaves no partial family set. Each
export checks closed, consistently oriented meshes and verifies that the name,
including dots, is one connected mesh attached to the decoration.

Each name gets its own `.3mf`, including `Maria Pia.3mf`. `manifest.json`
records names, assigned designs, filenames, and colors. Original photos,
profile information, plates, text meshes, and original printer presets are not copied.

Open a generated file **as a project** in Bambu Studio: one assembled ornament
contains a white decoration part (filament 1) and a red name part (filament 2).
These projects target the confirmed **Bambu Lab P2S with a 0.4 mm nozzle**.
They reference Bambu Studio's built-in `Bambu Lab P2S 0.4 nozzle`,
`0.20mm Standard @BBL P2S`, and `Generic PLA @BBL P2S` presets, rather than
embedding a blank/custom printer preset or any machine G-code. Bambu Studio
resolves machine settings from its installed system presets. Use an up-to-date
Studio version with those P2S presets installed; do not use these printer
references for another machine.

The package also stores standard 3MF Core base materials for other compatible
viewers; slicer support for those materials varies.

Confirm the P2S/0.4 mm selection and select your actual material and white/red
AMS slots before slicing.
Use a suitable purge/flush setting to prevent red bleeding into white.
Print flat; check the fine connecting strokes in the sliced preview. The
exporter checks digital geometry, not physical strength or a completed print.

## Checks

```powershell
python -B -m unittest discover -s designs\family-ornaments\tests -v
```

These standard-library checks cover mesh validation, text-island connections,
balanced assignments, recipient-specific overrides, direct lettering-to-frame
fitting without added frame bars, safe filenames, standard and Bambu color metadata,
destination conflicts, and cleanup after render failure. Real exports
additionally exercise OpenSCAD geometry and connectivity checks for every name.
