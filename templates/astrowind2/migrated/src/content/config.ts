import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const metadataDefinition = () =>
  z
    .object({
      title: z.string().optional(),
      ignoreTitleTemplate: z.boolean().optional(),
      canonical: z.string().url().optional(),
      robots: z
        .object({
          index: z.boolean().optional(),
          follow: z.boolean().optional(),
        })
        .optional(),
      description: z.string().optional(),
      openGraph: z
        .object({
          url: z.string().optional(),
          siteName: z.string().optional(),
          images: z
            .array(
              z.object({
                url: z.string(),
                width: z.number().optional(),
                height: z.number().optional(),
              })
            )
            .optional(),
          locale: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),
      twitter: z
        .object({
          handle: z.string().optional(),
          site: z.string().optional(),
          cardType: z.string().optional(),
        })
        .optional(),
    })
    .optional();

const imageSchema = z
  .object({
    src: z.string().nullish(),
    alt: z.string().nullish(),
  })
  .nullish();

const callToActionSchema = z
  .object({
    text: z.string().nullish(),
    href: z.string().nullish(),
    variant: z.string().nullish(),
    icon: z.string().nullish(),
    target: z.string().nullish(),
  })
  .nullish();

const itemSchema = z.object({
  title: z.string().nullish(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  job_title: z.string().nullish(),
  company: z.string().nullish(),
  date_range: z.string().nullish(),
  callToAction: callToActionSchema,
  image: imageSchema,
});

const statSchema = z.object({
  title: z.string().nullish(),
  amount: z.union([z.string(), z.number()]).nullish(),
  icon: z.string().nullish(),
});

const testimonialSchema = z.object({
  title: z.string().nullish(),
  testimonial: z.string().nullish(),
  name: z.string().nullish(),
  job: z.string().nullish(),
  image: imageSchema,
});

const priceItemSchema = z.object({
  description: z.string().nullish(),
});

const priceSchema = z.object({
  title: z.string().nullish(),
  subtitle: z.string().nullish(),
  price: z.union([z.string(), z.number()]).nullish(),
  period: z.string().nullish(),
  items: z.array(priceItemSchema).nullish(),
  callToAction: callToActionSchema,
  hasRibbon: z.boolean().nullish(),
  ribbonTitle: z.string().nullish(),
});

const inputSchema = z.object({
  type: z.string().nullish(),
  name: z.string().nullish(),
  label: z.string().nullish(),
  autocomplete: z.string().nullish(),
  placeholder: z.string().nullish(),
});

const textareaSchema = z.object({
  label: z.string().nullish(),
  name: z.string().nullish(),
  placeholder: z.string().nullish(),
  rows: z.number().nullish(),
});

const disclaimerSchema = z.object({
  label: z.string().nullish(),
});

const contentBlockSchema = z.discriminatedUnion('_type', [
  z.object({
    _type: z.literal('hero'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    content: z.string().nullish(),
    actions: z.array(callToActionSchema.unwrap()).nullish(),
    image: imageSchema,
  }),
  z.object({
    _type: z.literal('hero2'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    content: z.string().nullish(),
    actions: z.array(callToActionSchema.unwrap()).nullish(),
    image: imageSchema,
  }),
  z.object({
    _type: z.literal('hero_text'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    content: z.string().nullish(),
    callToAction: callToActionSchema,
    callToAction2: callToActionSchema,
  }),
  z.object({
    _type: z.literal('note'),
    icon: z.string().nullish(),
    title: z.string().nullish(),
    description: z.string().nullish(),
  }),
  z.object({
    _type: z.literal('features'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    items: z.array(itemSchema).nullish(),
    columns: z.number().nullish(),
    defaultIcon: z.string().nullish(),
  }),
  z.object({
    _type: z.literal('features2'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    items: z.array(itemSchema).nullish(),
    columns: z.number().nullish(),
  }),
  z.object({
    _type: z.literal('features3'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    items: z.array(itemSchema).nullish(),
    columns: z.number().nullish(),
    image: imageSchema,
    isBeforeContent: z.boolean().nullish(),
    isAfterContent: z.boolean().nullish(),
    defaultIcon: z.string().nullish(),
  }),
  z.object({
    _type: z.literal('content'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    content: z.string().nullish(),
    callToAction: callToActionSchema,
    items: z.array(itemSchema).nullish(),
    columns: z.number().nullish(),
    image: imageSchema,
    isReversed: z.boolean().nullish(),
    isAfterContent: z.boolean().nullish(),
  }),
  z.object({
    _type: z.literal('steps'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    items: z.array(itemSchema).nullish(),
    image: imageSchema,
    isReversed: z.boolean().nullish(),
  }),
  z.object({
    _type: z.literal('steps2'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    callToAction: callToActionSchema,
    items: z.array(itemSchema).nullish(),
    isReversed: z.boolean().nullish(),
  }),
  z.object({
    _type: z.literal('faqs'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    items: z.array(itemSchema).nullish(),
    columns: z.number().nullish(),
  }),
  z.object({
    _type: z.literal('stats'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    stats: z.array(statSchema).nullish(),
  }),
  z.object({
    _type: z.literal('call_to_action'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    actions: z.array(callToActionSchema.unwrap()).nullish(),
  }),
  z.object({
    _type: z.literal('testimonials'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    testimonials: z.array(testimonialSchema).nullish(),
    callToAction: callToActionSchema,
  }),
  z.object({
    _type: z.literal('pricing'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    prices: z.array(priceSchema).nullish(),
  }),
  z.object({
    _type: z.literal('blog_latest_posts'),
    title: z.string().nullish(),
    linkText: z.string().nullish(),
    linkUrl: z.string().nullish(),
    information: z.string().nullish(),
    count: z.number().nullish(),
  }),
  z.object({
    _type: z.literal('blog_highlighted_posts'),
    title: z.string().nullish(),
    linkText: z.string().nullish(),
    linkUrl: z.string().nullish(),
    information: z.string().nullish(),
    postIds: z.array(z.string()).nullish(),
  }),
  z.object({
    _type: z.literal('brands'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    icons: z.array(z.string()).nullish(),
    images: z.array(imageSchema.unwrap()).nullish(),
  }),
  z.object({
    _type: z.literal('contact'),
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    tagline: z.string().nullish(),
    inputs: z.array(inputSchema).nullish(),
    textarea: textareaSchema.nullish(),
    disclaimer: disclaimerSchema.nullish(),
    button: z.string().nullish(),
    description: z.string().nullish(),
  }),
]);

const pageBuilderSchema = z.object({
  _schema: z.literal('page_builder'),
  title: z.string().nullish(),
  description: z.string().nullish(),
  image: z.string().nullish(),
  layout: z.string().nullish(),
  draft: z.boolean().nullish(),
  metadata: metadataDefinition(),
  content_blocks: z.array(contentBlockSchema).default([]),
});

const markdownPageSchema = z.object({
  _schema: z.literal('markdown_page'),
  title: z.string(),
  layout: z.string().nullish(),
  draft: z.boolean().nullish(),
  metadata: metadataDefinition(),
});

const pagesCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: 'src/content/pages' }),
  schema: z.discriminatedUnion('_schema', [pageBuilderSchema, markdownPageSchema]),
});

const postCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/post' }),
  schema: z.object({
    publishDate: z.date().optional(),
    updateDate: z.date().optional(),
    draft: z.boolean().optional(),
    title: z.string(),
    excerpt: z.string().optional(),
    image: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    metadata: metadataDefinition(),
  }),
});

export const collections = {
  post: postCollection,
  pages: pagesCollection,
};
