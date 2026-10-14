/** @jest-environment node */
import {
  fetchLogs,
  fetchProjectBySlug,
  fetchProjectSlugs,
  fetchProjects,
  getAssetMap,
  resolveAssetImage,
  richTextToPlainText,
} from './contentful';

const saved = { ...process.env };
const originalFetch = global.fetch;

beforeEach(() => {
  delete process.env.CONTENTFUL_SPACE_ID;
  delete process.env.CONTENTFUL_DELIVERY_TOKEN;
  delete process.env.CONTENTFUL_FIXTURES;
});

afterEach(() => {
  process.env = { ...saved };
  global.fetch = originalFetch;
});

describe('without credentials', () => {
  it('returns empty content', async () => {
    expect((await fetchProjects()).items).toEqual([]);
    expect((await fetchLogs()).items).toEqual([]);
    expect(await fetchProjectSlugs()).toEqual([]);
    expect(await fetchProjectBySlug('x')).toBeNull();
  });
});

describe('fixture mode', () => {
  beforeEach(() => {
    process.env.CONTENTFUL_FIXTURES = '1';
  });

  it('filters featured projects', async () => {
    const { items } = await fetchProjects({ featuredOnly: true });
    expect(items.every((p) => p.fields.featured)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it('keeps projects newest first, featured or not', async () => {
    const dates = (await fetchProjects()).items.map((p) => p.fields.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('finds a project by slug and misses unknown slugs', async () => {
    expect((await fetchProjectBySlug('fixture-alpha'))?.project.fields.title).toBe('Fixture Alpha');
    expect(await fetchProjectBySlug('nope')).toBeNull();
  });

  it('lists only slugs that exist', async () => {
    expect(await fetchProjectSlugs()).toEqual(['fixture-alpha', 'fixture-beta']);
  });

  it('returns log entries', async () => {
    expect((await fetchLogs()).items).toHaveLength(2);
  });
});

describe('with credentials', () => {
  beforeEach(() => {
    process.env.CONTENTFUL_SPACE_ID = 'space';
    process.env.CONTENTFUL_DELIVERY_TOKEN = 'token';
  });

  it('queries the delivery API for featured projects, newest first', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { sys: { id: 'a' }, fields: { featured: true } },
          { sys: { id: 'b' }, fields: { featured: true } },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { items } = await fetchProjects({ featuredOnly: true });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/spaces/space/environments/master/entries');
    expect(url.searchParams.get('fields.featured')).toBe('true');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token');
    expect(url.searchParams.get('order')).toBe('-fields.date');
    expect(items.map((p) => p.sys.id)).toEqual(['a', 'b']);
  });

  it('falls back to empty content when the API errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    expect((await fetchProjects()).items).toEqual([]);
    expect(await fetchProjectBySlug('x')).toBeNull();
  });
});

describe('helpers', () => {
  it('maps assets by id', () => {
    const asset = { sys: { id: 'a1' }, fields: {} };
    expect(getAssetMap([asset]).get('a1')).toBe(asset);
    expect(getAssetMap(undefined).size).toBe(0);
  });

  it('resolves protocol-relative image urls with default size', () => {
    const image = resolveAssetImage({ sys: { id: 'a' }, fields: { file: { url: '//img.test/a.png' } } });
    expect(image).toMatchObject({ url: 'https://img.test/a.png', width: 1200, height: 800, title: 'Project cover' });
  });

  it('resolves no image for a missing asset or file', () => {
    expect(resolveAssetImage(undefined)).toBeNull();
    expect(resolveAssetImage({ sys: { id: 'a' }, fields: {} })).toBeNull();
  });

  it('flattens rich text', () => {
    expect(
      richTextToPlainText({
        content: [{ value: 'Hello' }, { content: [{ value: 'big' }, { value: 'world' }] }],
      }),
    ).toBe('Hello big world');
    expect(richTextToPlainText(undefined)).toBe('');
  });
});
