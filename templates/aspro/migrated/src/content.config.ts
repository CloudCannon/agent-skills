import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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

const actionSchema = z.object({
  text: z.string().nullish(),
  href: z.string().nullish(),
  variant: z.string().nullish(),
  icon: z.string().nullish(),
  ariaLabel: z.string().nullish(),
});

const featureItemSchema = z.object({
  title: z.string().nullish(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  iconClass: z.string().nullish(),
});

const serviceItemSchema = z.object({
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
    features: z.array(featureItemSchema).default([]),
  }),
  z.object({
    _type: z.literal("content"),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    image: z.string().nullish(),
    imageAlt: z.string().nullish(),
  }),
  z.object({
    _type: z.literal("content2"),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    content: z.string().nullish(),
    image: z.string().nullish(),
    imageAlt: z.string().nullish(),
    items: z.array(featureItemSchema).default([]),
    actions: z.array(actionSchema).default([]),
    isReversed: z.boolean().default(false),
    isAfterContent: z.boolean().default(false),
  }),
  z.object({
    _type: z.literal("service_list"),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    services: z.array(serviceItemSchema).default([]),
  }),
  z.object({
    _type: z.literal("values"),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    items: z.array(featureItemSchema).default([]),
    columns: z.number().default(2),
  }),
  z.object({
    _type: z.literal("rich_text"),
    title: z.string().nullish(),
    content: z.string().nullish(),
  }),
]);

const commonPageFields = {
  title: z.string(),
  description: z.string().nullish(),
  meta_title: z.string().nullish(),
  image: z.string().nullish(),
};

const homepageSchema = z.object({
  ...commonPageFields,
  _schema: z.literal("homepage"),
  content_blocks: z.array(contentBlock).default([]),
});

const pageBuilderSchema = z.object({
  ...commonPageFields,
  _schema: z.literal("page_builder"),
  content_blocks: z.array(contentBlock).default([]),
});

const contactSchema = z.object({
  ...commonPageFields,
  _schema: z.literal("contact"),
  show_form: z.boolean().default(true),
  content_blocks: z.array(contentBlock).default([]),
});

const pageSchema = z.object({
  ...commonPageFields,
  _schema: z.literal("page"),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.discriminatedUnion("_schema", [
    homepageSchema,
    contactSchema,
    pageBuilderSchema,
    pageSchema,
  ]),
});

export const collections = { blog, pages };
