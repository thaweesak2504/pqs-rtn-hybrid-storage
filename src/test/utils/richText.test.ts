import { describe, expect, it } from "vitest";
import { hasMeaningfulRichText } from "../../utils/richText";

describe("hasMeaningfulRichText", () => {
  it.each(["", "   ", "<p></p>", "<p><br></p>", "<p>&nbsp;</p>", "\u200B"])(
    "treats %j as empty",
    (value) => {
      expect(hasMeaningfulRichText(value)).toBe(false);
    },
  );

  it.each(["คำเฉลย", "**คำเฉลย**", "<p>คำเฉลย</p>", "1. รายการ"])(
    "treats %j as meaningful",
    (value) => {
      expect(hasMeaningfulRichText(value)).toBe(true);
    },
  );
});
