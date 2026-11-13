import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET
import zipfile


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "export_3mf.py"
SPEC = importlib.util.spec_from_file_location("ornaments", SCRIPT)
ornaments = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = ornaments
SPEC.loader.exec_module(ornaments)


def tetrahedron(offset=0):
    return ornaments.Mesh(
        [(offset, 0, 0), (offset + 1, 0, 0), (offset, 1, 0), (offset, 0, 1)],
        [(0, 2, 1), (0, 1, 3), (0, 3, 2), (1, 2, 3)])


class MeshTests(unittest.TestCase):
    def test_closed_mesh_and_stl_round_trip(self):
        mesh = tetrahedron()
        mesh.validate()
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "mesh.stl"
            ornaments.write_stl(path, mesh)
            actual = ornaments.read_stl(path)
            self.assertEqual(actual.bounds(), mesh.bounds())
            self.assertEqual(len(actual.components()), 1)
            self.assertEqual(len(actual.triangles), 4)

    def test_rejects_open_reversed_nonfinite_and_bad_indices(self):
        for mesh in (
            ornaments.Mesh(tetrahedron().vertices, tetrahedron().triangles[:-1]),
            ornaments.Mesh(tetrahedron().vertices, [(0, 1, 2), *tetrahedron().triangles[1:]]),
            ornaments.Mesh([(float("nan"), 0, 0)], [(0, 0, 0)]),
            ornaments.Mesh(tetrahedron().vertices, [(0, 1, 99)]),
        ):
            with self.subTest(mesh=mesh), self.assertRaises(ValueError):
                mesh.validate()

    def test_dot_and_word_islands_get_minimum_spanning_connections(self):
        a, b, c = tetrahedron(), tetrahedron(3), tetrahedron(8)
        mesh = ornaments.Mesh(a.vertices + b.vertices + c.vertices,
                              a.triangles + [tuple(i + 4 for i in t) for t in b.triangles]
                              + [tuple(i + 8 for i in t) for t in c.triangles])
        self.assertEqual(len(mesh.components()), 3)
        segments = ornaments.connector_segments(mesh)
        self.assertEqual(len(segments), 2)
        self.assertTrue(all(width >= 0.9 for _, _, width in segments))

    def test_transform_uses_3mf_row_vector_order(self):
        mesh = tetrahedron().transformed([0, 2, 0, -3, 0, 0, 0, 0, 1, 10, 20, 30])
        self.assertEqual(mesh.vertices[1], (10, 22, 30))
        self.assertEqual(mesh.vertices[2], (7, 20, 30))

    def test_frame_fitting_moves_only_glyph_vertices_without_adding_support_bars(self):
        glyphs = tetrahedron()
        frame = tetrahedron().transformed([100, 0, 0, 0, 100, 0, 0, 0, 1, 0, 0, 0])
        fitted = ornaments.fit_to_frame(glyphs, frame, [(0, 10), (0.1, 0.8), (0, 1)])
        self.assertEqual(len(fitted.vertices), len(glyphs.vertices))
        self.assertEqual(fitted.triangles, glyphs.triangles)
        self.assertAlmostEqual(fitted.bounds()[0][0], 0.8)
        self.assertGreater(fitted.bounds()[0][1], 98)
        self.assertAlmostEqual(fitted.bounds()[1][1] - fitted.bounds()[1][0], 0.7)
        self.assertEqual(glyphs.vertices, tetrahedron().vertices)


class ExportTests(unittest.TestCase):
    def test_names_preserve_spaces_and_reject_unsafe_destinations(self):
        self.assertEqual(ornaments.safe_names(["Maria Pia", "Andrea"]), ["Maria Pia.3mf", "Andrea.3mf"])
        for names in ([], [""], ["../out"], ["CON"], ["aux.txt"], ["A", "a"],
                      ["A."], ["A\nB"], [" A"], ["A:B"]):
            with self.subTest(names=names), self.assertRaises(ValueError):
                ornaments.safe_names(names)

    def test_random_distribution_is_balanced_and_repeatable(self):
        names = [str(i) for i in range(12)]
        styles = [{"style": style} for style in ["bells", "bow", "mountains", "paw", "reindeer"]]
        first = ornaments.assignments(names, styles, 42)
        self.assertEqual(first, ornaments.assignments(names, styles, 42))
        self.assertNotEqual(first, ornaments.assignments(names, styles, 43))
        counts = [sum(style == assigned for _, assigned in first) for style in styles]
        self.assertEqual(sorted(counts), [2, 2, 2, 3, 3])
        self.assertEqual([name for name, _ in first], names)

    def test_recipient_design_override_preserves_other_assignments(self):
        names = ["Phoebe", "Lavinia"]
        styles = [{"style": "paw"}, {"style": "reindeer"}]
        original = ornaments.assignments(names, styles, 42)
        changed = ornaments.assignments(names, styles, 42, {"Lavinia": "reindeer"})
        self.assertEqual(changed[0], original[0])
        self.assertEqual(changed[1][1]["style"], "reindeer")
        for overrides in ({"Unknown": "paw"}, {"Lavinia": "unknown"}):
            with self.assertRaises(ValueError):
                ornaments.assignments(names, styles, 42, overrides)

    def test_project_has_standard_materials_and_bambu_part_assignments(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "name.3mf"
            ornaments.create_project(path, "Maria & Pia", "bells", tetrahedron(), tetrahedron(2))
            with zipfile.ZipFile(path) as archive:
                self.assertIsNone(archive.testzip())
                main = ET.fromstring(archive.read("3D/3dmodel.model"))
                bases = main.findall("c:resources/c:basematerials/c:base", ornaments.NS)
                self.assertEqual([b.get("displaycolor") for b in bases], ["#FFFFFFFF", "#FF0000FF"])
                objects = main.findall("c:resources/c:object", ornaments.NS)
                self.assertEqual([(o.get("pid"), o.get("pindex")) for o in objects[:2]],
                                 [("1", "0"), ("1", "1")])
                self.assertEqual(objects[1].get("name"), "Maria & Pia")
                self.assertEqual(len(main.findall("c:build/c:item", ornaments.NS)), 1)
                self.assertEqual(len(objects[2].findall("c:components/c:component", ornaments.NS)), 2)
                config = ET.fromstring(archive.read("Metadata/model_settings.config"))
                parts = config.findall("object/part")
                self.assertEqual([p.find("metadata[@key='extruder']").get("value") for p in parts],
                                 ["1", "2"])
                settings = json.loads(archive.read("Metadata/project_settings.config"))
                self.assertEqual(settings["filament_colour"], ["#FFFFFF", "#FF0000"])
                self.assertEqual(len(settings["inherits_group"]), 4)
                self.assertEqual(settings["printer_settings_id"], "Bambu Lab P2S 0.4 nozzle")
                self.assertEqual(settings["filament_settings_id"], ["Generic PLA @BBL P2S"] * 2)
                self.assertEqual(settings["print_settings_id"], "0.20mm Standard @BBL P2S")
                self.assertTrue(all(settings["inherits_group"]))
                self.assertTrue(all(settings["different_settings_to_system"]))
                self.assertFalse(any("gcode" in key.lower() for key in settings))
                self.assertFalse(any("gcode" in key.lower() for key in
                                     settings["different_settings_to_system"]))
                self.assertFalse(any("Auxiliaries" in member for member in archive.namelist()))

    def test_existing_destination_is_never_modified(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "existing"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("unchanged")
            with self.assertRaisesRegex(ValueError, "already exists"):
                ornaments.export_family("missing.3mf", ["Andrea"], output)
            self.assertEqual(sentinel.read_text(), "unchanged")

    def test_render_failure_does_not_publish_partial_projects(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "family"
            with patch.object(ornaments, "read_templates", return_value=[{"style": "bells"}]), \
                    patch.object(ornaments, "personalize", side_effect=ValueError("detached dot")):
                with self.assertRaisesRegex(ValueError, "detached dot"):
                    ornaments.export_family("template.3mf", ["Maria Pia"], output, executable="openscad")
            self.assertFalse(output.exists())
            self.assertEqual(list(Path(temp).iterdir()), [])

    def test_publication_race_preserves_concurrent_destination(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "family"

            def render(*args):
                output.mkdir()
                (output / "keep.txt").write_text("concurrent")
                return tetrahedron(), tetrahedron(2)

            with patch.object(ornaments, "read_templates", return_value=[{"style": "bells"}]), \
                    patch.object(ornaments, "personalize", side_effect=render):
                with self.assertRaises(FileExistsError):
                    ornaments.export_family("template.3mf", ["Andrea"], output, executable="openscad")
            self.assertEqual([p.name for p in output.iterdir()], ["keep.txt"])

    def test_wrong_template_has_actionable_error(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "wrong.3mf"
            ornaments.create_project(path, "Andrea", "bells", tetrahedron(), tetrahedron(2))
            with self.assertRaisesRegex(ValueError, "five editable"):
                ornaments.read_templates(path)

    def test_geometry_only_3mf_has_actionable_error(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "geometry-only.3mf"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("3D/3dmodel.model", '<model/>')
            with self.assertRaisesRegex(ValueError, "missing required project data"):
                ornaments.read_templates(path)

    def test_empty_template_pool_does_not_loop_forever(self):
        with self.assertRaisesRegex(ValueError, "No decoration"):
            ornaments.assignments(["Andrea"], [])


if __name__ == "__main__":
    unittest.main()
