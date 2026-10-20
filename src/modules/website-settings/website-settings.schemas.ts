import { z } from 'zod';

export const AcademyVisibilityValues = z.object({
  academyPromotionEnabled: z.boolean(),
  academyNavbarEnabled: z.boolean(),
  academyHomepageSectionEnabled: z.boolean(),
});

export const UpdateAcademyVisibilityBody = AcademyVisibilityValues.extend({
  expectedVersion: z.number().int().positive(),
}).strict();
export type UpdateAcademyVisibilityBody = z.infer<
  typeof UpdateAcademyVisibilityBody
>;

export const PublicAcademyVisibilityResponse = AcademyVisibilityValues.extend({
  effectiveNavbar: z.boolean(),
  effectiveSection: z.boolean(),
}).strict();

export const AdminAcademyVisibilityResponse =
  PublicAcademyVisibilityResponse.extend({
    version: z.number().int().positive(),
    updatedAt: z.iso.datetime(),
  }).strict();

export function toPublicAcademyVisibility(
  values: z.infer<typeof AcademyVisibilityValues>,
) {
  const safeValues = {
    academyPromotionEnabled: values.academyPromotionEnabled,
    academyNavbarEnabled: values.academyNavbarEnabled,
    academyHomepageSectionEnabled: values.academyHomepageSectionEnabled,
  };
  return {
    ...safeValues,
    effectiveNavbar:
      safeValues.academyPromotionEnabled && safeValues.academyNavbarEnabled,
    effectiveSection:
      safeValues.academyPromotionEnabled &&
      safeValues.academyHomepageSectionEnabled,
  };
}
