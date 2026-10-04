/** @jest-environment node */
import { fetchLogs, fetchProjects, resolveAssetImage } from './contentful';

describe('contentful without credentials', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.CONTENTFUL_SPACE_ID;
    delete process.env.CONTENTFUL_DELIVERY_TOKEN;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('returns no projects', async () => {
    expect((await fetchProjects()).items).toEqual([]);
  });

  it('returns no logs', async () => {
    expect((await fetchLogs()).items).toEqual([]);
  });

  it('resolves no image for a missing asset', () => {
    expect(resolveAssetImage(undefined)).toBeFalsy();
  });
});
