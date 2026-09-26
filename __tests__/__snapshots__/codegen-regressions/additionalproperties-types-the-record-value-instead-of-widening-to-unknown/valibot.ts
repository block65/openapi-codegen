import * as v from "valibot";

export const inputLabelsSchema = v.record(v.string(), v.string());
export const labelsSchema = inputLabelsSchema;
export const inputGetThingCommandResponseSchema = inputLabelsSchema;
export const getThingCommandResponseSchema = labelsSchema;
