// Runtime validation schemas (Zod) paired with the TypeScript models.
// Used at trust boundaries: HTTP handlers, Pub/Sub subscribers, seed scripts.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const facilityTypeSchema = z.enum([
  'hospital',
  'hotel',
  'school',
  'college',
  'factory',
]);

export const userRoleSchema = z.enum([
  'admin',
  'employee',
  'community',
  'common',
]);

export const languageSchema = z.enum(['en', 'hi', 'ta', 'te', 'mr', 'bn']);

export const incidentSeveritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

export const incidentStatusSchema = z.enum([
  'reported',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
]);

export const meshEventStatusSchema = z.enum([
  'published',
  'received',
  'acknowledged',
  'expired',
]);

export const detectorTypeSchema = z.enum([
  'weapon',
  'fire',
  'crowd',
  'ppe_violation',
  'smoke',
  'chemical_spill_visual',
]);

export const deliveryChannelSchema = z.enum([
  'push',
  'sms',
  'email',
  'in_app',
  'voice',
]);

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** Accepts a Date or a Firestore Timestamp-like `{seconds, nanoseconds}`. */
export const timestampSchema = z.union([
  z.date(),
  z.object({
    seconds: z.number().int(),
    nanoseconds: z.number().int(),
  }),
]);

// ---------------------------------------------------------------------------
// Embedded value objects
// ---------------------------------------------------------------------------

export const floorPlanSchema = z.object({
  floorId: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.string().url().optional(),
  zones: z.array(z.string().min(1)),
});

export const designationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  role: userRoleSchema,
});

export const meshCapabilitiesSchema = z.object({
  canPublish: z.array(z.string()),
  canReceive: z.array(z.string()),
});

export const incidentLocationSchema = z.object({
  zone: z.string().min(1),
  floor: z.string().min(1),
  coordinates: geoPointSchema.optional(),
});

export const messageTranslationsSchema = z.object({
  en: z.string(),
  hi: z.string(),
  ta: z.string(),
  te: z.string(),
  mr: z.string(),
  bn: z.string(),
});

// ---------------------------------------------------------------------------
// 1. facilities
// ---------------------------------------------------------------------------
export const facilitySchema = z.object({
  name: z.string().min(1),
  type: facilityTypeSchema,
  tier: z.string().min(1),
  address: z.string().min(1),
  location: geoPointSchema,
  floorPlans: z.array(floorPlanSchema),
  designations: z.array(designationSchema),
  subscribedMeshRadiusKm: z.number().nonnegative(),
  meshCapabilities: meshCapabilitiesSchema,
  createdAt: timestampSchema,
});

// ---------------------------------------------------------------------------
// 2. users
// ---------------------------------------------------------------------------
export const userSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  phoneNumber: z.string().min(1),
  role: userRoleSchema,
  designation: z.string().min(1),
  facilityIds: z.array(z.string().min(1)),
  zones: z.array(z.string()),
  language: languageSchema,
  createdAt: timestampSchema,
});

// ---------------------------------------------------------------------------
// 3. incidents
// ---------------------------------------------------------------------------
export const incidentSchema = z.object({
  facilityId: z.string().min(1),
  facilityType: facilityTypeSchema,
  type: z.string().min(1),
  severity: incidentSeveritySchema,
  status: incidentStatusSchema,
  reporterId: z.string().min(1),
  reporterRole: userRoleSchema,
  location: incidentLocationSchema,
  description: z.string(),
  aiSummary: z.string().optional(),
  playbookId: z.string().optional(),
  assignedStaff: z.array(z.string()),
  meshEventsFired: z.array(z.string()),
  createdAt: timestampSchema,
  acknowledgedAt: timestampSchema.optional(),
  resolvedAt: timestampSchema.optional(),
});

// ---------------------------------------------------------------------------
// 4. alerts
// ---------------------------------------------------------------------------
export const alertSchema = z.object({
  incidentId: z.string().min(1),
  facilityId: z.string().min(1),
  recipientRole: userRoleSchema,
  recipientDesignation: z.string().optional(),
  recipientZone: z.string().optional(),
  message: z.string(),
  messageTranslations: messageTranslationsSchema,
  acknowledged: z.boolean(),
  deliveredVia: z.array(deliveryChannelSchema),
  createdAt: timestampSchema,
});

// ---------------------------------------------------------------------------
// 5. evacuationRoutes
// ---------------------------------------------------------------------------
export const evacuationWaypointSchema = z.object({
  zone: z.string().min(1),
  floor: z.string().min(1),
  coordinates: geoPointSchema.optional(),
  instruction: z.string().optional(),
});

export const evacuationRouteSchema = z.object({
  incidentId: z.string().min(1),
  facilityId: z.string().min(1),
  fromZone: z.string().min(1),
  toExit: z.string().min(1),
  waypoints: z.array(evacuationWaypointSchema),
  transportOptions: z.array(z.string()),
  generatedAt: timestampSchema,
});

// ---------------------------------------------------------------------------
// 6. meshEvents — FLAGSHIP
// ---------------------------------------------------------------------------
export const meshEventSchema = z.object({
  sourceFacilityId: z.string().min(1),
  sourceFacilityType: facilityTypeSchema,
  sourceIncidentId: z.string().min(1),
  eventType: z.string().min(1),
  payload: z.record(z.unknown()),
  targetFacilityTypes: z.array(facilityTypeSchema),
  radiusKm: z.number().nonnegative(),
  affectedFacilityIds: z.array(z.string()),
  status: meshEventStatusSchema,
  publishedAt: timestampSchema,
  expiresAt: timestampSchema,
});

// ---------------------------------------------------------------------------
// 7. meshSubscriptions
// ---------------------------------------------------------------------------
export const meshSubscriptionSchema = z.object({
  facilityId: z.string().min(1),
  eventTypes: z.array(z.string()),
  radiusKm: z.number().nonnegative(),
  active: z.boolean(),
});

// ---------------------------------------------------------------------------
// 8. cameras
// ---------------------------------------------------------------------------
export const cameraSchema = z.object({
  facilityId: z.string().min(1),
  zone: z.string().min(1),
  floor: z.string().min(1),
  streamUrl: z.string().url(),
  enabledDetectors: z.array(detectorTypeSchema),
  active: z.boolean(),
});

// ---------------------------------------------------------------------------
// 9. zoneCheckIns
// ---------------------------------------------------------------------------
export const zoneCheckInSchema = z.object({
  userId: z.string().min(1),
  facilityId: z.string().min(1),
  zone: z.string().min(1),
  checkedInAt: timestampSchema,
  checkedOutAt: timestampSchema.optional(),
});
