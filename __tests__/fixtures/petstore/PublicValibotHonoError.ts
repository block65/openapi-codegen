import { CustomError } from "@block65/custom-error";
import type * as v from "valibot";

export class PublicValibotHonoError extends CustomError {
	static from(
		err: v.ValiError<
			| v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
			| v.BaseSchemaAsync<unknown, unknown, v.BaseIssue<unknown>>
		>,
	) {
		return new PublicValibotHonoError(err.message, err).addDetail({
			violations: err.issues.map((issue) => ({
				field: issue.path?.join(".") || "",
				description: issue.message,
			})),
			description: err.message,
		});
	}
}
