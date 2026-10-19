import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// site/ is the Astro public site with its own lint; design-system/ is the
// published brand book's preview bundle; content/ is data. None is hub code.
const eslintConfig = [{ ignores: ["site/**", "design-system/**", "content/**"] }, ...nextCoreWebVitals];

export default eslintConfig;
