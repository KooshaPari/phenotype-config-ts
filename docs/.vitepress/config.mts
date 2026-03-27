import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid({
  title: 'phenotype-config-ts',
  description: 'TypeScript configuration management with Zod validation and hexagonal ports/adapters',
  appearance: 'dark',
  lastUpdated: true,
  themeConfig: {
    nav: [{ text: 'Home', link: '/' }],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
        ],
      },
    ],
    search: { provider: 'local' },
  },
  mermaid: { theme: 'dark' },
})
