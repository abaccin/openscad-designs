"""Personalize the separate decoration meshes in the supplied ornament project."""

import argparse
from collections import defaultdict
from dataclasses import dataclass
import json
import math
import os
from pathlib import Path
import random
import re
import shutil
import struct
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile


ROOT = Path(__file__).resolve().parents[1]
CORE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
PRODUCTION = "http://schemas.microsoft.com/3dmanufacturing/production/2015/06"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
MODEL_REL = "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"
NS = {"c": CORE}
IDENTITY = "1 0 0 0 1 0 0 0 1 0 0 0"
PRINTER_PRESET = "Bambu Lab P2S 0.4 nozzle"
FILAMENT_PRESET = "Generic PLA @BBL P2S"
PROCESS_PRESET = "0.20mm Standard @BBL P2S"
ET.register_namespace("", CORE)


@dataclass
class Mesh:
    vertices: list
    triangles: list

    def bounds(self):
        return [(min(v[a] for v in self.vertices), max(v[a] for v in self.vertices))
                for a in range(3)]

    def transformed(self, matrix):
        return Mesh([
            tuple(sum(v[j] * matrix[j * 3 + a] for j in range(3)) + matrix[9 + a]
                  for a in range(3))
            for v in self.vertices
        ], self.triangles)

    def components(self):
        parent = list(range(len(self.vertices)))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        for triangle in self.triangles:
            for i in triangle[1:]:
                parent[find(i)] = find(triangle[0])
        groups = defaultdict(list)
        for i, vertex in enumerate(self.vertices):
            groups[find(i)].append(vertex)
        return list(groups.values())

    def validate(self):
        if not self.vertices or not self.triangles:
            raise ValueError("Empty mesh.")
        if any(not all(math.isfinite(x) for x in v) for v in self.vertices):
            raise ValueError("Mesh contains non-finite coordinates.")
        edges = defaultdict(list)
        volume = 0
        for triangle in self.triangles:
            if len(set(triangle)) != 3 or any(i < 0 or i >= len(self.vertices) for i in triangle):
                raise ValueError("Invalid or degenerate triangle indices.")
            a, b, c = [self.vertices[i] for i in triangle]
            volume += (a[0] * (b[1] * c[2] - b[2] * c[1])
                       - a[1] * (b[0] * c[2] - b[2] * c[0])
                       + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
            for x, y in zip(triangle, triangle[1:] + triangle[:1]):
                edges[tuple(sorted((x, y)))].append(1 if x < y else -1)
        if any(len(directions) != 2 or sum(directions) != 0 for directions in edges.values()):
            raise ValueError("Mesh is not a closed, consistently oriented 2-manifold.")
        if volume <= 0:
            raise ValueError("Mesh has non-positive volume.")


def read_stl(path):
    data = Path(path).read_bytes()
    vertices, triangles, indices = [], [], {}

    def add(points):
        triangle = []
        for point in points:
            if point not in indices:
                indices[point] = len(vertices)
                vertices.append(point)
            triangle.append(indices[point])
        triangles.append(tuple(triangle))

    if len(data) >= 84 and len(data) == 84 + 50 * struct.unpack_from("<I", data, 80)[0]:
        for offset in range(84, len(data), 50):
            add([struct.unpack_from("<3f", data, offset + 12 + i * 12) for i in range(3)])
    else:
        text = data.decode("ascii")
        for facet in re.findall(r"facet\s+normal.*?endfacet", text, re.S):
            points = [tuple(map(float, p)) for p in re.findall(
                r"vertex\s+(\S+)\s+(\S+)\s+(\S+)", facet)]
            if len(points) != 3:
                raise ValueError(f"Invalid STL facet: {path}")
            add(points)
    mesh = Mesh(vertices, triangles)
    mesh.validate()
    return mesh


def write_stl(path, mesh):
    with Path(path).open("wb") as stream:
        stream.write(b"family-ornaments".ljust(80, b"\0"))
        stream.write(struct.pack("<I", len(mesh.triangles)))
        for triangle in mesh.triangles:
            points = [mesh.vertices[i] for i in triangle]
            stream.write(struct.pack("<12fH", 0, 0, 0, *sum((list(p) for p in points), []), 0))


def transform(component):
    values = list(map(float, component.get("transform", IDENTITY).split()))
    if len(values) != 12 or not all(math.isfinite(v) for v in values):
        raise ValueError("Invalid component transform.")
    return values


def read_templates(path):
    # These are editable text labels, not guessed mesh IDs or filenames.
    labels = {"Emma": "bow", "Nube": "paw", "Cassandre": "bells",
              "Gabriel": "mountains", "Charlotte": "reindeer"}
    templates = []
    with zipfile.ZipFile(path) as archive:
        for member in ("Metadata/model_settings.config", "3D/3dmodel.model"):
            if member not in archive.namelist():
                raise ValueError(f"Template is missing required project data: {member}")
        settings = ET.fromstring(archive.read("Metadata/model_settings.config"))
        main = ET.fromstring(archive.read("3D/3dmodel.model"))
        objects = {o.get("id"): o for o in main.findall("c:resources/c:object", NS)}
        cache = {}

        def mesh_for(component):
            member = component.get(f"{{{PRODUCTION}}}path", "/3D/3dmodel.model").lstrip("/")
            if member not in cache:
                if member not in archive.namelist():
                    raise ValueError(f"Template is missing a component model: {member}")
                cache[member] = ET.fromstring(archive.read(member))
            obj = next((o for o in cache[member].findall("c:resources/c:object", NS)
                        if o.get("id") == component.get("objectid")), None)
            if obj is None:
                raise ValueError(f"Missing component in template: {member}")
            mesh = Mesh(
                [tuple(float(v.get(a)) for a in ("x", "y", "z"))
                 for v in obj.findall("c:mesh/c:vertices/c:vertex", NS)],
                [tuple(int(t.get(a)) for a in ("v1", "v2", "v3"))
                 for t in obj.findall("c:mesh/c:triangles/c:triangle", NS)],
            ).transformed(transform(component))
            mesh.validate()
            return mesh

        for obj in settings.findall("object"):
            text_parts = [(part, part.find("text_info")) for part in obj.findall("part")
                          if part.find("text_info") is not None]
            if len(text_parts) != 1 or text_parts[0][1].get("text") not in labels:
                continue
            part, info = text_parts[0]
            if obj.get("id") not in objects:
                raise ValueError(f"Template settings reference a missing object: {obj.get('id')}")
            components = objects[obj.get("id")].findall("c:components/c:component", NS)
            text_components = [c for c in components if c.get("objectid") == part.get("id")]
            body_components = [c for c in components if c.get("objectid") != part.get("id")]
            if len(body_components) != 1 or len(text_components) != 1:
                raise ValueError("Expected one decoration and one editable name per ornament.")
            body, text = mesh_for(body_components[0]), mesh_for(text_components[0])
            if len(body.components()) != 1:
                raise ValueError("Template decoration is disconnected.")
            bounds = body.bounds()
            shift = [(low + high) / 2 for low, high in bounds[:2]] + [bounds[2][0]]
            matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1, *[-v for v in shift]]
            body, text = body.transformed(matrix), text.transformed(matrix)
            templates.append({"style": labels[info.get("text")], "body": body,
                              "text_bounds": text.bounds(),
                              "angle": math.degrees(math.atan2(
                                  transform(text_components[0])[1],
                                  transform(text_components[0])[0]))})
    if {t["style"] for t in templates} != set(labels.values()) or len(templates) != 5:
        raise ValueError("Template must contain the five editable Emma/Nube/Cassandre/Gabriel/Charlotte ornaments.")
    return sorted(templates, key=lambda t: t["style"])


def assignments(names, templates, seed=None, overrides=None):
    if not templates:
        raise ValueError("No decoration templates are available.")
    rng = random.Random(seed)
    pool = []
    while len(pool) < len(names):
        batch = list(templates)
        rng.shuffle(batch)
        pool.extend(batch)
    available = {template["style"]: template for template in templates}
    for name, style in (overrides or {}).items():
        if name not in names:
            raise ValueError(f"Design override names an unknown recipient: {name}")
        if style not in available:
            raise ValueError(f"Unknown decoration style: {style}")
    return [(name, available[overrides[name]] if overrides and name in overrides else template)
            for name, template in zip(names, pool)]


def safe_names(names):
    if not names:
        raise ValueError("Supply at least one name.")
    filenames = []
    for name in names:
        if not name.strip() or name != name.strip() or len(name) > 80:
            raise ValueError("Names must be nonempty, trimmed, and no longer than 80 characters.")
        if any(ord(c) < 32 or c in '<>:"/\\|?*' for c in name) or name.endswith("."):
            raise ValueError(f"Name is not safe as a filename: {name!r}")
        if name.split(".")[0].upper() in {"CON", "PRN", "AUX", "NUL",
                                            *[f"COM{i}" for i in range(1, 10)],
                                            *[f"LPT{i}" for i in range(1, 10)]}:
            raise ValueError(f"Reserved filename: {name!r}")
        filenames.append(name + ".3mf")
    if len(set(f.casefold() for f in filenames)) != len(filenames):
        raise ValueError("Names must produce unique filenames (case-insensitive).")
    return filenames


def connector_segments(mesh, width=0.9):
    islands = mesh.components()
    # Minimum spanning connections also attach i/j dots and bridge word spaces.
    samples = [list(dict.fromkeys((v[0], v[1]) for v in island)) for island in islands]
    samples = [points[::max(1, len(points) // 160)] for points in samples]
    reached, segments = {0}, []
    while len(reached) < len(samples):
        best = None
        for i in sorted(reached):
            for j in range(len(samples)):
                if j in reached:
                    continue
                for a in samples[i]:
                    for b in samples[j]:
                        distance = math.dist(a, b)
                        if best is None or distance < best[0]:
                            best = (distance, j, a, b)
        _, j, a, b = best
        reached.add(j)
        segments.append((a, b, width))
    return segments


def frame_x_at(body, y):
    intersections = []
    for triangle in body.triangles:
        points = [body.vertices[i] for i in triangle]
        for a, b in zip(points, points[1:] + points[:1]):
            if (a[1] <= y < b[1]) or (b[1] <= y < a[1]):
                intersections.append(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]))
    if not intersections:
        raise ValueError("Lettering does not align with the ornament frame.")
    return min(intersections), max(intersections)


def fit_to_frame(glyphs, body, original):
    raw = glyphs.bounds()
    scale = min((original[a][1] - original[a][0]) / (raw[a][1] - raw[a][0])
                for a in range(2))
    centers = [(low + high) / 2 for low, high in original[:2]]
    offsets = [centers[a] - scale * sum(raw[a]) / 2 for a in range(2)]
    placed = glyphs.transformed([scale, 0, 0, 0, scale, 0, 0, 0, 1, *offsets, 0])
    bounds = placed.bounds()
    targets = []
    for side in (0, 1):
        candidates = [v for v in placed.vertices if abs(v[0] - bounds[0][side]) < 0.05]
        point = min(candidates, key=lambda v: abs(v[1] - centers[1]))
        ends = frame_x_at(body, point[1])
        targets.append(ends[side] + (0.8 if side == 0 else -0.8))
    horizontal = (targets[1] - targets[0]) / (bounds[0][1] - bounds[0][0])
    return placed.transformed(
        [horizontal, 0, 0, 0, 1, 0, 0, 0, 1, targets[0] - horizontal * bounds[0][0], 0, 0])


def scad_string(value):
    return json.dumps(str(value), ensure_ascii=True)


def run_scad(executable, source, output, env):
    result = subprocess.run([executable, "-o", str(output), "--export-format", "asciistl",
                             str(source)], capture_output=True, text=True, env=env,
                            timeout=600, creationflags=0x08000000 if os.name == "nt" else 0)
    diagnostics = result.stdout + result.stderr
    if result.returncode or re.search(r"(?:^|\n)\s*(?:WARNING|ERROR):", diagnostics):
        raise RuntimeError(f"OpenSCAD failed for {output.name}:\n{diagnostics.strip()}")
    if not output.is_file():
        raise RuntimeError(f"OpenSCAD did not create {output}.")
    return read_stl(output)


def personalize(name, template, work, executable, env):
    body = template["body"]
    height = body.bounds()[2][1]
    write_stl(work / "body.stl", body)
    raw_source = work / "glyphs.scad"
    raw_source.write_text(
        f'linear_extrude(height={height}) rotate({template["angle"]}) '
        f'text({scad_string(name)}, size=20, font="Pacifico", $fn=32);\n', encoding="ascii")
    glyphs = run_scad(executable, raw_source, work / "glyphs.stl", env)
    glyphs = fit_to_frame(glyphs, body, template["text_bounds"])
    write_stl(work / "placed.stl", glyphs)
    segments = connector_segments(glyphs)
    connections = "\n".join(
        f"hull() {{ translate({list(a)}) circle(d={width}, $fn=16); "
        f"translate({list(b)}) circle(d={width}, $fn=16); }}"
        for a, b, width in segments)
    modules = (
        'module letters() { union() { import("placed.stl");\n'
        f"linear_extrude(height={height}) {{ {connections} }} }} }}\n"
        'module decoration() { import("body.stl"); }\n')
    source = work / "render.scad"
    source.write_text(modules + "letters();\n", encoding="ascii")
    red = run_scad(executable, source, work / "red.stl", env)
    if len(red.components()) != 1:
        raise ValueError(f"{name}: red lettering still contains detached islands.")
    source.write_text(modules + "difference() { decoration(); letters(); }\n", encoding="ascii")
    white = run_scad(executable, source, work / "white.stl", env)
    source.write_text(modules + "union() { decoration(); letters(); }\n", encoding="ascii")
    assembled = run_scad(executable, source, work / "assembled.stl", env)
    if len(assembled.components()) != 1:
        raise ValueError(f"{name}: lettering is not connected to the decoration.")
    return white, red


def xml_bytes(element):
    return ET.tostring(element, encoding="utf-8", xml_declaration=True)


def create_project(path, name, style, white, red):
    model = ET.Element("model", {"xmlns": CORE, "unit": "millimeter", "xml:lang": "en-US",
                                "xmlns:BambuStudio": "http://schemas.bambulab.com/package/2021"})
    for key, value in [("Application", "BambuStudio-02.00.00.00"), ("BambuStudio:3mfVersion", "1"),
                       ("Title", f"{name} - {style} ornament"),
                       ("Description", "Personalized from the user-supplied ornament template.")]:
        ET.SubElement(model, "metadata", {"name": key}).text = value
    resources = ET.SubElement(model, "resources")
    materials = ET.SubElement(resources, "basematerials", {"id": "1"})
    for label, color in [("White decoration", "#FFFFFFFF"), ("Red name", "#FF0000FF")]:
        ET.SubElement(materials, "base", {"name": label, "displaycolor": color})
    for i, mesh in enumerate((white, red)):
        mesh.validate()
        obj = ET.SubElement(resources, "object", {"id": str(i + 2), "type": "model",
                            "name": "White decoration" if i == 0 else name,
                            "pid": "1", "pindex": str(i)})
        geometry = ET.SubElement(obj, "mesh")
        vertices = ET.SubElement(geometry, "vertices")
        for vertex in mesh.vertices:
            ET.SubElement(vertices, "vertex", dict(zip(("x", "y", "z"),
                                                       (format(v, ".12g") for v in vertex))))
        triangles = ET.SubElement(geometry, "triangles")
        for triangle in mesh.triangles:
            ET.SubElement(triangles, "triangle", dict(zip(("v1", "v2", "v3"), map(str, triangle))))
    obj = ET.SubElement(resources, "object", {"id": "4", "type": "model", "name": name})
    components = ET.SubElement(obj, "components")
    for i in (2, 3):
        ET.SubElement(components, "component", {"objectid": str(i)})
    bounds = [(min(m.bounds()[a][0] for m in (white, red)),
               max(m.bounds()[a][1] for m in (white, red))) for a in range(3)]
    placement = [128 - sum(bounds[a]) / 2 for a in range(2)] + [-bounds[2][0]]
    ET.SubElement(ET.SubElement(model, "build"), "item",
                  {"objectid": "4", "transform": "1 0 0 0 1 0 0 0 1 " +
                   " ".join(map(str, placement))})
    settings = ET.Element("config")
    obj = ET.SubElement(settings, "object", {"id": "4"})
    ET.SubElement(obj, "metadata", {"key": "name", "value": name + " - " + style})
    ET.SubElement(obj, "metadata", {"key": "extruder", "value": "1"})
    for i, mesh in enumerate((white, red)):
        part = ET.SubElement(obj, "part", {"id": str(i + 2), "subtype": "normal_part"})
        for key, value in [("name", "White decoration" if i == 0 else name),
                           ("extruder", str(i + 1)),
                           ("matrix", "1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1")]:
            ET.SubElement(part, "metadata", {"key": key, "value": value})
        ET.SubElement(part, "mesh_stat", {"face_count": str(len(mesh.triangles)),
                                        "edges_fixed": "0", "degenerate_facets": "0",
                                        "facets_removed": "0", "facets_reversed": "0",
                                        "backwards_edges": "0"})
    plate = ET.SubElement(settings, "plate")
    for key, value in [("plater_id", "1"), ("plater_name", name), ("locked", "false")]:
        ET.SubElement(plate, "metadata", {"key": key, "value": value})
    instance = ET.SubElement(plate, "model_instance")
    for key, value in [("object_id", "4"), ("instance_id", "0"), ("identify_id", "1")]:
        ET.SubElement(instance, "metadata", {"key": key, "value": value})
    ET.SubElement(settings, "assemble")
    project = {
        "version": "02.00.00.00", "filament_colour": ["#FFFFFF", "#FF0000"],
        "filament_type": ["PLA", "PLA"], "filament_diameter": ["1.75", "1.75"],
        "filament_settings_id": [FILAMENT_PRESET] * 2, "nozzle_diameter": ["0.4"],
        "printer_model": "Bambu Lab P2S", "printer_variant": "0.4",
        "printer_settings_id": PRINTER_PRESET, "print_settings_id": PROCESS_PRESET,
        "inherits_group": [PROCESS_PRESET, FILAMENT_PRESET, FILAMENT_PRESET, PRINTER_PRESET],
        # Nonempty difference lists make Bambu resolve all other values from its
        # installed system presets instead of substituting generic machine defaults.
        "different_settings_to_system": ["layer_height", "filament_colour", "filament_colour",
                                         "nozzle_diameter"],
        "layer_height": "0.2",
        "flush_volumes_matrix": ["0", "280", "280", "0"],
    }
    types = ET.Element("Types", {"xmlns": "http://schemas.openxmlformats.org/package/2006/content-types"})
    for extension, content in [("rels", "application/vnd.openxmlformats-package.relationships+xml"),
                               ("model", "application/vnd.ms-package.3dmanufacturing-3dmodel+xml"),
                               ("config", "application/xml")]:
        ET.SubElement(types, "Default", {"Extension": extension, "ContentType": content})
    ET.SubElement(types, "Override", {"PartName": "/Metadata/project_settings.config",
                                    "ContentType": "application/json"})
    rels = ET.Element("Relationships", {"xmlns": REL})
    ET.SubElement(rels, "Relationship", {"Target": "/3D/3dmodel.model", "Id": "rel-1", "Type": MODEL_REL})
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for member, content in [
            ("[Content_Types].xml", xml_bytes(types)), ("_rels/.rels", xml_bytes(rels)),
            ("3D/3dmodel.model", xml_bytes(model)),
            ("Metadata/model_settings.config", xml_bytes(settings)),
            ("Metadata/project_settings.config", json.dumps(project).encode()),
        ]:
            archive.writestr(member, content)


def export_family(template, names, output, seed=None, executable=None, overrides=None):
    filenames = safe_names(names)
    output = Path(output).resolve()
    if output.exists():
        raise ValueError(f"Output directory already exists; choose a new directory: {output}")
    templates = read_templates(template)
    font = ROOT / "fonts" / "Pacifico-Regular.ttf"
    if not font.is_file():
        raise ValueError(f"Bundled Pacifico font is missing: {font}")
    executable = executable or os.environ.get("OPENSCAD") or shutil.which("openscad")
    if not executable and os.name == "nt":
        candidate = Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "OpenSCAD" / "openscad.exe"
        if candidate.is_file():
            executable = str(candidate)
    if not executable:
        raise ValueError("OpenSCAD not found. Set OPENSCAD to its executable.")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".ornaments-", dir=output.parent) as temp:
        work = Path(temp)
        config = ET.Element("fontconfig")
        ET.SubElement(config, "dir").text = str(font.parent)
        ET.SubElement(config, "cachedir").text = str(work / "font-cache")
        (work / "fonts.conf").write_bytes(xml_bytes(config))
        env = dict(os.environ, FONTCONFIG_FILE=str(work / "fonts.conf"),
                   OPENSCAD_FONT_PATH=str(font.parent))
        staging = work / "projects"
        staging.mkdir()
        manifest = []
        for (name, selected), filename in zip(assignments(names, templates, seed, overrides), filenames):
            print(f"Creating {name}: {selected['style']}...", flush=True)
            current = work / f"name-{len(manifest)}"
            current.mkdir()
            white, red = personalize(name, selected, current, str(executable), env)
            create_project(staging / filename, name, selected["style"], white, red)
            manifest.append({"name": name, "design": selected["style"], "file": filename,
                             "decoration_color": "#FFFFFF", "name_color": "#FF0000"})
        (staging / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        # A concurrent destination must never be replaced, including an empty directory.
        output.mkdir()
        try:
            for path in staging.iterdir():
                shutil.move(str(path), str(output / path.name))
        except OSError:
            raise RuntimeError(f"Could not publish all projects; inspect {output} before retrying.") from None
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--template", required=True, type=Path, help="Original ornament 3MF project.")
    parser.add_argument("--names", required=True, nargs="+", help="Quote names containing spaces.")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "exports" / "family")
    parser.add_argument("--seed", type=int, help="Repeatable randomized design distribution.")
    parser.add_argument("--design", action="append", default=[], metavar="NAME=STYLE",
                        help="Override one recipient's design; repeat as needed.")
    options = parser.parse_args()
    try:
        overrides = {}
        for value in options.design:
            name, separator, style = value.partition("=")
            if not separator or name in overrides:
                raise ValueError(f"Expected a unique NAME=STYLE design override: {value}")
            overrides[name] = style
        output = export_family(options.template, options.names, options.output_dir, options.seed,
                               overrides=overrides)
    except (OSError, ValueError, RuntimeError, zipfile.BadZipFile, ET.ParseError,
            subprocess.TimeoutExpired) as error:
        parser.exit(1, f"3MF export failed: {error}\n")
    print(f"Created {len(options.names)} red/white ornament projects in {output}")


if __name__ == "__main__":
    main()
