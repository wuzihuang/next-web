import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cartStateForVariant,
  findVariant,
  formatMoney,
  readSelectedOptions,
} from "../assets/product-form.js";

const product = {
  variants: [
    { id: 11, available: true, options: ["Cloud White"], price: 5999 },
    { id: 12, available: false, options: ["Charcoal Black"], price: 5999 },
  ],
};

describe("findVariant", () => {
  it("returns the matching variant", () => {
    const variant = findVariant(product, ["Cloud White"]);
    assert.equal(variant.id, 11);
  });

  it("returns null when the combination does not exist", () => {
    assert.equal(findVariant(product, ["Mist Weave"]), null);
  });
});

describe("cartStateForVariant", () => {
  it("marks a missing variant unavailable", () => {
    assert.deepEqual(cartStateForVariant(null), {
      available: false,
      id: null,
      reason: "no_variant",
    });
  });

  it("does not allow add-to-cart for a sold-out variant", () => {
    const state = cartStateForVariant(product.variants[1]);
    assert.equal(state.available, false);
    assert.equal(state.reason, "sold_out");
    assert.equal(state.id, 12);
  });

  it("allows add-to-cart when the variant is in stock", () => {
    const state = cartStateForVariant(product.variants[0]);
    assert.equal(state.available, true);
    assert.equal(state.reason, "ok");
  });
});

describe("formatMoney", () => {
  it("uses the shop money format without inventing a catalog amount", () => {
    assert.equal(formatMoney(1234, "${{amount}}"), "$12.34");
  });
});

describe("readSelectedOptions", () => {
  it("reads option fields in document order", () => {
    const form = {
      querySelectorAll() {
        return [{ value: "Cloud White" }, { value: "Mist Weave" }];
      },
    };
    assert.deepEqual(readSelectedOptions(form), ["Cloud White", "Mist Weave"]);
  });
});
