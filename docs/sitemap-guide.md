# XML Sitemap Generator Guide

XML Pro Toolkit includes a built-in generator for search engine compliant sitemaps conforming to the `sitemaps.org` protocol.

---

## Generating from URL(s)

You can generate a complete sitemap from a single domain or a list of URLs:
1. Click **Sitemap Generator** in the main toolbar.
2. Under the **From URL(s)** tab, enter your root website address (e.g. `https://example.com`) or paste a multi-line list of specific page URLs.
3. Check **Auto-generate standard routes** to automatically include common routes (`/about`, `/products`, `/services`, `/contact`, `/blog`, `/pricing`).
4. Select your desired **Change Frequency** (`daily`, `weekly`, `monthly`, etc.).
5. Choose the **Default Priority** (`1.0` for home, `0.8` for standard pages, `0.5` for secondary pages).
6. Select the **Last Modified Date** (defaults to today in `YYYY-MM-DD` format).
7. Click **Generate Sitemap XML**.

---

## Generating from JSON

If you maintain your route metadata in JSON format or generate routes from a backend CMS, you can generate sitemaps directly from JSON.

### Sample Input Format: Array of URL Objects
```json
[
  {
    "loc": "https://example.com/",
    "priority": 1.0,
    "changefreq": "daily"
  },
  {
    "loc": "https://example.com/products",
    "priority": 0.9,
    "changefreq": "daily"
  },
  {
    "loc": "https://example.com/blog",
    "priority": 0.8,
    "changefreq": "weekly"
  }
]
```

### Sample Input Format: Sitemap Index Specification
```json
{
  "sitemaps": [
    { "loc": "https://example.com/sitemap-posts.xml", "lastmod": "2026-11-08" },
    { "loc": "https://example.com/sitemap-products.xml", "lastmod": "2026-11-08" }
  ]
}
```

---

## Loading into the Editor

Once generated, you can:
- **Load Into Editor**: Immediately replaces the active editor content with the sitemap for further editing or validation.
- **Copy XML**: Copies the generated XML directly to your system clipboard.
- **Download**: Saves `sitemap.xml` directly to your local downloads folder.
