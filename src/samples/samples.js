/**
 * Built-in XML Samples for testing, demonstration, and quick-loading
 */

export const XML_SAMPLES = {
  catalog: {
    name: 'Book Catalog',
    description: 'Hierarchical catalog with attributes, prices, and dates',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<catalog xmlns:dc="http://purl.org/dc/elements/1.1/">
  <category name="Computer Science">
    <book id="bk101" in-stock="true">
      <author>Gambardella, Matthew</author>
      <title>XML Developer's Guide</title>
      <genre>Computer</genre>
      <price currency="USD">44.95</price>
      <publish_date>2024-10-01</publish_date>
      <description>An in-depth look at creating applications with XML, XPath, and XSLT.</description>
    </book>
    <book id="bk102" in-stock="false">
      <author>Ralls, Kim</author>
      <title>Midnight Rain</title>
      <genre>Fantasy</genre>
      <price currency="USD">15.95</price>
      <publish_date>2025-01-15</publish_date>
      <description>A fantasy tale set in the rainy forests of the Pacific Northwest.</description>
    </book>
  </category>
  <category name="Science & Nature">
    <book id="bk103" in-stock="true">
      <author>Corets, Eva</author>
      <title>Maeve Ascendant</title>
      <genre>Fantasy</genre>
      <price currency="USD">12.50</price>
      <publish_date>2025-03-20</publish_date>
      <description>After the collapse of a futuristic world, survivor Maeve discovers hidden truths.</description>
    </book>
  </category>
</catalog>`
  },

  sitemap: {
    name: 'Google XML Sitemap',
    description: 'Standard sitemaps.org format with priority and change frequencies',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-11-08</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2026-11-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/products</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>https://example.com/images/hero.jpg</image:loc>
      <image:title>Product Showcase</image:title>
    </image:image>
  </url>
  <url>
    <loc>https://example.com/contact</loc>
    <lastmod>2026-10-15</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`
  },

  rss: {
    name: 'RSS 2.0 Feed',
    description: 'News feed with channel metadata and item entries',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tech Insights Feed</title>
    <link>https://example.com/news</link>
    <description>Daily curated technology insights and engineering updates</description>
    <language>en-us</language>
    <lastBuildDate>Sun, 08 Nov 2026 12:00:00 GMT</lastBuildDate>
    <atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title>Antigravity 2.0 Architecture Explained</title>
      <link>https://example.com/news/antigravity-2</link>
      <guid isPermaLink="true">https://example.com/news/antigravity-2</guid>
      <pubDate>Sat, 07 Nov 2026 09:30:00 GMT</pubDate>
      <description><![CDATA[Exploring the newest advancements in agentic pair programming and web tools.]]></description>
    </item>
    <item>
      <title>Modern XML Tooling in the Browser</title>
      <link>https://example.com/news/xml-browser-tooling</link>
      <guid isPermaLink="true">https://example.com/news/xml-browser-tooling</guid>
      <pubDate>Fri, 06 Nov 2026 14:15:00 GMT</pubDate>
      <description><![CDATA[How client-side AST parsers enable instant linting, tree visualization, and conversions.]]></description>
    </item>
  </channel>
</rss>`
  },

  svg: {
    name: 'SVG Graphic',
    description: 'Scalable Vector Graphic with geometric elements and styles',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%">
  <defs>
    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="1"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="12" fill="#0f172a"/>
  <circle cx="200" cy="110" r="60" fill="url(#gradient1)"/>
  <text x="200" y="200" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#f8fafc" text-anchor="middle">
    XML Pro Studio
  </text>
  <text x="200" y="225" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">
    Editor | Linter | Tree | Converter
  </text>
</svg>`
  },

  pom: {
    name: 'Maven POM Configuration',
    description: 'Java Maven Project Object Model with dependencies and build plugins',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example.xml</groupId>
  <artifactId>xml-toolkit</artifactId>
  <version>1.0.0-SNAPSHOT</version>
  <packaging>jar</packaging>
  <name>XML Pro Toolkit</name>
  <properties>
    <maven.compiler.source>21</maven.compiler.source>
    <maven.compiler.target>21</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter-api</artifactId>
      <version>5.10.0</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`
  },

  soap: {
    name: 'SOAP Web Service Request',
    description: 'SOAP 1.2 Envelope with header and body payload',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <auth:Token xmlns:auth="http://example.com/auth">token_xyz987654</auth:Token>
  </soap:Header>
  <soap:Body xmlns:ns="http://example.com/orders">
    <ns:GetOrderRequest id="ord-84920">
      <orderId>84920</orderId>
      <includeDetails>true</includeDetails>
    </ns:GetOrderRequest>
  </soap:Body>
</soap:Envelope>`
  }
};

