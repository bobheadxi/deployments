import { getInput } from "@actions/core";

/**
 * Alternative to @actions/core.getBooleanInput that supports default values
 */
export function getBooleanInput(key: string, defaultTrue: boolean) {
  if (defaultTrue) {
    // unless 'false', always true
    return getInput(key, { trimWhitespace: true }) !== "false";
  }
  // unless 'true', always false
  return getInput(key, { trimWhitespace: true }) === "true";
}

export function getRequiredInput(key: string): string {
  return getInput(key, { required: true, trimWhitespace: true });
}

export function getOptionalInput(key: string): string | undefined {
  return getInput(key, { required: false, trimWhitespace: true }) || undefined;
}

export function parseOptionalRequiredContexts(
  key: string
): string[] | undefined {
  const required_contexts = getOptionalInput(key);

  if (required_contexts !== "*") {
    if (
      required_contexts == undefined ||
      required_contexts === "" ||
      required_contexts === "[]"
    ) {
      return [];
    } else {
      return required_contexts.split(",");
    }
  }
}
