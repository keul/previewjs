import { expect, testSuite } from "../../testing";

export const propsEditorTests = testSuite("react/props editor", (test) => {
  test("updates when switching components", "react", async ({ controller }) => {
    await controller.show("src/App.tsx:App");
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector(".App-logo");
    const modifiedCode = `
properties = {
  foo: "bar"
};
`.trim();
    await controller.props.editor.replaceText(modifiedCode);
    expect(await controller.props.editor.getText()).toEqual(modifiedCode);
    await controller.show("src/Other.tsx:Other");
    await previewIframe.waitForSelector(".Other");
    expect(await controller.props.editor.getText()).toNotEqual(modifiedCode);
  });

  test(
    "resets props when refresh button is clicked",
    "react",
    async ({ controller }) => {
      await controller.show("src/App.tsx:App");
      const previewIframe = await controller.previewIframe();
      await previewIframe.waitForSelector(".App-logo");
      const originalCode = await controller.props.editor.getText();
      const modifiedCode = `
properties = {
  foo: "bar"
}
    `.trim();
      await controller.props.editor.replaceText(modifiedCode);
      expect(await controller.props.editor.getText()).toEqual(modifiedCode);

      await controller.props.refreshButton.click();
      expect(await controller.props.editor.getText()).toEqual(originalCode);
    }
  );

  test("controls props", "react", async ({ appDir, controller }) => {
    await appDir.update(
      "src/Button.tsx",
      {
        kind: "replace",
        text: `
import React from "react";
export function Button(props: { label: string; disabled?: boolean }) {
  return (
    <button id="button" disabled={props.disabled}>
      {props.label}
    </button>
  );
}
`,
      },
      {
        inMemoryOnly: true,
      }
    );
    await controller.show("src/Button.tsx:Button");
    await controller.props.editor.replaceText(`
properties = {
  label: "label"
};
`);
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector("xpath=//button[contains(., 'label')]");

    await controller.props.editor.replaceText(`
properties = {
  label: "updated"
};
`);
    await previewIframe.waitForSelector(
      "xpath=//button[contains(., 'updated')]"
    );
  });

  test(
    "keeps invocation source when switching back and forth",
    "react",
    async ({ controller }) => {
      await controller.show("src/App.tsx:App");
      const previewIframe = await controller.previewIframe();
      await previewIframe.waitForSelector(".App-logo");
      const modifiedCode = `
properties = {
  label: "modified"
};
`.trim();
      await controller.props.editor.replaceText(modifiedCode);

      await controller.show("src/Other.tsx:Other");
      await previewIframe.waitForSelector(".Other");
      expect(await controller.props.editor.getText()).toNotEqual(modifiedCode);
      await controller.show("src/App.tsx:App");
      await previewIframe.waitForSelector(".App-logo");
      expect(await controller.props.editor.getText()).toEqual(modifiedCode);
    }
  );
});
