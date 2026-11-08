# Multi-Format Converters Guide

XML Pro Toolkit features a multi-target conversion engine capable of translating XML into JSON, TXT, CSV, TSV, and YAML, as well as converting JSON back into XML.

---

## 1. XML to JSON

XML Pro Toolkit provides two distinct JSON conversion modes:

### Standard JSON Mode
Transforms XML into natural JavaScript objects:
- Sibling elements with identical tags become an array.
- Attributes are prefixed with `@` (e.g. `"@id": "101"`).
- Simple leaf elements with only text become primitive values (numbers, booleans, strings).

### Detailed (Badgerfish) Mode
Preserves complete structural fidelity:
- All element attributes are grouped in `@attributes`.
- Text values are mapped to `#text`.
- CDATA sections are preserved in `#cdata`.

---

## 2. XML to TXT

- **Structured Outline**: Converts the hierarchy into an indented plain text tree showing element tags, attributes, and text values.
- **Raw Text Only**: Extracts all text node contents in sequence, stripped of all markup tags.

---

## 3. XML to CSV / TSV

Detects repeating sibling structures (such as `<book>`, `<item>`, `<user>`, `<record>`) and automatically extracts their attributes and child values into clean tabular CSV or tab-separated TSV format.

---

## 4. XML to YAML

Converts the clean object model into human-readable YAML format with proper indentation, ideal for configuration files.

---

## 5. JSON to XML (Reverse Conversion)

Paste any JSON object or array into the converter to generate valid XML with customizable root tag names.
