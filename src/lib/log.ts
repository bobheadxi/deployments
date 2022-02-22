import { setFailed } from "@actions/core";

export default class Logger {
  private debugLogs: boolean;

  constructor(options: { debug: boolean }) {
    this.debugLogs = options.debug;
  }

  info(message, ...optionals) {
    console.log(message, ...optionals);
  }

  debug(message, ...optionals) {
    if (this.debugLogs) {
      console.warn(message, ...optionals);
    }
  }

  fail(message, ...optionals) {
    console.error(message, ...optionals);
    setFailed(`${message} - see logs for more information`);
  }
}
