import { z } from 'zod';

const ConnectionSchema = z
  .object({
    type: z.string().min(1, 'Connection type is required'),
    to: z.string().min(1, 'Connection target is required'),
  })
  .passthrough();

const ContentSchema = z
  .object({
    definition: z.string().optional(),
    atAGlance: z.string().optional(),
    takeAway: z.string().optional(),
  })
  .catchall(z.unknown());

export const TopicSchema = z
  .object({
    id: z.string().min(1, 'Topic id is required'),
    title: z.string().min(1, 'Topic title is required'),
    primaryType: z.enum([
      'disease', 
      'drug', 
      'anatomy', 
      'microbe', 
      'molecule', 
      'physiology', 
      'finding', 
      'concept'
    ]),
    classificationPath: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1)).optional(),
    content: ContentSchema,
    connections: z.array(ConnectionSchema).optional(),
  })
  .passthrough();

export type TopicFromSchema = z.infer<typeof TopicSchema>;

export const KnowledgeBaseSchema = z.record(z.string(), TopicSchema);
