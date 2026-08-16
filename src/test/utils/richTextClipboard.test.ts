import { describe, expect, it } from "vitest";
import { normalizePastedHtmlForEditor } from "../../utils/richTextClipboard";

describe("normalizePastedHtmlForEditor", () => {
  it("removes source color and emphasis so an Answer Key inherits its destination style", () => {
    const pasted = [
      '<p class="question-preview">',
      '<span style="color: rgb(226, 232, 240); font-size: 18px"><strong>Test answer copied from a question</strong></span>',
      ' <span style="color: var(--color-warning)">202.4.1 ข.</span>',
      "</p>",
    ].join("");

    expect(normalizePastedHtmlForEditor(pasted)).toBe(
      "<p>Test answer copied from a question 202.4.1 ข.</p>",
    );
  });

  it("preserves paragraphs, lists, and tables while stripping presentation", () => {
    const pasted = [
      '<p style="color:red"><em>ย่อหน้าแรก</em></p>',
      '<ol start="3" class="foreign-list"><li value="4"><b>รายการ</b></li></ol>',
      '<table style="background:red"><tbody><tr><th scope="col" class="heading">หัวข้อ</th>',
      '<td colspan="2" style="font-weight:bold"><span>ข้อมูล</span></td></tr></tbody></table>',
    ].join("");

    const normalized = normalizePastedHtmlForEditor(pasted);

    expect(normalized).toContain("<p>ย่อหน้าแรก</p>");
    expect(normalized).toContain('<ol start="3"><li value="4">รายการ</li></ol>');
    expect(normalized).toContain('<th scope="col">หัวข้อ</th>');
    expect(normalized).toContain('<td colspan="2">ข้อมูล</td>');
    expect(normalized).not.toMatch(/style=|class=|<em>|<b>|<span>/);
  });

  it("drops executable or embedded content and unsafe attributes", () => {
    const pasted = [
      '<p id="source" onclick="steal()">ข้อความ<!-- note --></p>',
      '<script>alert(1)</script><style>.x{color:red}</style>',
      '<iframe src="https://example.invalid"></iframe><img src="file:///secret.png">',
    ].join("");

    expect(normalizePastedHtmlForEditor(pasted)).toBe("<p>ข้อความ</p>");
  });

  it("retains the editor's safe numbered-hierarchy marker only", () => {
    const pasted =
      '<ol data-list-style="numbered-hierarchy" class="numbered-hierarchy-list" data-extra="x"><li>หนึ่ง</li></ol>';

    expect(normalizePastedHtmlForEditor(pasted)).toBe(
      '<ol data-list-style="numbered-hierarchy"><li>หนึ่ง</li></ol>',
    );
  });
});
