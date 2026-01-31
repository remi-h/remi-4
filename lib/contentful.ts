type ContentfulSys = {
  id: string;
};

export type ContentfulAsset = {
  sys: ContentfulSys;
  fields: {
    title?: string;
    description?: string;
    file?: {
      url?: string;
      details?: { image?: { width?: number; height?: number } };
    };
  };
};

export type ContentfulProject = {
  sys: ContentfulSys;
  fields: {
    title?: string;
    slug?: string;
    summary?: string;
    duration?: string;
    cover?: { sys: ContentfulSys };
    text?: ContentfulRichText;
  };
};

type ContentfulResponse = {
  items: ContentfulProject[];
  includes?: { Asset?: ContentfulAsset[] };
};

type ContentfulRichText = {
  nodeType?: string;
  value?: string;
  content?: ContentfulRichText[];
};

const getEnv = () => {
  const spaceId = process.env.CONTENTFUL_SPACE_ID;
  const environment = process.env.CONTENTFUL_ENVIRONMENT ?? "master";
  const token = process.env.CONTENTFUL_DELIVERY_TOKEN;
  const contentType =
    process.env.CONTENTFUL_PROJECT_CONTENT_TYPE ?? "project";

  return { spaceId, environment, token, contentType };
};

const buildBaseUrl = () => {
  const { spaceId, environment } = getEnv();
  if (!spaceId) return null;
  return `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}/entries`;
};

const fetchContentful = async (url: URL) => {
  const { token } = getEnv();
  if (!token) return null;

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ContentfulResponse;
};

export const fetchProjects = async () => {
  const { contentType, spaceId } = getEnv();
  const baseUrl = buildBaseUrl();

  if (!spaceId || !baseUrl) {
    return { items: [], includes: { Asset: [] } } as ContentfulResponse;
  }

  const url = new URL(baseUrl);
  url.searchParams.set("content_type", contentType);
  url.searchParams.set("include", "1");
  url.searchParams.set("order", "-sys.createdAt");

  return (
    (await fetchContentful(url)) ??
    ({ items: [], includes: { Asset: [] } } as ContentfulResponse)
  );
};

export const fetchProjectBySlug = async (slug: string) => {
  const { contentType, spaceId } = getEnv();
  const baseUrl = buildBaseUrl();

  if (!spaceId || !baseUrl) {
    return null;
  }

  const url = new URL(baseUrl);
  url.searchParams.set("content_type", contentType);
  url.searchParams.set("include", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("fields.slug", slug);

  const response = await fetchContentful(url);
  const project = response?.items?.[0] ?? null;
  const assets = response?.includes?.Asset ?? [];

  return project ? { project, assets } : null;
};

export const fetchProjectSlugs = async () => {
  const { contentType, spaceId } = getEnv();
  const baseUrl = buildBaseUrl();

  if (!spaceId || !baseUrl) {
    return [] as string[];
  }

  const url = new URL(baseUrl);
  url.searchParams.set("content_type", contentType);
  url.searchParams.set("select", "fields.slug");
  url.searchParams.set("limit", "200");

  const response = await fetchContentful(url);
  return (
    response?.items
      ?.map((item) => item.fields.slug)
      .filter((slug): slug is string => Boolean(slug)) ?? []
  );
};

export const getAssetMap = (assets?: ContentfulAsset[]) =>
  new Map((assets ?? []).map((asset) => [asset.sys.id, asset]));

export const resolveAssetImage = (asset?: ContentfulAsset) => {
  const url = asset?.fields?.file?.url;
  if (!url) {
    return null;
  }

  const width = asset.fields.file?.details?.image?.width ?? 1200;
  const height = asset.fields.file?.details?.image?.height ?? 800;

  return {
    url: url.startsWith("//") ? `https:${url}` : url,
    width,
    height,
    title: asset.fields.title ?? "Project cover",
  };
};

export const richTextToPlainText = (node?: ContentfulRichText): string => {
  if (!node) return "";
  if (node.value) return node.value;
  if (!node.content) return "";
  return node.content.map(richTextToPlainText).join(" ").replace(/\s+/g, " ").trim();
};
