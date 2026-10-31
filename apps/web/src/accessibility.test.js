// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import axe from "axe-core";
import Brand from "./components/layout/Brand";
import ReminderPreferencesForm from "./components/ReminderPreferencesForm";
import { ToastProvider } from "./providers/ToastProvider";

describe("application accessibility smoke test", () => {
  it("has no critical or serious violations in reminder settings and shared shell controls", async () => {
    document.documentElement.lang = "en";
    document.title = "HackHub reminder settings";
    HTMLCanvasElement.prototype.getContext = () => null;
    document.body.innerHTML = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          ToastProvider,
          null,
          React.createElement(
            "main",
            null,
            React.createElement("h1", null, "Reminder settings"),
            React.createElement(Brand),
            React.createElement(ReminderPreferencesForm)
          )
        )
      )
    );

    const results = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    const blocking = results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact)
    );
    expect(blocking.map((violation) => violation.id)).toEqual([]);
  });
});
