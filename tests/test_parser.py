"""Tests for parse_content_md — the most load-bearing function in the repo.

Every lesson, fork save, and merge-back preview routes through this parser.
S5: previously validated only by running the full importer; these are direct
unit tests of directive parsing and the --strict warning machinery.
"""

import seed.import_seed as imp


def parse(text: str, topic: str = "unit-test"):
    """Parse with a clean warning slate; return (blocks, warnings)."""
    imp._WARNINGS.clear()
    blocks = imp.parse_content_md(text, topic_name=topic)
    return blocks, list(imp._WARNINGS)


def types(blocks) -> list[str]:
    return [b["block_type"] for b in blocks]


class TestBasicDirectives:
    def test_plain_prose_becomes_markdown(self):
        blocks, warnings = parse("Just a paragraph of prose.")
        assert types(blocks) == ["markdown"]
        assert warnings == []

    def test_gear_block_carries_label(self):
        blocks, _ = parse('<!-- block: gear, n: 1, label: "The spark" -->\n\nProse.')
        gear = next(b for b in blocks if b["block_type"] == "gear")
        assert '"The spark"' in gear["meta"] or "The spark" in gear["meta"]

    def test_state_plus_known_plot_is_clean(self):
        text = (
            "<!-- block: state, values: {mu: 0, sigma: 1} -->\n\n"
            "<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, "
            "binds: [mu, sigma], anchor: curve -->\n\nProse."
        )
        blocks, warnings = parse(text)
        assert "plot" in types(blocks)
        assert warnings == []

    def test_layer_directive_switches_layers(self):
        # Default layer is `both`; `<!-- layer: ... -->` switches from there.
        text = (
            "Opening prose.\n\n---\n\n<!-- layer: formal -->\n\nFormal prose.\n\n"
            "---\n\n<!-- layer: both -->\n\nShared prose."
        )
        blocks, _ = parse(text)
        layers = [b["layer"] for b in blocks if b["block_type"] == "markdown"]
        assert layers == ["both", "formal", "both"]

    def test_callout_and_derivation_parse(self):
        text = (
            "<!-- block: callout, kind: warning -->\nCareful now.\n<!-- /block -->\n\n"
            '<!-- block: derivation, title: "Why", collapsed: true -->\nBecause.\n<!-- /block -->'
        )
        blocks, warnings = parse(text)
        assert "callout" in types(blocks) and "derivation" in types(blocks)
        assert warnings == []

    def test_inline_misconception(self):
        blocks, _ = parse(
            "<!-- block: misconception, inline: true -->\n**Wrong idea.**\n<!-- /block -->"
        )
        assert "misconception_inline" in types(blocks)


class TestYamlBodies:
    DECISION = (
        "<!-- block: state, values: {mu: 0} -->\n\n"
        "<!-- block: decision, anchor: pick -->\n"
        "question: |\n  Which way?\n"
        "options:\n"
        "  - id: left\n    label: \"Left\"\n    writes: { mu: 0 }\n    response: |\n      Nope.\n"
        "  - id: right\n    label: \"Right\"\n    writes: { mu: 1 }\n    response: |\n      Yes.\n"
        "correct: right\n"
        "<!-- /block -->"
    )

    def test_decision_yaml_parses_options(self):
        blocks, warnings = parse(self.DECISION)
        decision = next(b for b in blocks if b["block_type"] == "decision")
        assert "right" in decision["meta"]
        assert warnings == []

    def test_bad_yaml_degrades_to_parse_error(self):
        text = (
            "<!-- block: decision, anchor: broken -->\n"
            "options: [unclosed\n"
            "<!-- /block -->"
        )
        blocks, warnings = parse(text)
        assert "parse_error" in types(blocks)
        assert warnings  # YAML failure is warned, not swallowed

    def test_playground_with_declared_binds_is_clean(self):
        text = (
            "<!-- block: state, values: {n: 1} -->\n\n"
            "<!-- block: playground, anchor: feel -->\n"
            "binds: [n]\n"
            "controls:\n  - param: n\n    label: \"n\"\n    min: 1\n    max: 10\n"
            "<!-- /block -->"
        )
        _, warnings = parse(text)
        assert warnings == []


class TestStrictGuards:
    def test_unknown_plot_spec_warns(self):
        _, warnings = parse(
            "<!-- block: plot, spec: not_a_real_spec, anchor: x -->\n\nProse."
        )
        assert any("unknown plot spec" in w for w in warnings)

    def test_undeclared_plot_bind_warns(self):
        # Contract: playground binds/controls *declare* keys; only PLOT binds
        # are checked against the declared set. A plot binding a key nothing
        # declares is the authoring typo --strict exists to catch.
        text = (
            "<!-- block: state, values: {mu: 0} -->\n\n"
            "<!-- block: plot, spec: gaussian_pdf, params: {mu: 0}, "
            "binds: [mu, sigma], anchor: curve -->\n\nProse."
        )
        _, warnings = parse(text)
        assert any("'sigma'" in w and "binds" in w for w in warnings)

    def test_todo_gear_label_warns(self):
        _, warnings = parse('<!-- block: gear, n: 1, label: "TODO — name the spark" -->\n\nProse.')
        assert any("placeholder label" in w for w in warnings)

    def test_todo_scaffold_body_warns(self):
        _, warnings = parse("> TODO (N): fill this in later.")
        assert any("placeholder scaffold" in w for w in warnings)

    def test_quiz_block_warns_deprecated(self):
        text = (
            "<!-- block: quiz -->\n**Challenge:** what is 2+2?\n\n"
            "*Hint:* count.\n\n<!-- solution: 4 -->"
        )
        blocks, warnings = parse(text)
        assert any("deprecated `quiz`" in w for w in warnings)
        # Still parses (non-strict imports keep working) — just loudly.
        assert "quiz" in types(blocks)

    def test_clean_modern_lesson_has_no_warnings(self):
        text = (
            "<!-- block: state, values: {rate: 1} -->\n\n"
            "<!-- block: plot, spec: exponential_pdf, params: {rate: 1}, "
            "binds: [rate], anchor: curve -->\n\n"
            '<!-- block: gear, n: 1, label: "The wait" -->\n\n# Title\n\nProse.'
        )
        _, warnings = parse(text)
        assert warnings == []
