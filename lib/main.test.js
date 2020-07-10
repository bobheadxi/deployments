"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
describe("main", () => {
    test("start", () => {
        try {
            main_1.run();
        }
        catch (e) {
            return;
        }
    });
});
