
import { SheetDataMapper } from "../../src/utils/SheetDataMapper";

describe("SheetDataMapper", () => {
    const headers = ["ColA", "ColB"];
    let mapper: SheetDataMapper;

    beforeEach(() => {
        mapper = new SheetDataMapper(headers);
    });

    test("toObject maps row array to object", () => {
        const row = ["ValA", "ValB"];
        const obj = mapper.toObject(row);
        expect(obj).toEqual({ ColA: "ValA", ColB: "ValB" });
    });

    test("toArray maps object to row array", () => {
        const obj = { ColA: "ValA", ColB: "ValB" };
        const row = mapper.toArray(obj);
        expect(row).toEqual(["ValA", "ValB"]);
    });

    test("toArray handles missing keys with empty strings", () => {
        const obj = { ColA: "ValA" };
        const row = mapper.toArray(obj);
        expect(row).toEqual(["ValA", ""]);
    });

    test("validateHeaders throws if missing", () => {
        expect(() => mapper.validateHeaders(["ColC"])).toThrow("Missing required headers: ColC");
    });

    test("validateHeaders passes if present", () => {
        expect(() => mapper.validateHeaders(["ColA"])).not.toThrow();
    });

    test("getColumnIndex returns correct index", () => {
        expect(mapper.getColumnIndex("ColB")).toBe(1);
        expect(mapper.getColumnIndex("ColC")).toBe(-1);
    });
});
