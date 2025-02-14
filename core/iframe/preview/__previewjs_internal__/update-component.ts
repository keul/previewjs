import { Variant } from "../..";
import { sendMessageFromPreview } from "./messages";
import { render } from "./renderer/index";
import { getState } from "./state";

export async function updateComponent(
  load: () => Promise<{
    componentInfo: {
      relativeFilePath: string;
      componentName: string;
      Component: any;
      variants: Array<
        Variant & {
          props?: any;
        }
      >;
    };
    loadingError: string | null;
  }>
) {
  const currentState = getState();
  if (!currentState) {
    return;
  }
  try {
    const { componentInfo, loadingError } = await load();
    if (
      componentInfo.relativeFilePath !== currentState.relativeFilePath ||
      componentInfo.componentName !== currentState.componentName
    ) {
      // A component we're not looking at anymore was updated.
      return;
    }
    const variant =
      componentInfo.variants.find((v) => v.key === currentState.variantKey) ||
      componentInfo.variants[0];
    if (!variant) {
      throw new Error(`No variant was found.`);
    }
    const fn = (path: string, returnValue: any) => () => {
      sendMessageFromPreview({ kind: "action", type: "fn", path });
      return returnValue;
    };
    let defaultProps = {
      // Note: this is only there so `fn` doesn't get optimised
      // away :)
      _: fn("", null),
    };
    eval(`
      defaultProps = ${currentState.defaultPropsSource};
      `);
    if (variant.key === "custom") {
      eval(`
        let properties = {};
        ${currentState.customVariantPropsSource};
        variant.props = properties;
        `);
    }
    sendMessageFromPreview({
      kind: "renderer-updated",
      relativeFilePath: componentInfo.relativeFilePath,
      componentName: componentInfo.componentName,
      variantKey: variant.key,
      // Note: we must remove `props` since it may not be serialisable.
      variants: componentInfo.variants.map(({ props, ...rest }) => rest),
      loadingError,
    });
    render(componentInfo.Component, { ...defaultProps, ...variant.props });
  } catch (error: any) {
    sendMessageFromPreview({
      kind: "rendering-error",
      message: error.stack || error.message,
    });
  }
}
