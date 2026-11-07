import type { oas32 } from "openapi3-ts";
import * as v from "valibot";
import { expect, expectTypeOf, test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";
import type {
	CalendarDate,
	DateTime,
	TrialLength,
	WallTime,
} from "./fixtures/test1/types.ts";
import {
	calendarDateSchema,
	dateTimeSchema,
	inputCalendarDateSchema,
	inputDateTimeSchema,
	inputTrialLengthSchema,
	inputWallTimeSchema,
	trialLengthSchema,
	wallTimeSchema,
} from "./fixtures/test1/valibot.ts";

// regex-accepted values, so `satisfies` fails where a format's type is narrower than its regex
const dates = [
	"2024-02-29",
	"0000-01-01",
	"9999-12-31",
] as const satisfies readonly CalendarDate[];

const times = [
	"00:00:00Z",
	"12:30:45z",
	"23:59:60.123456+05:30",
	"08:15:00-08:00",
] as const satisfies readonly WallTime[];

const dateTimes = [
	"2024-01-01T00:00:00Z",
	"2024-01-01t00:00:00z",
	"2024-01-01 23:59:60.5+05:30",
	"1999-12-31T23:59:59-00:00",
] as const satisfies readonly DateTime[];

const durations = [
	"P1Y2M3W4DT5H6M7.5S",
	"PT0S",
	"P1W",
	"PT1.5S",
] as const satisfies readonly TrialLength[];

test.each(dates)("a date %j parses and has the date type", (value) => {
	expect(v.safeParse(calendarDateSchema, value)).toMatchObject({
		success: true,
		output: value,
	});
});

test.each(times)("a time %j parses and has the time type", (value) => {
	expect(v.safeParse(wallTimeSchema, value)).toMatchObject({
		success: true,
		output: value,
	});
});

test.each(dateTimes)(
	"a date-time %j parses and has the date-time type",
	(value) => {
		expect(v.safeParse(dateTimeSchema, value)).toMatchObject({
			success: true,
			output: value,
		});
	},
);

test.each(durations)(
	"a duration %j parses and has the duration type",
	(value) => {
		expect(v.safeParse(trialLengthSchema, value)).toMatchObject({
			success: true,
			output: value,
		});
	},
);

test("a temporal format's schemas output its generated type", () => {
	expectTypeOf<
		v.InferOutput<typeof dateTimeSchema>
	>().toEqualTypeOf<DateTime>();
	expectTypeOf<
		v.InferOutput<typeof inputDateTimeSchema>
	>().toEqualTypeOf<DateTime>();
	expectTypeOf<
		v.InferOutput<typeof calendarDateSchema>
	>().toEqualTypeOf<CalendarDate>();
	expectTypeOf<
		v.InferOutput<typeof inputCalendarDateSchema>
	>().toEqualTypeOf<CalendarDate>();
	expectTypeOf<
		v.InferOutput<typeof wallTimeSchema>
	>().toEqualTypeOf<WallTime>();
	expectTypeOf<
		v.InferOutput<typeof inputWallTimeSchema>
	>().toEqualTypeOf<WallTime>();
	expectTypeOf<
		v.InferOutput<typeof trialLengthSchema>
	>().toEqualTypeOf<TrialLength>();
	expectTypeOf<
		v.InferOutput<typeof inputTrialLengthSchema>
	>().toEqualTypeOf<TrialLength>();
});

test.each([
	["date-time", dateTimeSchema, "2024-13-01T00:00:00Z"],
	["date-time", dateTimeSchema, "2024-01-01T00:00:00"],
	["date-time", dateTimeSchema, "2024-01-01"],
	["date-time", inputDateTimeSchema, "2024-01-01T24:00:00Z"],
	["date", calendarDateSchema, "2024-1-01"],
	["date", inputCalendarDateSchema, "2024-01-32"],
	["time", wallTimeSchema, "12:00:00"],
	["time", inputWallTimeSchema, "12:60:00Z"],
	["duration", trialLengthSchema, "P"],
	["duration", inputTrialLengthSchema, "PT"],
	["duration", trialLengthSchema, "1D"],
])("a malformed %s %j is rejected", (_format, schema, value) => {
	expect(v.safeParse(schema, value).success).toBe(false);
});

test("a temporal schema names its alias, inlines a property's literal, and defers to a type hint", async () => {
	const schema: oas32.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {},
		components: {
			schemas: {
				Timestamp: { type: "string", format: "date-time" },
				Window: {
					type: "object",
					additionalProperties: false,
					required: ["opensAt"],
					properties: {
						opensAt: { type: "string", format: "date-time" },
						closesAt: {
							type: "string",
							format: "date-time",
							"x-typescript-hint": "Timestamp",
						},
					},
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});
