import { z } from "zod";

const optionalNumber = z
  .union([z.number(), z.nan(), z.null()])
  .transform((value) => {
    if (value === null || Number.isNaN(value)) {
      return null;
    }

    return value;
  });

export const childSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich.").max(120),
  birthDate: z.string().trim().optional().nullable(),
});

const measurementBaseSchema = z.object({
  childId: z.number().int().positive(),
  measuredAt: z.string().datetime({ offset: true }),
  weight: optionalNumber,
  height: optionalNumber,
  temperature: optionalNumber,
});

const measurementUpdateBaseSchema = z.object({
  measuredAt: z.string().datetime({ offset: true }),
  weight: optionalNumber,
  height: optionalNumber,
  temperature: optionalNumber,
});

export const measurementSchema = measurementBaseSchema.superRefine((value, ctx) => {
  if (
    value.weight === null &&
    value.height === null &&
    value.temperature === null
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Mindestens ein Messwert ist erforderlich.",
      path: ["weight"],
    });
  }
});

export const measurementUpdateSchema = measurementUpdateBaseSchema.superRefine(
  (value, ctx) => {
    if (
      value.weight === null &&
      value.height === null &&
      value.temperature === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mindestens ein Messwert ist erforderlich.",
        path: ["weight"],
      });
    }
  },
);
