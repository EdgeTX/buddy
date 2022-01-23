import { describe, it, expect } from "@jest/globals";
import React from "react";
import { render } from "test-utils/testing-library";
import Markdown from "renderer/components/Markdown";

describe("<Markdown />", () => {
  it("should return the given markdown string as html", () => {
    const { asFragment } = render(
      <Markdown>
        {
          "# This is my markdown\n\n- A bullet point\n\nA paragraphy\n\n[A link](https://google.com)"
        }
      </Markdown>
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
