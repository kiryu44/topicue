import { z } from "zod";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema = z.json();

export const parseJson = (source: string): JsonValue => jsonValueSchema.parse(JSON.parse(source));
