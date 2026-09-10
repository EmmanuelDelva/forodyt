import {z} from 'zod';

export const venueSchema = z.object({
  id:z.string(), shortName:z.string(), name:z.string(), city:z.string(), room:z.string().optional(),
  date:z.string(), operationStart:z.string(), operationEnd:z.string(), capacity:z.number().optional(),
  productionStatus:z.enum(['PRE-FINAL','FINAL']),
  blockers:z.array(z.string()).default([]),
});
export type Venue = z.infer<typeof venueSchema>;
