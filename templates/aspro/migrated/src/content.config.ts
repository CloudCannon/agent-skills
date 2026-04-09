import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const actionSchema = z.object({
  text: z.string().nullish(),
  href: z.string().nullish(),
  variant: z.string().nullish(),
  icon: z.string().nullish(),
  ariaLabel: z.string().nullish(),
});

const itemSchema = z.object({
  title: z.string().nullish(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  iconClass: z.string().nullish(),
});

const serviceSchema = z.object({
  title: z.string().nullish(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
});

const contentBlock = z.discriminatedUnion("_type", [
  z.object({
    _type: z.literal("hero"),
    title: z.string().nullish(),
    tagline: z.string().nullish(),
    description: z.string().nullish(),
    actions: z.array(actionSchema).default([]),
  }),
  z.object({
    _type: z.literal("features"),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    features: z.array(itemSchema).default([]),
  }),
  z.object({
    _type: z.literal("content"),
    title: z.string().nullish(),
    tagline: z.string().nullish(),
    description: z.string().nullish(),
    image: z.string().nullish(),
    imageAlt: z.string().nullish(),
  }),
  z.object({
    _type: z.literal("content2"),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    content: z.string().nullish(),
    items: z.array(itemSchema).default([]),
    image: z.string().nullish(),
    imageAlt: z.string().nullish(),
    actions: z.array(actionSchema).default([]),
    isReversed: z.boolean().default(false),
    isAfterContent: z.boolean().default(false),
  }),
  z.object({
    _type: z.literal("values"),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    items: z.array(itemSchema).default([]),
    columns: z.number().default(2),
  }),
  z.object({
    _type: z.literal("service_list"),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    services: z.array(serviceSchema).default([]),
  }),
  z.object({
    _type: z.literal("form"),
    title: z.string().nullish(),
    tagline: z.string().nullish(),
  }),
]);

const pageBuilderSchema = z.object({
  title: z.string(),
  description: z.string().nullish(),
  _schema: z.literal("page_builder"),
  content_blocks: z.array(contentBlock).default([]),
});

const pageSchema = z.object({
  title: z.string(),
  description: z.string().nullish(),
  _schema: z.literal("page"),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.discriminatedUnion("_schema", [pageBuilderSchema, pageSchema]),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    author: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
  }),
});

export const collections = { pages, blog };
