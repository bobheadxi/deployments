import { run } from "./main";

describe("main", () => {
  test("start", () => {
    try {
      run();
    } catch (e) {
      return;
    }
  });
});
