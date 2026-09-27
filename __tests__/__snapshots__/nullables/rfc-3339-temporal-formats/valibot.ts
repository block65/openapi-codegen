import * as v from "valibot";

export const inputMyDateSchema = v.pipe(v.string(), v.regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u, "date"), v.custom<`${number}-${number}-${number}`>(() => true));
export const myDateSchema = v.pipe(v.string(), v.trim(), v.regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u, "date"), v.custom<`${number}-${number}-${number}`>(() => true));
export const inputMyTimeSchema = v.pipe(v.string(), v.regex(/^([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?([Zz]|[+-]([01]\d|2[0-3]):[0-5]\d)$/u, "time"), v.custom<`${number}:${number}:${number}${string}`>(() => true));
export const myTimeSchema = v.pipe(v.string(), v.trim(), v.regex(/^([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?([Zz]|[+-]([01]\d|2[0-3]):[0-5]\d)$/u, "time"), v.custom<`${number}:${number}:${number}${string}`>(() => true));
export const inputMyDateTimeSchema = v.pipe(v.string(), v.regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[Tt ]([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?([Zz]|[+-]([01]\d|2[0-3]):[0-5]\d)$/u, "date-time"), v.custom<`${number}-${number}-${number}T${number}:${number}:${number}${string}`>(() => true));
export const myDateTimeSchema = v.pipe(v.string(), v.trim(), v.regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[Tt ]([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?([Zz]|[+-]([01]\d|2[0-3]):[0-5]\d)$/u, "date-time"), v.custom<`${number}-${number}-${number}T${number}:${number}:${number}${string}`>(() => true));
export const inputMyDurationSchema = v.pipe(v.string(), v.regex(/^P(?!$)((\d+Y)?(\d+M)?(\d+W)?(\d+D)?)(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/u, "duration"), v.custom<`P${string}`>(() => true));
export const myDurationSchema = v.pipe(v.string(), v.trim(), v.regex(/^P(?!$)((\d+Y)?(\d+M)?(\d+W)?(\d+D)?)(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/u, "duration"), v.custom<`P${string}`>(() => true));
