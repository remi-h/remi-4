import type { ContentfulLog, ContentfulProject } from './contentful';

// Deterministic content for e2e tests and local work without Contentful
// credentials. Enabled with CONTENTFUL_FIXTURES=1. Newest first, like the API.
// The rich-text renderer needs `data` on every node and `marks` on text nodes.
const node = (nodeType: string, content: object[]) => ({ nodeType, data: {}, content });
const leaf = (value: string) => ({ nodeType: 'text', value, marks: [], data: {} });
const text = (heading: string, body: string) => ({
  ...node('document', [node('heading-2', [leaf(heading)]), node('paragraph', [leaf(body)])]),
});

export const fixtureProjects: ContentfulProject[] = [
  {
    sys: { id: 'p1' },
    fields: {
      title: 'Fixture Alpha',
      slug: 'fixture-alpha',
      summary: 'A featured fixture project.',
      date: '2026-03-01',
      duration: '3 months',
      featured: true,
      text: text('Overview', 'Alpha body text.'),
    },
  },
  {
    sys: { id: 'p2' },
    fields: {
      title: 'Fixture Beta',
      slug: 'fixture-beta',
      summary: 'A project that is not featured.',
      date: '2025-09-01',
      featured: false,
      text: text('Overview', 'Beta body text.'),
    },
  },
  {
    sys: { id: 'p3' },
    fields: {
      title: 'Fixture Gamma',
      summary: 'A locked project without a page.',
      date: '2025-01-01',
      featured: true,
      lock: true,
    },
  },
];

export const fixtureLogs: ContentfulLog[] = [
  {
    sys: { id: 'l1' },
    fields: {
      date: '2026-02-10',
      title: 'Fixture talk',
      org: 'Fixture Conf',
      link: 'https://example.com/talk',
    },
  },
  {
    sys: { id: 'l2' },
    fields: { date: '2025-06-05', title: 'Fixture article', org: 'Fixture Weekly' },
  },
];
