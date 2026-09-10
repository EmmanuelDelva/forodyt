import {z} from 'zod';

export const speakerSchema = z.object({
  id: z.string().optional(), name: z.string().min(1), role: z.string().optional(),
  institution: z.string().optional(), country: z.string().optional(), avatar: z.string().optional(), topic: z.string().optional(),
});
export const sessionSchema = z.object({
  id:z.string().min(1), edition:z.literal('IV'), venue:z.string().min(1), room:z.string().optional(),
  date:z.string().min(1), startTime:z.string().min(1), endTime:z.string().min(1),
  sessionType:z.enum(['conference','panel','roundtable','opening','closing','special','break']),
  sessionLabel:z.string().min(1), axis:z.string().optional(), title:z.string().min(1), subtitle:z.string().optional(),
  speakers:z.array(speakerSchema), nextSession:z.object({startTime:z.string(),sessionLabel:z.string(),title:z.string()}).optional(),
  resumeTime:z.string().optional(), state:z.enum(['holding','starting-soon','current','next','break','live','technical-pause','closing']),
});
export type Session = z.infer<typeof sessionSchema>;
export type Speaker = z.infer<typeof speakerSchema>;
