/**
 * Maps an RFC 3339 temporal format to the regex literal that checks a value,
 * and the template-literal type every match satisfies
 */
export function temporalFormat(format: string | undefined) {
	// RFC 3339 departs from ISO 8601 in ways these patterns encode. `date-time`
	// and `time` require an offset. The seconds field admits a leap second of
	// `60`. `T` and `Z` may be lower case, and a space may separate the date
	// from the time. `duration` follows the ISO 8601 grammar in Appendix A
	switch (format) {
		case "date":
			return {
				regex: String.raw`/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u`,
				type: "`${number}-${number}-${number}`",
			};
		case "time":
			return {
				regex: String.raw`/^([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?([Zz]|[+-]([01]\d|2[0-3]):[0-5]\d)$/u`,
				type: "`${number}:${number}:${number}${string}`",
			};
		case "date-time":
			return {
				regex: String.raw`/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[Tt ]([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?([Zz]|[+-]([01]\d|2[0-3]):[0-5]\d)$/u`,
				type: '`${number}-${number}-${number}${"T" | "t" | " "}${number}:${number}:${number}${string}`',
			};
		case "duration":
			return {
				regex: String.raw`/^P(?!$)((\d+Y)?(\d+M)?(\d+W)?(\d+D)?)(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/u`,
				type: "`P${string}`",
			};
		default:
			return;
	}
}
