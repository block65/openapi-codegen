import * as v from "valibot";
import { expect, test } from "vitest";
import type {
	CalendarDate,
	DateTime,
	TrialLength,
	WallTime,
} from "./fixtures/test1/types.ts";
import {
	calendarDateSchema,
	dateTimeSchema,
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
